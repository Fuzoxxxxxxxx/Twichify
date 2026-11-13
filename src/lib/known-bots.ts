// Bots de chat Twitch très répandus (pseudos en minuscules). Liste volontairement courte et sûre :
// les bots personnalisés se déclarent dans le réglage `hiddenBots` du widget chat.
//
// Pas de détection par le contenu du pseudo (ex. « contient bot ») : elle masquait aussi de vrais viewers
// (« RobotFan », « Abbott »…) et les comptait comme bots dans les statistiques.
export const KNOWN_BOTS: ReadonlySet<string> = new Set([
  "nightbot",
  "streamelements",
  "streamlabs",
  "moobot",
  "wizebot",
  "fossabot",
  "sery_bot",
  "commanderroot",
  "anotherttvviewer",
  "lurxx",
  "pokemoncommunitygame",
  "deepbot",
  "ankhbot",
]);

export function normalizeLogin(value: string): string {
  return value.trim().replace(/^@/, "").toLowerCase();
}

/** Vrai si le pseudo est un bot connu ou figure dans la liste du streamer. */
export function isBotLogin(login: string, custom?: readonly string[] | null): boolean {
  const l = normalizeLogin(login);
  if (!l) return false;
  if (KNOWN_BOTS.has(l)) return true;
  return (custom ?? []).some((b) => typeof b === "string" && normalizeLogin(b) === l);
}

/** Nettoie une liste saisie : minuscules, sans « @ », sans doublons, pseudos Twitch valides, taille bornée. */
export function sanitizeBotList(input: unknown, max = 200): string[] {
  if (!Array.isArray(input)) return [];
  const out = new Set<string>();
  for (const value of input) {
    if (typeof value !== "string") continue;
    const login = normalizeLogin(value);
    if (/^[a-z0-9_]{3,25}$/.test(login)) out.add(login);
    if (out.size >= max) break;
  }
  return [...out];
}
