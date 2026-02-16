import { NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/models/User";
import axios from "axios";

export async function GET(req: Request, { params }: { params: { userId: string } }) {
  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.DATABASE_URL!);

  const user = await User.findById(params.userId);
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
    const trackResponse = await axios.get("http://googleusercontent.com/spotify.com/3", {
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