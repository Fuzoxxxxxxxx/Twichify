import { NextResponse } from "next/server";
import { getAppAccessToken } from "@/lib/twitch";

// Badges Twitch globaux (sans chaîne précise), utilisés par l'aperçu de la page d'accueil.
// Route publique et très sollicitée : cache mémoire long + cache CDN, les badges changent rarement.
const KEEP_SETS = ["broadcaster", "moderator", "vip", "subscriber", "partner", "premium"];
const TTL_MS = 6 * 60 * 60 * 1000;
const CDN_CACHE = { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" };

let memo: { at: number; data: Record<string, Record<string, string>> } | null = null;

export async function GET() {
  try {
    if (memo && Date.now() - memo.at < TTL_MS) {
      return NextResponse.json(memo.data, { headers: CDN_CACHE });
    }

    const token = await getAppAccessToken();
    const res = await fetch("https://api.twitch.tv/helix/chat/badges/global", {
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID!,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error(`Twitch ${res.status}`);

    const sets: { set_id: string; versions: { id: string; image_url_2x: string }[] }[] =
      (await res.json()).data || [];

    // Même forme que /api/twitch/badges/[login] : { set_id: { version: url } }
    const data: Record<string, Record<string, string>> = {};
    for (const set of sets) {
      if (!KEEP_SETS.includes(set.set_id)) continue;
      data[set.set_id] = {};
      for (const v of set.versions) data[set.set_id][v.id] = v.image_url_2x;
    }

    memo = { at: Date.now(), data };
    return NextResponse.json(data, { headers: CDN_CACHE });
  } catch (error) {
    console.error("Erreur badges globaux Twitch:", error);
    // L'aperçu retombe sur des icônes de remplacement si les badges sont indisponibles.
    return NextResponse.json({}, { headers: { "Cache-Control": "public, s-maxage=60" } });
  }
}
