/**
 * Constantes et validation partagées des incidents de la page de statut.
 * Aucun import serveur ici : ce fichier est utilisable côté client (page admin) comme côté API.
 */

export const INCIDENT_SERVICES = [
  "Spotify API",
  "Twitch API",
  "Overlays Server",
  "BetterTTV",
  "7TV",
  "FrankerFaceZ",
  "Plusieurs services",
] as const;

export const INCIDENT_STATUSES = ["investigating", "identified", "monitoring", "resolved"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_IMPACTS = ["none", "minor", "major", "critical"] as const;
export type IncidentImpact = (typeof INCIDENT_IMPACTS)[number];

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  investigating: "En analyse",
  identified: "Identifié",
  monitoring: "Sous surveillance",
  resolved: "Résolu",
};

export const IMPACT_LABELS: Record<IncidentImpact, string> = {
  none: "Sans impact",
  minor: "Impact mineur",
  major: "Impact majeur",
  critical: "Impact critique",
};

export const TITLE_MAX = 100;
export const MESSAGE_MAX = 1000;

/** Modèles de messages : l'admin les complète, ils évitent de rédiger dans l'urgence. */
export const MESSAGE_TEMPLATES: { label: string; status: IncidentStatus; text: string }[] = [
  {
    label: "Nous enquêtons",
    status: "investigating",
    text: "Nous rencontrons un problème et enquêtons activement. Les widgets et fonctionnalités liés à ce service peuvent être indisponibles ou instables.",
  },
  {
    label: "Cause identifiée",
    status: "identified",
    text: "La cause du problème a été identifiée et un correctif est en cours. Prochaine mise à jour dans 30 minutes ou dès que la situation évolue.",
  },
  {
    label: "Surveillance",
    status: "monitoring",
    text: "Un correctif a été appliqué. Nous surveillons la situation pour confirmer le retour à la normale.",
  },
  {
    label: "Résolu",
    status: "resolved",
    text: "L'incident est résolu et le service fonctionne normalement. Merci de votre patience.",
  },
];

export const isIncidentStatus = (v: unknown): v is IncidentStatus =>
  typeof v === "string" && (INCIDENT_STATUSES as readonly string[]).includes(v);

export const isIncidentImpact = (v: unknown): v is IncidentImpact =>
  typeof v === "string" && (INCIDENT_IMPACTS as readonly string[]).includes(v);

export const isIncidentService = (v: unknown): v is (typeof INCIDENT_SERVICES)[number] =>
  typeof v === "string" && (INCIDENT_SERVICES as readonly string[]).includes(v);

/** Texte brut nettoyé : trim, espaces de fin de ligne retirés, longueur bornée. */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim().slice(0, max);
}
