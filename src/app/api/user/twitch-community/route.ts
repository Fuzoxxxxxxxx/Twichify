import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { getCommunity } from "@/lib/twitch-community";

export const dynamic = "force-dynamic";

// GET : communauté de la chaîne (abonnés, VIPs, top bits du mois) de l'utilisateur connecté.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const community = await getCommunity(String(user._id));
    if (!community) return NextResponse.json({ error: "Compte Twitch introuvable" }, { status: 404 });
    return NextResponse.json(community);
  } catch (e) {
    console.error("Erreur communauté Twitch:", e);
    return NextResponse.json({ error: "Twitch est momentanément indisponible" }, { status: 502 });
  }
}
