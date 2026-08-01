import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/models/User";
import axios from "axios";

// 💡 DÉSACTIVATION DU CACHE NEXT.JS / VERCEL
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getCurrentTrack(userId: string) {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }

  const user = await User.findById(userId);
  if (!user || !user.spotifyRefreshToken) return null;

  try {
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: user.spotifyRefreshToken,
      }),
      {
        headers: {
          Authorization: "Basic " + Buffer.from(`${user.spotifyClientId}:${user.spotifyClientSecret}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;
    const trackResponse = await axios.get("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (
      trackResponse.status === 204 ||
      !trackResponse.data ||
      !trackResponse.data.item ||
      trackResponse.data.is_playing === false
    ) {
      return null;
    }

    const item = trackResponse.data.item;

    return {
      title: item.name,
      artist: item.artists.map((a: any) => a.name).join(", "),
      albumImageUrl: item.album.images[0]?.url || "",
      progressMs: trackResponse.data.progress_ms,
      durationMs: item.duration_ms,
      isPlaying: trackResponse.data.is_playing,
      customTemplate: user.botSettings?.customMessage || "Now playing: {artist} - {title}"
    };
  } catch (error) {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId requis" }, { status: 400 });
  }

  const track = await getCurrentTrack(userId);

  if (!track) {
    const emptyMessage = "Aucune musique en cours actuellement.";

    if (provider === "nightbot" || provider === "wizebot") {
      return new Response(emptyMessage, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return NextResponse.json({
      ok: false,
      artist: "",
      title: "",
      text: emptyMessage,
      song: emptyMessage,
    });
  }

  // 💡 APPLICATION DU MESSAGE PERSONNALISÉ
  const songText = track.customTemplate
    .replace(/{artist}/g, track.artist)
    .replace(/{title}/g, track.title);

  if (provider === "nightbot" || provider === "wizebot") {
    return new Response(songText, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (provider === "streamelements") {
    return NextResponse.json({
      ok: true,
      artist: track.artist,
      title: track.title,
      song: songText,
      text: songText
    });
  }

  return NextResponse.json({ error: "Provider inconnu" }, { status: 404 });
}