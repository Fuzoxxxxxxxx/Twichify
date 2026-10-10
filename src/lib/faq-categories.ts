/**
 * Catégories de la FAQ : source unique, partagée par le modèle, les API, la page d'aide et l'admin.
 * Sans import serveur : utilisable côté client comme côté serveur.
 *
 * L'ordre du tableau est l'ordre d'affichage (filtres de l'aide, liste de l'admin, tri des articles).
 * Les clés « spotify », « obs », « api », « compte » et « autre » existaient déjà : ne pas les renommer,
 * des articles y sont rattachés. Les catégories de la FAQ sont indépendantes de celles des tickets de support.
 * Pour en ajouter une : l'ajouter ici (et une icône dans `app/help/page.tsx`).
 */
export const FAQ_CATEGORIES = [
  { key: "demarrage", label: "Premiers pas", description: "Connexion, configuration initiale et premiers réglages." },
  { key: "spotify", label: "Spotify", description: "Connexion du compte, clés de l'application et lecture en temps réel." },
  { key: "bot", label: "Bot & commandes", description: "Nightbot, Wizebot, StreamElements, StreamLabs et annonces automatiques." },
  { key: "obs", label: "OBS & overlays", description: "Ajouter les widgets dans OBS, dimensions, affichage et liens d'overlay." },
  { key: "chat", label: "Widget de chat", description: "Thèmes, filtres, emotes, badges et affichage des messages." },
  { key: "twitch", label: "Twitch", description: "Statistiques de chaîne, followers, départs, équipe et autorisations." },
  { key: "stats", label: "Statistiques", description: "Historique d'écoute et statistiques de chat." },
  { key: "statut", label: "Statut du service", description: "Page de statut, incidents et disponibilité des services." },
  { key: "compte", label: "Compte & données", description: "Export, suppression, sessions et conservation des données." },
  { key: "securite", label: "Sécurité & vie privée", description: "Protection des identifiants, liens privés et permissions demandées." },
  { key: "api", label: "API & erreurs", description: "Erreurs d'authentification, limites d'appels et jetons." },
  { key: "communaute", label: "Idées & support", description: "Boîte à idées, tickets, changelog et contact de l'équipe." },
  { key: "autre", label: "Autre", description: "Questions diverses." },
] as const;

export type FaqCategoryKey = (typeof FAQ_CATEGORIES)[number]["key"];

export const FAQ_CATEGORY_KEYS: FaqCategoryKey[] = FAQ_CATEGORIES.map((c) => c.key);

export const isFaqCategory = (value: unknown): value is FaqCategoryKey =>
  typeof value === "string" && (FAQ_CATEGORY_KEYS as string[]).includes(value);

/** Libellé affiché ; une clé inconnue (ancienne donnée) retombe sur « Autre ». */
export const faqCategoryLabel = (key: string): string =>
  FAQ_CATEGORIES.find((c) => c.key === key)?.label ?? "Autre";

export const faqCategoryDescription = (key: string): string =>
  FAQ_CATEGORIES.find((c) => c.key === key)?.description ?? "";

/** Position d'affichage d'une catégorie ; une clé inconnue passe en dernier. */
export const faqCategoryOrder = (key: string): number => {
  const i = FAQ_CATEGORY_KEYS.indexOf(key as FaqCategoryKey);
  return i === -1 ? FAQ_CATEGORY_KEYS.length : i;
};
