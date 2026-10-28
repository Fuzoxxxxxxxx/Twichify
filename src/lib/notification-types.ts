// Constantes partagées entre le serveur et l'interface (aucun import serveur ici : ce fichier est utilisable côté client).

export const NOTIFICATION_TYPES = [
  "ticket_reply", // le staff a répondu à ton ticket
  "ticket_status", // le statut de ton ticket a changé
  "ticket_user_reply", // (staff) le demandeur a répondu sur un ticket que tu as pris en charge
  "idea_status", // le statut de ton idée a changé
  "idea_response", // l'équipe a répondu à ton idée
  "idea_comment", // quelqu'un a commenté ton idée
  "announcement", // annonce envoyée par l'équipe (à tous ou à un groupe)
  "ticket_stale", // (staff) un ticket attend une réponse depuis trop longtemps
  "ticket_feedback", // (staff) le demandeur indique que son problème n'est pas réglé
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// Forme renvoyée par l'API (jamais l'identifiant du destinataire).
export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
}

// Durée de conservation : les notifications plus anciennes sont supprimées automatiquement (index TTL).
export const NOTIFICATION_TTL_DAYS = 90;

// Nombre maximum de notifications renvoyées en une fois.
export const NOTIFICATION_MAX_LIMIT = 100;
export const NOTIFICATION_DEFAULT_LIMIT = 30;
