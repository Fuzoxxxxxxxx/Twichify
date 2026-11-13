// Permissions Twitch demandées à la connexion, et leur explication en langage clair.
// Ce module n'importe rien (ni base de données ni NextAuth) : il peut être lu côté serveur comme côté client.
// Il est la source unique de la liste des permissions : l'écran « Ce que Twichify va demander » (/auth/connexion)
// en est déduit, donc ajouter une permission à TWITCH_SCOPE_LIST la fait apparaître automatiquement sur cet écran.

export const OPENID_SCOPE = "openid";
export const EMAIL_SCOPE = "user:read:email";
export const FOLLOWERS_SCOPE = "moderator:read:followers";
export const MODERATORS_SCOPE = "moderation:read";
export const VIPS_SCOPE = "channel:read:vips";
export const EDITORS_SCOPE = "channel:read:editors";
export const SUBSCRIPTIONS_SCOPE = "channel:read:subscriptions";
export const BITS_SCOPE = "bits:read";
// Liste des spectateurs connectés au chat de sa propre chaîne : lue à la demande pour détecter les bots (lib/twitch-chatters).
export const CHATTERS_SCOPE = "moderator:read:chatters";

// Toutes en lecture seule, sur la propre chaîne de l'utilisateur.
export const TWITCH_SCOPE_LIST = [
  OPENID_SCOPE,
  EMAIL_SCOPE,
  FOLLOWERS_SCOPE,
  MODERATORS_SCOPE,
  VIPS_SCOPE,
  EDITORS_SCOPE,
  SUBSCRIPTIONS_SCOPE,
  BITS_SCOPE,
  CHATTERS_SCOPE,
];

export const TWITCH_LOGIN_SCOPES = TWITCH_SCOPE_LIST.join(" ");

export type ScopeGroup = "identity" | "stats";

export type ScopeExplanation = {
  group: ScopeGroup;
  title: string;
  why: string;
};

export const SCOPE_GROUP_LABELS: Record<ScopeGroup, { title: string; description: string }> = {
  identity: {
    title: "Ton identité",
    description: "Pour te connecter et créer ton compte Twichify.",
  },
  stats: {
    title: "Les statistiques de ta chaîne (lecture seule)",
    description: "Pour afficher les pages Statistiques Twitch de ton tableau de bord.",
  },
};

export const SCOPE_EXPLANATIONS: Record<string, ScopeExplanation> = {
  [OPENID_SCOPE]: {
    group: "identity",
    title: "T'identifier",
    why: "Savoir qui tu es, sans jamais voir ton mot de passe Twitch.",
  },
  [EMAIL_SCOPE]: {
    group: "identity",
    title: "Lire ton adresse e-mail",
    why: "Créer ton compte Twichify et l'afficher dans ton tableau de bord.",
  },
  [FOLLOWERS_SCOPE]: {
    group: "stats",
    title: "Lire tes followers",
    why: "Afficher ton nombre de followers, les nouveaux et le graphique de leur évolution.",
  },
  [MODERATORS_SCOPE]: {
    group: "stats",
    title: "Lire tes modérateurs",
    why: "Afficher la liste de ton équipe de modération.",
  },
  [VIPS_SCOPE]: {
    group: "stats",
    title: "Lire tes VIPs",
    why: "Afficher la liste de tes VIPs.",
  },
  [EDITORS_SCOPE]: {
    group: "stats",
    title: "Lire tes éditeurs",
    why: "Afficher la liste des personnes qui peuvent gérer ta chaîne.",
  },
  [SUBSCRIPTIONS_SCOPE]: {
    group: "stats",
    title: "Lire tes abonnés",
    why: "Afficher ton nombre d'abonnés et leur répartition (chaînes affiliées ou partenaires).",
  },
  [BITS_SCOPE]: {
    group: "stats",
    title: "Lire le classement des bits",
    why: "Afficher qui a le plus encouragé ta chaîne avec des bits ce mois-ci.",
  },
  [CHATTERS_SCOPE]: {
    group: "stats",
    title: "Lire les spectateurs connectés au chat",
    why: "Repérer les bots de ton chat quand tu cliques sur « Détecter ».",
  },
};

/**
 * Explication d'une permission. Une permission sans explication n'est jamais cachée : elle apparaît avec un texte
 * générique, pour que l'écran de consentement reste complet même si quelqu'un oublie de le mettre à jour.
 */
export function explainScope(scope: string): ScopeExplanation {
  return SCOPE_EXPLANATIONS[scope] ?? { group: "stats", title: scope, why: "Autre permission, en lecture seule." };
}
