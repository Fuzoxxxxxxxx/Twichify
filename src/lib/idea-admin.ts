/**
 * Limites partagées de la gestion des idées par le staff (API et page admin).
 * Sans import serveur : utilisable côté client.
 */

/** Longueur maximale d'une réponse officielle (publique). */
export const IDEA_RESPONSE_MAX = 1000;

/** Longueur maximale d'une note interne (visible du staff uniquement). */
export const IDEA_NOTE_MAX = 500;

/** Nombre maximal de notes internes par idée. */
export const IDEA_NOTES_LIMIT = 50;

/** Nombre d'événements conservés dans l'historique d'une idée (les plus anciens sont écartés). */
export const IDEA_HISTORY_LIMIT = 30;
