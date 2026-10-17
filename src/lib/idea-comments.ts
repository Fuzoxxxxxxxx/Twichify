/**
 * Limites partagées des commentaires publics sur les idées (API et page publique).
 * Sans import serveur : utilisable côté client.
 */

/** Longueur maximale d'un commentaire. */
export const COMMENT_MAX = 500;

/** Délai minimal entre deux commentaires d'un même utilisateur (anti-spam). */
export const COMMENT_COOLDOWN_MS = 15_000;

/** Nombre maximal de commentaires par utilisateur sur 24 h glissantes. */
export const COMMENTS_PER_DAY = 40;

/** Nombre de commentaires affichés par idée (les plus récents). */
export const COMMENTS_SHOWN = 100;
