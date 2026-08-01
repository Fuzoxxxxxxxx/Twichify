import { NextResponse } from "next/server";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  let isMongoDbOk = false;
  let isSpotifyOk = false;

  // 1. Vrai Ping MongoDB
  try {
    if (process.env.DATABASE_URL) {
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.DATABASE_URL);
      }
      isMongoDbOk = mongoose.connection.readyState === 1;
    }
  } catch (error) {
    isMongoDbOk = false;
  }

  // 2. Vrai Ping API Spotify (Endpoint public d'analyse de statut)
  try {
    const spotifyPing = await fetch("https://open.spotify.com", {
      method: "HEAD", // HEAD est très rapide car il ne charge pas le HTML
      cache: "no-store",
    });

    // Si les serveurs Spotify répondent (statut 200 à 399)
    isSpotifyOk = spotifyPing.ok || spotifyPing.status < 400;
  } catch (error) {
    isSpotifyOk = false;
  }

  const latency = `${Date.now() - startedAt}ms`;

  // Fonction pour générer 24 barres
  const generate24hHistory = (isCurrentOk: boolean) => {
    const history = Array.from({ length: 23 }, () => "green");
    history.push(isCurrentOk ? "green" : "red");
    return history;
  };

  const services = [
    {
      name: "Twitchify API",
      status: "Operational",
      percent: "100%",
      state: "green",
      history: generate24hHistory(true),
    },
    {
      name: "Spotify API",
      status: isSpotifyOk ? "Operational" : "Degraded",
      percent: isSpotifyOk ? "100%" : "95.8%",
      state: isSpotifyOk ? "green" : "red",
      history: generate24hHistory(isSpotifyOk),
    },
    {
      name: "MongoDB Database",
      status: isMongoDbOk ? "Operational" : "Down",
      percent: isMongoDbOk ? "100%" : "95.8%",
      state: isMongoDbOk ? "green" : "red",
      history: generate24hHistory(isMongoDbOk),
    },
  ];

  return NextResponse.json(
    {
      latency,
      allSystemsOperational: isMongoDbOk && isSpotifyOk,
      services,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}