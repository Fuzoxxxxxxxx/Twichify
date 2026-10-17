import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import mongoose from "mongoose";
import User from "@/models/User";

export const dynamic = "force-dynamic";

/**
 * État d'installation pour l'assistant du dashboard : renvoie uniquement des booléens et des dates,
 * jamais d'identifiants Spotify. Route légère, interrogée toutes les quelques secondes tant que l'installation n'est pas terminée.
 *
 * `musicSeenAt` retombe sur la dernière lecture enregistrée (listeningStats.lastPollAt) pour les comptes déjà installés :
 * leur widget a forcément tourné avant l'ajout du suivi, ils ne doivent pas se retrouver à « terminer l'installation ».
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }

  const user = await User.findOne({ email: session.user.email });
  if (!user) return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });

  const musicSeenAt = user.widgetSeen?.musicAt || user.listeningStats?.lastPollAt || null;
  const chatSeenAt = user.widgetSeen?.chatAt || null;

  return NextResponse.json({
    spotifyCredentials: !!(user.spotifyClientId && user.spotifyClientSecret),
    spotifyConnected: !!user.spotifyRefreshToken,
    twitchLogin: user.name || null,
    musicSeenAt: musicSeenAt ? new Date(musicSeenAt).toISOString() : null,
    chatSeenAt: chatSeenAt ? new Date(chatSeenAt).toISOString() : null,
  });
}
