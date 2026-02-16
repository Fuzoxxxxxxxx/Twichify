import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route"; // <--- IMPORT CRUCIAL
import mongoose from "mongoose";
import User from "@/models/User";

export async function GET() {
  // On passe authOptions pour que NextAuth sache comment lire la session en DB
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }

  const user = await User.findOne({ email: session.user.email });
  
  if (!user || !user.spotifyClientId) {
    return NextResponse.json({ error: "Client ID manquant" }, { status: 400 });
  }

  const scope = "user-read-currently-playing user-read-playback-state";
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/callback/spotify`;
  
  const spotifyUrl = `https://accounts.spotify.com/authorize?client_id=${user.spotifyClientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

  return NextResponse.json({ url: spotifyUrl });
}