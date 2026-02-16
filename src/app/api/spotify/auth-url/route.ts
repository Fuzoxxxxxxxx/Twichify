import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import mongoose from "mongoose";
import User from "@/models/User";

export async function GET() {
  const session = await getServerSession();
  if (!session || !session.user?.email) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.DATABASE_URL!);

  const user = await User.findOne({ email: session.user.email });
  if (!user?.spotifyClientId) return NextResponse.json({ error: "Client ID manquant" }, { status: 400 });

  // On construit l'URL d'autorisation Spotify avec les identifiants de L'UTILISATEUR
  const scope = "user-read-currently-playing user-read-playback-state";
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/callback/spotify`;
  
  const spotifyUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${user.spotifyClientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return NextResponse.json({ url: spotifyUrl });
}