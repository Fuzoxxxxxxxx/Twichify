import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runStatusChecks } from "@/lib/status-checker";

// Les checks durent au pire ~10 s (2 tentatives × 4 s + pause). Marge pour la base.
export const maxDuration = 30;
export const dynamic = "force-dynamic";

function isAuthorized(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  // Fail-closed : sans secret configuré, la route reste fermée.
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 503 });
  }
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runStatusChecks("cron");

    if (!result.ran) {
      // Un check récent existe déjà (sonde paresseuse) : rien à faire, ce n'est pas une erreur.
      return NextResponse.json({ success: true, skipped: true });
    }

    return NextResponse.json({
      success: true,
      timestamp: result.timestamp,
      results: result.results,
    });
  } catch (error) {
    console.error("[status] échec du cron :", error);
    return NextResponse.json({ success: false, error: "Check failed" }, { status: 500 });
  }
}
