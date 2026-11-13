
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import mongoose from "mongoose";
import User from "@/models/User";
import { decrypt } from "@/lib/crypto";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const user = await User.findOne({
      email: session.user.email
    });

    if (!user || !user.spotifyClientId) {
      return NextResponse.json(
        { error: "Client ID manquant" },
        { status: 400 }
      );
    }

    const clientId = decrypt(user.spotifyClientId);

    if (!clientId || clientId.includes(":")) {
      return NextResponse.json(
        { error: "Client ID Spotify invalide ou impossible à déchiffrer" },
        { status: 400 }
      );
    }

    const scope =
      "user-read-currently-playing user-read-playback-state";

    const redirectUri =
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/callback/spotify`;

    const spotifyUrl = new URL(
      "https://accounts.spotify.com/authorize"
    );

    spotifyUrl.searchParams.set("client_id", clientId);
    spotifyUrl.searchParams.set("response_type", "code");
    spotifyUrl.searchParams.set("redirect_uri", redirectUri);
    spotifyUrl.searchParams.set("scope", scope);

    return NextResponse.json({
      url: spotifyUrl.toString()
    });

  } catch (error) {
    console.error("Erreur génération URL Spotify:", error);

    return NextResponse.json(
      { error: "Impossible de générer l'URL Spotify" },
      { status: 500 }
    );
  }
}
