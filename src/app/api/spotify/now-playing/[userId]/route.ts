import { NextResponse, NextRequest } from "next/server";
import mongoose from "mongoose";
import User from "@/models/User";
import axios from "axios";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }

  // ON RÉCUPÈRE L'USER ET SES SETTINGS
  const user = await User.findById(userId);
  if (!user || !user.spotifyRefreshToken) return NextResponse.json({ isPlaying: false });

  // Valeurs par défaut si le design n'est pas encore configuré
  const defaultSettings = {
    accentColor: "#22c55e",
    borderRadius: "16",
    bgOpacity: "80"
  };

  try {
    // 1. Refresh Access Token
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

    // 2. Musique actuelle
    const trackResponse = await axios.get("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (trackResponse.status === 204 || !trackResponse.data.item) {
      return NextResponse.json({ 
        isPlaying: false,
        settings: user.widgetSettings || defaultSettings 
      });
    }

    const item = trackResponse.data.item;
    
    // ON RETOURNE LA MUSIQUE + LE DESIGN
    return NextResponse.json({
      isPlaying: true,
      title: item.name,
      artist: item.artists.map((a: any) => a.name).join(", "),
      albumImageUrl: item.album.images[0].url,
      progressMs: trackResponse.data.progress_ms,
      durationMs: item.duration_ms,
      // On injecte les réglages de l'utilisateur ici
      settings: user.widgetSettings || defaultSettings
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      isPlaying: false, 
      settings: user.widgetSettings || defaultSettings 
    });
  }
}