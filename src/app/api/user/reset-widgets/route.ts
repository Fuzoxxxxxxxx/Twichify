import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import User from "@/models/User";

export const dynamic = "force-dynamic";

// POST : réinitialise les réglages des widgets (musique, chat, bot) à leurs valeurs par défaut.
// N'affecte ni les statistiques d'écoute, ni le canvas, ni le reste du compte.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    // On retire les champs : au prochain chargement, le schéma Mongoose réapplique
    // automatiquement les valeurs par défaut de chaque sous-objet.
    await User.findByIdAndUpdate(user._id, {
      $unset: { widgetSettings: "", chatWidgetSettings: "", botSettings: "" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur réinitialisation des widgets:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
