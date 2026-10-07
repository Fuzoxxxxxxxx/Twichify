import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import mongoose from "mongoose";
import User from "@/models/User";
import { getFollowersPage } from "@/lib/twitch-user";

export const dynamic = "force-dynamic";

async function connect() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }
}

// Les curseurs Twitch sont des chaînes base64 : on refuse tout le reste avant de les transmettre.
const CURSOR_RE = /^[A-Za-z0-9+/=_-]{1,1000}$/;

// GET : une page de la liste des followers de l'utilisateur connecté.
// Paramètres : `after` (curseur de la page précédente), `first` (taille de page, 1 à 100).
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const after = searchParams.get("after");
  if (after && !CURSOR_RE.test(after)) {
    return NextResponse.json({ error: "Curseur invalide" }, { status: 400 });
  }
  const first = Number(searchParams.get("first")) || 25;

  await connect();
  const user = await User.findOne({ email: session.user.email }, "_id");
  if (!user) return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });

  try {
    const page = await getFollowersPage(String(user._id), after, first);
    if (!page) return NextResponse.json({ error: "Compte Twitch introuvable" }, { status: 404 });
    return NextResponse.json(page);
  } catch (e) {
    console.error("Erreur liste followers Twitch:", e);
    return NextResponse.json({ error: "Twitch est momentanément indisponible" }, { status: 502 });
  }
}
