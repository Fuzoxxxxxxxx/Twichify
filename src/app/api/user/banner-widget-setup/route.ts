import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import User from "@/models/User";
import { sanitizeInfoBanner } from "@/lib/info-banner";

export const dynamic = "force-dynamic";

// GET : réglages du widget bandeau d'informations (complétés par les valeurs par défaut).
// Le champ est exclu par défaut du modèle (il peut contenir des logos) : on le demande explicitement.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const doc = await User.findById(user._id).select("+bannerWidgetSettings").lean();
  return NextResponse.json({ settings: sanitizeInfoBanner((doc as any)?.bannerWidgetSettings) });
}

// POST : enregistre les réglages. Rien n'est enregistré tel quel : tout passe par sanitizeInfoBanner
// (bornes, couleurs, police connue, 10 messages de 140 caractères au maximum, logos réduits en PNG, JPEG ou WebP).
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  try {
    const settings = sanitizeInfoBanner(body);
    await User.findByIdAndUpdate(user._id, { $set: { bannerWidgetSettings: settings } });
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Erreur API bandeau d'informations:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
