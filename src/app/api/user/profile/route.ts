import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import mongoose from "mongoose";
import User from "@/models/User";

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

  return NextResponse.json({
    spotifyClientId: user.spotifyClientId,
    // On vérifie si un token existe pour dire au bouton "Tu es lié"
    hasSpotifyToken: !!user.spotifyRefreshToken, 
    widgetSettings: user.widgetSettings,
  });
}