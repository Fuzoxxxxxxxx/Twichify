import { createHash } from "crypto";
import { NextResponse, NextRequest } from "next/server";
import { findUserByWidgetRef } from "@/lib/widget-token";
import User from "@/models/User";
import { sanitizeInfoBanner } from "@/lib/info-banner";
import { noteWidgetSeen } from "@/lib/widget-seen";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET public (jeton du lien du widget) : réglages du widget bandeau d'informations, relus toutes les 5 s par le widget.
//
// Les réglages peuvent contenir des logos personnalisés (jusqu'à ~200 Ko). Pour ne pas les renvoyer toutes les 5 secondes
// à chaque widget, la réponse porte un ETag : le navigateur redemande avec If-None-Match et reçoit un 304 vide tant que
// rien n'a changé (le fetch du widget utilise `cache: "no-cache"`, qui fait cette revalidation automatiquement).
export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;

    if (!userId || userId === "undefined") {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const user = await findUserByWidgetRef(userId);
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    // Suivi d'installation : le widget annonce un vrai chargement avec ?w=1 (ni le mode test ni l'aperçu du dashboard).
    // Fait avant la réponse 304 : un widget dont les réglages ne changent pas doit quand même être vu en ligne.
    if (req.nextUrl.searchParams.get("w") === "1") await noteWidgetSeen(user, "banner");

    // Champ exclu par défaut du modèle (il peut contenir des logos) : lu uniquement par cette route.
    const doc = await User.findById(user._id).select("+bannerWidgetSettings").lean();
    const body = JSON.stringify({ settings: sanitizeInfoBanner((doc as any)?.bannerWidgetSettings) });
    const etag = `"${createHash("sha1").update(body).digest("base64url")}"`;

    if (req.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, "Cache-Control": "no-cache" } });
    }

    return new NextResponse(body, {
      headers: { "Content-Type": "application/json", ETag: etag, "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("Erreur API config bandeau d'informations:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
