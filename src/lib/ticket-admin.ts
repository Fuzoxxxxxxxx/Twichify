/**
 * Limites partagées des notes internes et des transferts de tickets (API et page admin).
 * Sans import serveur : utilisable côté client.
 */

/** Longueur maximale d'une note interne. */
export const TICKET_NOTE_MAX = 1000;

/** Nombre maximal de notes internes par ticket. */
export const TICKET_NOTES_LIMIT = 50;

/** Longueur maximale du motif d'un transfert (enregistré en note interne, jamais montré au demandeur). */
export const TRANSFER_REASON_MAX = 300;
