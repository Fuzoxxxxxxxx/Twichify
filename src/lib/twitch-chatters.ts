import { CHATTERS_SCOPE, getUserAuth, helixUser } from "@/lib/twitch-user";

/**
 * Spectateurs actuellement connectés au chat de la chaîne de l'utilisateur (Helix « Get Chatters »).
 * Lecture seule, à la demande (bouton « Détecter les bots » du widget chat) : la liste n'est jamais enregistrée,
 * seulement gardée en mémoire quelques secondes pour éviter de rappeler Twitch à chaque clic.
 *
 * - ok            : liste disponible
 * - missing_scope : permission moderator:read:chatters non accordée (reconnexion Twitch nécessaire)
 * - expired       : jeton expiré ou révoqué (reconnexion nécessaire)
 * - error         : erreur temporaire de Twitch
 */
export type ChattersStatus = "ok" | "missing_scope" | "expired" | "error";

export type ChattersResult = {
  status: ChattersStatus;
  logins: string[]; // pseudos en minuscules
  total: number | null; // total annoncé par Twitch
  capped: boolean; // true si la liste a été tronquée (chat très fréquenté)
};

const PAGE_SIZE = 1000;
const MAX_PAGES = 5;
const CACHE_TTL_MS = 15_000;

const cache = new Map<string, { at: number; data: ChattersResult }>();

export async function getChatters(userId: string): Promise<ChattersResult | null> {
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const auth = await getUserAuth(userId);
  if (!auth) return null;

  const base = { logins: [] as string[], total: null as number | null, capped: false };
  if (auth.status !== "ok" || !auth.token) return { status: auth.status, ...base };
  if (!auth.scopes.includes(CHATTERS_SCOPE)) return { status: "missing_scope", ...base };

  try {
    const logins: string[] = [];
    let total: number | null = null;
    let cursor: string | undefined;
    let capped = false;

    for (let page = 0; page < MAX_PAGES; page++) {
      const after = cursor ? `&after=${encodeURIComponent(cursor)}` : "";
      // Le diffuseur est son propre modérateur : moderator_id doit correspondre à l'utilisateur du jeton.
      const res = await helixUser(
        `/chat/chatters?broadcaster_id=${auth.twitchId}&moderator_id=${auth.twitchId}&first=${PAGE_SIZE}${after}`,
        auth.token
      );

      if (res.status === 401) return { status: "expired", ...base };
      if (res.status === 403) return { status: "missing_scope", ...base };
      if (!res.ok) {
        // Une page suivante qui échoue ne fait pas perdre les premières.
        if (page === 0) return { status: "error", ...base };
        capped = true;
        break;
      }

      const json = await res.json();
      if (page === 0) total = typeof json.total === "number" ? json.total : null;
      for (const c of (json.data ?? []) as { user_login?: string }[]) {
        if (c.user_login) logins.push(c.user_login.toLowerCase());
      }

      cursor = json.pagination?.cursor;
      if (!cursor) break;
      if (page === MAX_PAGES - 1) capped = true;
    }

    const data: ChattersResult = { status: "ok", logins, total, capped };
    cache.set(userId, { at: Date.now(), data });
    return data;
  } catch (e) {
    console.error("Erreur spectateurs connectés Twitch:", e);
    return { status: "error", ...base };
  }
}
