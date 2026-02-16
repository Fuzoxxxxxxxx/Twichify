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

  const user = await User.findById(userId);
  if (!user || !user.spotifyRefreshToken) return NextResponse.json({ isPlaying: false });

  // Ajout de blurAmount dans les valeurs par défaut
  const defaultSettings = {
    accentColor: "#22c55e",
    borderRadius: "16",
    bgOpacity: "80",
    blurAmount: "10", // <--- IMPORTANT POUR LE FLOU
    enableBlurBg: true
  };

  try {
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

    const trackResponse = await axios.get("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // CORRECTION PAUSE : On vérifie si Spotify dit explicitement que ça ne joue pas
    if (
      trackResponse.status === 204 || 
      !trackResponse.data || 
      !trackResponse.data.item || 
      trackResponse.data.is_playing === false // <--- DETECTION DE LA PAUSE
    ) {
      return NextResponse.json({ 
        isPlaying: false,
        settings: user.widgetSettings || defaultSettings 
      });
    }

    const item = trackResponse.data.item;
    
    return NextResponse.json({
      isPlaying: trackResponse.data.is_playing,
      title: item.name,
      artist: item.artists.map((a: any) => a.name).join(", "),
      albumImageUrl: item.album.images[0].url,
      progressMs: trackResponse.data.progress_ms,
      durationMs: item.duration_ms,
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