import { NextResponse, NextRequest } from "next/server";
import { findUserByWidgetRef } from "@/lib/widget-token";
import { ingestChatStats, isEmptyPayload, parseStatsPayload } from "@/lib/chat-stats";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;
const MIN_INTERVAL_MS = 3000; // le widget envoie toutes les 30 s : on tolère large, mais pas de rafale

const lastIngest = new Map<string, number>();

// POST : le widget chat envoie ses compteurs agrégés (jamais le texte des messages).
// Réponse 200 { ok: false, disabled: true } si les statistiques sont désactivées : le widget arrête alors d'envoyer.
export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId: ref } = await params;
    const user = await findUserByWidgetRef(ref);
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });

    if (!user.chatStats?.enabled) return NextResponse.json({ ok: false, disabled: true });

    const id = String(user._id);
    const now = Date.now();
    const last = lastIngest.get(id);
    if (last && now - last < MIN_INTERVAL_MS) {
      return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
    }

    // Taille bornée avant tout parsing : le lien du widget est public pour qui le connaît.
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    const payload = parseStatsPayload(raw);
    if (!payload) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    if (isEmptyPayload(payload)) return NextResponse.json({ ok: true });

    lastIngest.set(id, now);
    if (lastIngest.size > 2000) {
      for (const key of lastIngest.keys()) {
        lastIngest.delete(key);
        if (lastIngest.size <= 1000) break;
      }
    }

    await ingestChatStats(id, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erreur API stats chat (widget):", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
