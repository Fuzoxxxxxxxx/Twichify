import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { getTeam } from "@/lib/twitch-community";

export const dynamic = "force-dynamic";

// GET : équipe de la chaîne (modérateurs et éditeurs) de l'utilisateur connecté.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const team = await getTeam(String(user._id));
    if (!team) return NextResponse.json({ error: "Compte Twitch introuvable" }, { status: 404 });
    return NextResponse.json(team);
  } catch (e) {
    console.error("Erreur équipe Twitch:", e);
    return NextResponse.json({ error: "Twitch est momentanément indisponible" }, { status: 502 });
  }
}
