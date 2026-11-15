import { NextResponse } from "next/server";
import mongoose from "mongoose";
import FaqArticle from "@/models/FaqArticle";

export const dynamic = "force-dynamic";

// Anti-abus léger, en mémoire : un même visiteur (IP) ne compte qu'une fois par article et par jour.
// L'adresse IP n'est jamais enregistrée en base ni ailleurs : elle ne vit que dans cette Map, le temps de la fenêtre.
// Sur serverless chaque instance a sa propre Map, la limite est donc approximative, ce qui suffit pour de simples compteurs.
const WINDOW_MS = 24 * 3600 * 1000;
const MAX_KEYS = 5000;
const recent = new Map<string, number>();

function visitorKey(req: Request, articleId: string): string {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "inconnu";
  return `${ip}|${articleId}`;
}

// POST { helpful: boolean } : « Cet article vous a-t-il aidé ? ». Public, sans compte, réponse toujours rapide.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Article invalide" }, { status: 400 });

    const body = await req.json().catch(() => null);
    if (typeof body?.helpful !== "boolean") return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

    const key = visitorKey(req, id);
    const now = Date.now();
    const last = recent.get(key);
    // Déjà compté récemment : on répond « ok » sans rien écrire (le lecteur voit son remerciement, sans savoir qu'il est ignoré).
    if (last && now - last < WINDOW_MS) return NextResponse.json({ ok: true, counted: false });

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const result = await FaqArticle.updateOne({ _id: id }, { $inc: body.helpful ? { helpfulYes: 1 } : { helpfulNo: 1 } });
    if (result.matchedCount === 0) return NextResponse.json({ error: "Article introuvable" }, { status: 404 });

    recent.set(key, now);
    if (recent.size > MAX_KEYS) {
      // On écarte d'abord les entrées les plus anciennes (la Map garde l'ordre d'insertion).
      for (const oldKey of recent.keys()) {
        recent.delete(oldKey);
        if (recent.size <= MAX_KEYS * 0.8) break;
      }
    }

    return NextResponse.json({ ok: true, counted: true });
  } catch (error) {
    console.error("Erreur retour FAQ:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
