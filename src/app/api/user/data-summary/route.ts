import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { getDataSummary } from "@/lib/account-data";

export const dynamic = "force-dynamic";

// GET : résumé léger de ce que Twichify conserve, pour l'affichage de la page « Compte & données »
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const summary = await getDataSummary(user);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Erreur résumé des données:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
