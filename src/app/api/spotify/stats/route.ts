import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import User from "@/models/User";
import mongoose from "mongoose";

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error("Erreur rafraîchissement token Spotify");
  return data;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Assure-toi que la connexion Mongoose est bien active (si ce n'est pas fait globalement)
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI as string);
    }

    const user = await User.findById(session.user.id);

    if (!user || !user.spotifyAccessToken || !user.spotifyClientId || !user.spotifyClientSecret) {
      return NextResponse.json({ error: "Spotify non configuré ou non connecté" }, { status: 400 });
    }

    let accessToken = user.spotifyAccessToken;
    let expiresAt = user.spotifyTokenExpiresAt;

    if (expiresAt && Date.now() >= expiresAt) {
      try {
        const tokenData = await refreshAccessToken(
          user.spotifyRefreshToken,
          user.spotifyClientId,
          user.spotifyClientSecret
        );
        accessToken = tokenData.access_token;
        user.spotifyAccessToken = accessToken;
        user.spotifyTokenExpiresAt = Date.now() + tokenData.expires_in * 1000;
        await user.save();
      } catch (err) {
        return NextResponse.json({ error: "Impossible de rafraîchir la session Spotify" }, { status: 401 });
      }
    }

    // Top Artistes (4 dernières semaines - short_term)
    const artistsRes = await fetch("https://api.spotify.com/v1/me/top/artists?limit=5&time_range=short_term", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Top Titres (4 dernières semaines - short_term)
    const tracksRes = await fetch("https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=short_term", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!artistsRes.ok || !tracksRes.ok) {
      return NextResponse.json({ error: "Erreur lors de la récupération des données Spotify" }, { status: 400 });
    }

    const artistsData = await artistsRes.json();
    const tracksData = await tracksRes.json();

    return NextResponse.json({
      topArtists: artistsData.items,
      topTracks: tracksData.items,
    });

  } catch (error) {
    console.error("Erreur API stats:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}