import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { getChatters } from "@/lib/twitch-chatters";
import { KNOWN_BOTS } from "@/lib/known-bots";

export const dynamic = "force-dynamic";

// GET : repère les bots parmi les spectateurs connectés au chat de l'utilisateur.
//  - known       : bots connus présents (déjà masqués automatiquement)
//  - suggestions : autres pseudos finissant par « bot » ; l'utilisateur confirme avant de les ajouter
// La liste complète des spectateurs n'est jamais renvoyée ni enregistrée.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const result = await getChatters(String(user._id));
    if (!result) return NextResponse.json({ error: "Compte Twitch introuvable" }, { status: 404 });

    if (result.status !== "ok") {
      return NextResponse.json({ status: result.status, scanned: 0, capped: false, known: [], suggestions: [] });
    }

    const self = String((user as any).name || "").toLowerCase();
    const unique = [...new Set(result.logins)];
    const known = unique.filter((login) => KNOWN_BOTS.has(login));
    const suggestions = unique.filter(
      (login) => !KNOWN_BOTS.has(login) && login !== self && login.length >= 5 && login.endsWith("bot")
    );

    return NextResponse.json({
      status: "ok",
      scanned: result.total ?? unique.length,
      capped: result.capped,
      known,
      suggestions,
    });
  } catch (e) {
    console.error("Erreur détection des bots:", e);
    return NextResponse.json({ error: "Twitch est momentanément indisponible" }, { status: 502 });
  }
}
