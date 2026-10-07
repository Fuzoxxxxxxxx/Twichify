import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSessionUser } from "@/lib/auth-helpers";
import { deleteChatStats, getChatStats, setChatStatsEnabled } from "@/lib/chat-stats";

export const dynamic = "force-dynamic";

// GET ?session=<id> : état de la collecte, liste des sessions, détail de la session choisie (la plus récente par défaut).
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const session = new URL(req.url).searchParams.get("session");
  if (session && !mongoose.isValidObjectId(session)) {
    return NextResponse.json({ error: "Session invalide" }, { status: 400 });
  }

  try {
    return NextResponse.json(await getChatStats(String(user._id), session));
  } catch (e) {
    console.error("Erreur lecture des statistiques de chat:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST { enabled: boolean } : active ou désactive la collecte. Désactiver n'efface pas l'historique.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // corps invalide : traité comme un paramètre manquant
  }
  if (typeof body?.enabled !== "boolean") return NextResponse.json({ error: "Paramètre invalide" }, { status: 400 });

  try {
    await setChatStatsEnabled(String(user._id), body.enabled);
    return NextResponse.json(await getChatStats(String(user._id)));
  } catch (e) {
    console.error("Erreur réglage des statistiques de chat:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE : supprime toutes les sessions enregistrées.
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const deleted = await deleteChatStats(String(user._id));
    return NextResponse.json({ ...(await getChatStats(String(user._id))), deleted });
  } catch (e) {
    console.error("Erreur suppression des statistiques de chat:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
