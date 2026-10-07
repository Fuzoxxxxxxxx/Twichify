import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { listActiveSessions } from "@/lib/account-data";
import { getCurrentSessionToken } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

// GET : liste les sessions actives de l'utilisateur connecté
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const currentToken = await getCurrentSessionToken();
    const sessions = await listActiveSessions(user, currentToken);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Erreur liste des sessions:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
