import User from "@/models/User";

/**
 * Suivi d'installation : date du dernier vrai chargement de chaque widget (source navigateur OBS).
 *
 * Les widgets annoncent un vrai chargement avec `?w=1` sur leurs requêtes de données ; le mode test (?test=1)
 * et l'aperçu du dashboard ne l'envoient pas, donc ils ne comptent jamais. Alimente l'assistant d'installation.
 *
 * Les widgets interrogent l'API toutes les secondes : on n'écrit en base qu'au plus une fois par minute et par widget
 * (limite propre à chaque instance de serveur, comme les caches de la route now-playing).
 */

const WRITE_INTERVAL_MS = 60_000;
const lastWrite = new Map<string, number>();

export type WidgetKind = "music" | "chat";

export async function noteWidgetSeen(user: any, kind: WidgetKind): Promise<void> {
  const key = `${user._id}:${kind}`;
  const stored = user.widgetSeen?.[kind === "music" ? "musicAt" : "chatAt"];
  const now = Date.now();
  const last = lastWrite.get(key) ?? (stored ? new Date(stored).getTime() : 0);
  if (now - last < WRITE_INTERVAL_MS) return;

  lastWrite.set(key, now);
  try {
    await User.updateOne(
      { _id: user._id },
      { $set: { [`widgetSeen.${kind === "music" ? "musicAt" : "chatAt"}`]: new Date(now) } }
    );
  } catch (error) {
    // Un suivi manqué n'est pas grave : il ne doit jamais casser la réponse du widget.
    console.error("Erreur suivi de chargement du widget:", error);
  }
}
