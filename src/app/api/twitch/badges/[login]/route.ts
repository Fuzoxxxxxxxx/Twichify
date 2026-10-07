import { NextResponse } from "next/server";
import { getAppAccessToken, getBroadcasterId } from "@/lib/twitch";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ login: string }> }
) {
  try {
    const { login } = await params;

    const broadcasterId = await getBroadcasterId(login);
    if (!broadcasterId) {
      return NextResponse.json({}, { status: 404 });
    }

    const token = await getAppAccessToken();
    const headers = {
      "Client-ID": process.env.TWITCH_CLIENT_ID!,
      Authorization: `Bearer ${token}`,
    };

    const [globalRes, channelRes] = await Promise.all([
      fetch("https://api.twitch.tv/helix/chat/badges/global", { headers }),
      fetch(`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${broadcasterId}`, { headers }),
    ]);

    const global = (await globalRes.json()).data || [];
    const channel = (await channelRes.json()).data || [];

    const merged: Record<string, Record<string, string>> = {};
    for (const set of [...global, ...channel]) {
      merged[set.set_id] = merged[set.set_id] || {};
      for (const v of set.versions) {
        merged[set.set_id][v.id] = v.image_url_2x;
      }
    }

    return NextResponse.json(merged);
  } catch (err) {
    console.error("Erreur badges Twitch:", err);
    return NextResponse.json({}, { status: 500 });
  }
}