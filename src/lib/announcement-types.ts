// Constantes et types partagés entre le serveur et l'interface pour les annonces ciblées
// (aucun import serveur ici : ce fichier est utilisable côté client).

export const ANNOUNCEMENT_AUDIENCES = [
  { id: "all", label: "Tous les utilisateurs", description: "Tous les comptes Twichify." },
  { id: "new_week", label: "Nouveaux de la semaine", description: "Comptes créés ces 7 derniers jours." },
  { id: "spotify", label: "Spotify connecté", description: "Ceux qui ont lié leur compte Spotify." },
  { id: "no_spotify", label: "Spotify non connecté", description: "Ceux qui n'ont pas encore lié Spotify." },
  { id: "no_widget", label: "Widget jamais détecté", description: "Aucun de leurs widgets n'a encore été chargé dans OBS." },
  { id: "staff", label: "Équipe", description: "Les membres du staff (tout rôle autre qu'utilisateur)." },
] as const;

export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number]["id"];

export const isAnnouncementAudience = (value: unknown): value is AnnouncementAudience =>
  ANNOUNCEMENT_AUDIENCES.some((a) => a.id === value);

export const audienceLabel = (id: string) => ANNOUNCEMENT_AUDIENCES.find((a) => a.id === id)?.label ?? id;

export const ANNOUNCEMENT_TITLE_MAX = 80;
export const ANNOUNCEMENT_BODY_MAX = 300;
export const ANNOUNCEMENT_HREF_MAX = 200;

// Un envoi identique (même groupe, même titre, même message) est refusé pendant cette durée : protège d'un double clic.
export const ANNOUNCEMENT_DUPLICATE_WINDOW_MINUTES = 10;

/** Lien interne uniquement (« /help », « /changelog#v3.15.0 ») : jamais d'adresse externe, pas de « // » ni d'espaces. */
export function isInternalPath(href: string): boolean {
  return /^\/(?!\/)[^\s\\]*$/.test(href);
}

// Forme renvoyée par l'API pour l'historique des envois.
export interface AnnouncementRecord {
  id: string;
  title: string;
  body: string;
  href: string | null;
  audience: string;
  recipientCount: number;
  sentBy: { name: string; role: string };
  createdAt: string;
}
