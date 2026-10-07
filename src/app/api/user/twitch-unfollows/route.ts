import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { disableTracking, getUnfollowState, runScan } from "@/lib/twitch-unfollows";

export const dynamic = "force-dynamic";
// Une analyse lit jusqu'à 5 000 followers (50 appels Twitch successifs) : on laisse du temps à la fonction.
export const maxDuration = 60;

const NOT_FOUND = { error: "Compte Twitch introuvable" };
const UNAVAILABLE = { error: "Twitch est momentanément indisponible" };

// GET : état du suivi des départs (activé ?, dernière analyse, départs détectés).
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const state = await getUnfollowState(String(user._id));
    return state ? NextResponse.json(state) : NextResponse.json(NOT_FOUND, { status: 404 });
  } catch (e) {
    console.error("Erreur état du suivi des départs:", e);
    return NextResponse.json(UNAVAILABLE, { status: 502 });
  }
}

// POST { action: "enable" | "scan" } : active le suivi (1re analyse) ou lance une nouvelle analyse.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch (e) {
    // corps invalide : traité comme une action manquante
  }
  if (body?.action !== "enable" && body?.action !== "scan") {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  try {
    const state = await runScan(String(user._id), body.action);
    return state ? NextResponse.json(state) : NextResponse.json(NOT_FOUND, { status: 404 });
  } catch (e) {
    console.error("Erreur analyse des départs:", e);
    return NextResponse.json(UNAVAILABLE, { status: 502 });
  }
}

// DELETE : désactive le suivi et supprime l'instantané et l'historique des départs.
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const state = await disableTracking(String(user._id));
    return state ? NextResponse.json(state) : NextResponse.json(NOT_FOUND, { status: 404 });
  } catch (e) {
    console.error("Erreur désactivation du suivi des départs:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
