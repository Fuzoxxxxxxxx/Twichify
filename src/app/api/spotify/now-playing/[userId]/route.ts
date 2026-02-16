import { NextResponse, NextRequest } from "next/server";
import mongoose from "mongoose";
import User from "@/models/User";
import axios from "axios";

// On utilise NextRequest et on définit params comme une Promise
export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ userId: string }> }
) {
  // 1. ON RÉCUPÈRE L'ID (L'étape manquante qui bloquait Vercel)
  const { userId } = await params;

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }

  // 2. ON CHERCHE L'UTILISATEUR AVEC L'ID EXTRAIT
  const user = await User.findById(userId);
  if (!user || !user.spotifyRefreshToken) return NextResponse.json({ isPlaying: false });

  try {
    // 1. Obtenir un nouvel Access Token
    const tokenResponse = await axios.post("https://accounts.spotify.com/api/token", 
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: user.spotifyRefreshToken,
      }), {
      headers: {
        Authorization: "Basic " + Buffer.from(user.spotifyClientId + ":" + user.spotifyClientSecret).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      }
    });

    const accessToken = tokenResponse.data.access_token;

    // 2. Récupérer la musique actuelle
    const trackResponse = await axios.get("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (trackResponse.status === 204 || !trackResponse.data.item) {
      return NextResponse.json({ isPlaying: false });
    }

    const item = trackResponse.data.item;
    return NextResponse.json({
      isPlaying: true,
      title: item.name,
      artist: item.artists.map((a: any) => a.name).join(", "),
      albumImageUrl: item.album.images[0].url,
      progressMs: trackResponse.data.progress_ms,
      durationMs: item.duration_ms,
    });

  } catch (error) {
    return NextResponse.json({ isPlaying: false, error: "Spotify API Error" });
  }
}