import { NextResponse } from "next/server";
import mongoose from "mongoose";
import SiteSettings from "@/models/SiteSettings";

// Le CDN garde la réponse 10 s : des milliers de visiteurs qui interrogent l'API
// toutes les 15 s ne génèrent qu'une poignée de requêtes vers MongoDB.
const CACHE = { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" };

type ActiveBanner = { id: number; message: string; level: string } | null;

// Cache mémoire par instance (évite une requête Mongo par visiteur).
const TTL_MS = 5_000;
let memo: { at: number; banner: ActiveBanner } | null = null;

type StoredBanner = {
  enabled?: boolean;
  message?: string;
  level?: string;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  updatedAt?: Date | null;
};

// Début et fin sont évalués ici, à chaque requête : l'annonce apparaît et
// disparaît toute seule, sans action du propriétaire.
function computeActive(banner: StoredBanner | undefined, nowMs: number): ActiveBanner {
  if (!banner?.enabled || !banner.message) return null;

  const start = banner.startsAt ? new Date(banner.startsAt).getTime() : 0;
  const end = banner.expiresAt ? new Date(banner.expiresAt).getTime() : Infinity;
  if (nowMs < start || nowMs >= end) return null;

  return {
    // Identifiant de publication : republier ré-affiche le bandeau aux visiteurs qui l'avaient fermé.
    id: banner.updatedAt ? new Date(banner.updatedAt).getTime() : 0,
    message: banner.message,
    level: banner.level || "info",
  };
}

// GET public : annonce globale active (null sinon).
export async function GET() {
  try {
    const nowMs = Date.now();

    if (memo && nowMs - memo.at < TTL_MS) {
      return NextResponse.json({ banner: memo.banner }, { headers: CACHE });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const settings = await SiteSettings.findOne({ key: "global" }).lean<{ banner?: StoredBanner }>();
    const banner = computeActive(settings?.banner, nowMs);

    memo = { at: nowMs, banner };
    return NextResponse.json({ banner }, { headers: CACHE });
  } catch (error) {
    console.error("Erreur GET site-banner:", error);
    // En cas d'erreur, le client garde l'annonce déjà affichée (il ignore les réponses non-OK).
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
