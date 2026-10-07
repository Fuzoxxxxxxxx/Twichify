import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { ensureWidgetToken, rotateWidgetToken } from "@/lib/widget-token";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

// GET : renvoie le jeton des widgets de l'utilisateur connecté (créé à la première demande pour
// les comptes existants). `legacyActive` indique si l'ancien lien basé sur l'_id fonctionne encore.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const token = await ensureWidgetToken(user._id.toString());
    if (!token) return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });

    return NextResponse.json(
      { token, legacyActive: !user.widgetLegacyIdDisabled },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("Erreur lecture jeton widgets:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST : régénère le jeton. L'ancien jeton et l'ancien lien basé sur l'_id sont révoqués immédiatement :
// l'utilisateur doit mettre à jour ses sources OBS et ses commandes bot.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const token = await rotateWidgetToken(user._id.toString());
    return NextResponse.json({ token, legacyActive: false }, { headers: NO_STORE });
  } catch (error) {
    console.error("Erreur régénération jeton widgets:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
