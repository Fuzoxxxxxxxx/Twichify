import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import mongoose from "mongoose";
import User from "@/models/User";
import TrackHistory from "@/models/TrackHistory";

// GET : Récupère les statistiques d'écoute de l'utilisateur connecté
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }

  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  const stats = user.listeningStats || {};

  return NextResponse.json({
    totalMsListened: stats.totalMsListened || 0,
    totalTracksPlayed: stats.totalTracksPlayed || 0,
    lastTrack: stats.lastTrack || null,
  });
}

// DELETE : Réinitialise les statistiques d'écoute
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }

  const updatedUser = await User.findOneAndUpdate(
    { email: session.user.email },
    {
      listeningStats: {
        totalMsListened: 0,
        totalTracksPlayed: 0,
        lastTrack: null,
        lastPollAt: null,
        lastTrackKey: null,
      },
    },
    { new: true }
  );

  if (!updatedUser) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  // Vide aussi l'historique détaillé : le bouton « Réinitialiser » doit tout effacer d'un coup.
  await TrackHistory.deleteMany({ user: updatedUser._id });

  return NextResponse.json({ success: true });
}
