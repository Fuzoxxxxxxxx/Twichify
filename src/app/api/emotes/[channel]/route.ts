// src/app/api/emotes/[channel]/route.ts
import { NextResponse } from "next/server";
import { getBroadcasterId } from "@/lib/twitch";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ channel: string }> }
) {
  try {
    const { channel } = await params;
    const broadcasterId = await getBroadcasterId(channel);
    const emoteMap: Record<string, string> = {};

    // BTTV
    try {
      const [globalRes, channelRes] = await Promise.all([
        fetch("https://api.betterttv.net/3/cached/emotes/global"),
        broadcasterId
          ? fetch(`https://api.betterttv.net/3/cached/users/twitch/${broadcasterId}`)
          : Promise.resolve(null),
      ]);

      if (globalRes.ok) {
        const globalEmotes = await globalRes.json();
        for (const e of globalEmotes) {
          emoteMap[e.code] = `https://cdn.betterttv.net/emote/${e.id}/2x`;
        }
      }

      if (channelRes?.ok) {
        const channelData = await channelRes.json();
        const channelEmotes = [...(channelData.channelEmotes || []), ...(channelData.sharedEmotes || [])];
        for (const e of channelEmotes) {
          emoteMap[e.code] = `https://cdn.betterttv.net/emote/${e.id}/2x`;
        }
      }
    } catch (e) {
      console.error("Erreur BTTV:", e);
    }

    // 7TV
    try {
      const [globalRes, channelRes] = await Promise.all([
        fetch("https://7tv.io/v3/emote-sets/global"),
        broadcasterId
          ? fetch(`https://7tv.io/v3/users/twitch/${broadcasterId}`)
          : Promise.resolve(null),
      ]);

      if (globalRes.ok) {
        const globalData = await globalRes.json();
        for (const e of globalData.emotes || []) {
          const url = e?.data?.host?.url;
          if (url) emoteMap[e.name] = `https:${url}/2x.webp`;
        }
      }

      if (channelRes?.ok) {
        const channelData = await channelRes.json();
        for (const e of channelData?.emote_set?.emotes || []) {
          const url = e?.data?.host?.url;
          if (url) emoteMap[e.name] = `https:${url}/2x.webp`;
        }
      }
    } catch (e) {
      console.error("Erreur 7TV:", e);
    }

    // FFZ
try {
  const ffzRes = broadcasterId 
    ? await fetch(`https://api.frankerfacez.com/v1/room/id/${broadcasterId}`)
    : null;

  if (ffzRes?.ok) {
    const ffzData = await ffzRes.json();
    const setId = ffzData.room?.set;
    // L'API FFZ v1 nomme la liste « emoticons » (et non « emotes »).
    const emoticons = ffzData.sets?.[setId]?.emoticons;
    if (setId && Array.isArray(emoticons)) {
      for (const e of emoticons) {
        // FFZ propose plusieurs tailles (1, 2, 4)
        const url = e?.urls?.['2'] || e?.urls?.['1'];
        if (url) emoteMap[e.name] = `https:${url}`;
      }
    }
  }
} catch (e) {
  console.error("Erreur FFZ:", e);
}

    return NextResponse.json(emoteMap);
  } catch (err) {
    console.error("Erreur route emotes:", err);
    return NextResponse.json({}, { status: 500 });
  }
}