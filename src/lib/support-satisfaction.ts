// Constantes partagées de l'enquête de satisfaction du support (utilisables côté client comme côté serveur).

export const SATISFACTION_COMMENT_MAX = 500;

export type SatisfactionRating = "yes" | "no";

export interface TicketSatisfaction {
  rating?: SatisfactionRating;
  comment?: string;
  ratedAt?: string | null;
}
