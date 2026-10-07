import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import mongoose from "mongoose";
import User from "@/models/User";
import { getTwitchStats } from "@/lib/twitch-user";

export const dynamic = "force-dynamic";

async function connect() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }
}

// GET : statistiques de la chaîne Twitch de l'utilisateur connecté
// (followers, live, dernières diffusions, clips populaires).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  await connect();
  const user = await User.findOne({ email: session.user.email }, "_id");
  if (!user) return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });

  try {
    const stats = await getTwitchStats(String(user._id));
    if (!stats) return NextResponse.json({ error: "Compte Twitch introuvable" }, { status: 404 });
    return NextResponse.json(stats);
  } catch (e) {
    console.error("Erreur statistiques Twitch:", e);
    return NextResponse.json({ error: "Twitch est momentanément indisponible" }, { status: 502 });
  }
}
