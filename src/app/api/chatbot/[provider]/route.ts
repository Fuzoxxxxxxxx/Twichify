import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { findUserByWidgetRef } from "@/lib/widget-token";
import axios from "axios";
import { decrypt } from "@/lib/crypto";

// 💡 DÉSACTIVATION DU CACHE NEXT.JS / VERCEL
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getCurrentTrack(userId: string) {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }

  const user = await findUserByWidgetRef(userId);
  if (!user || !user.spotifyRefreshToken) return null;

  // Les identifiants sont chiffrés au repos (AES-256-GCM) : il faut les
  // déchiffrer avant de les utiliser, comme le fait déjà now-playing/route.ts.
  const refreshToken = decrypt(user.spotifyRefreshToken);
  const clientId = decrypt(user.spotifyClientId);
  const clientSecret = decrypt(user.spotifyClientSecret);

  if (!refreshToken || !clientId || !clientSecret) return null;

  try {
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;
    const trackResponse = await axios.get(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

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
      // Configuration Bot
      customTemplate:
        user.botSettings?.customMessage || "Musique en cours : {song}",
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

  // CAS : Aucune musique en cours
  if (!track) {
    const emptyMessage = "Aucune musique en cours actuellement.";

    if (
      provider === "nightbot" ||
      provider === "wizebot" ||
      provider === "streamelements" ||
      provider === "streamlabs"
    ) {
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

  // Une seule URL, un seul template : la même réponse que la commande soit
  // appelée à la demande (!song) ou depuis un Timer du bot pour une annonce
  // périodique — rien à changer côté streamer entre les deux usages.
  const template = track.customTemplate;

  const songPair = `${track.artist} - ${track.title}`;

  // 💡 APPLICATION DU MESSAGE PERSONNALISÉ (+ Remplacement {song})
  const songText = template
    .replace(/{artist}/g, track.artist)
    .replace(/{title}/g, track.title)
    .replace(/{song}/g, songPair);

  // Réponses pour les bots de chat (texte brut)
  if (
    provider === "nightbot" ||
    provider === "wizebot" ||
    provider === "streamelements" ||
    provider === "streamlabs"
  ) {
    return new Response(songText, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Réponse JSON standard
  return NextResponse.json({
    ok: true,
    artist: track.artist,
    title: track.title,
    song: songPair,
    text: songText,
  });
}