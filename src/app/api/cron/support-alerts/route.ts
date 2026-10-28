import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runSupportAlerts } from "@/lib/support-alerts";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

function isAuthorized(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Même protection que /api/cron/check-status : Authorization: Bearer <CRON_SECRET>, fermé si le secret n'est pas configuré.
// À appeler régulièrement (toutes les heures suffit) ; elle est aussi lancée par check-status.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 503 });
  }
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runSupportAlerts();
  return NextResponse.json({ success: true, ...result });
}
