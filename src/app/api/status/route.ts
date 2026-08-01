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

  // 2. Vrai Ping API Spotify
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (clientId && clientSecret) {
      const body = new URLSearchParams({ grant_type: "client_credentials" });
      const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        cache: "no-store",
      });

      isSpotifyOk = tokenRes.ok;
    }
  } catch (error) {
    isSpotifyOk = false;
  }

  const latency = `${Date.now() - startedAt}ms`;

  // Construire des services réels basés sur les tests
  const services = [
    {
      name: "Twitchify API",
      status: "Operational",
      state: "green",
    },
    {
      name: "Spotify API",
      status: isSpotifyOk ? "Operational" : "Degraded",
      state: isSpotifyOk ? "green" : "red",
    },
    {
      name: "MongoDB Database",
      status: isMongoDbOk ? "Operational" : "Down",
      state: isMongoDbOk ? "green" : "red",
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