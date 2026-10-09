import mongoose from "mongoose";
import SiteSettings from "@/models/SiteSettings";
import type { IncidentImpact } from "@/lib/incidents";

/**
 * Publication d'un incident de la page de statut dans la bannière globale du site.
 *
 * - La bannière est un document unique (`SiteSettings`, key = "global") partagé avec l'espace propriétaire.
 * - Une annonce rédigée à la main (sans `incidentId`) n'est jamais écrasée : l'incident ne s'y substitue pas.
 * - Une bannière issue d'un incident est retirée automatiquement quand l'incident est résolu ou supprimé.
 */

const MAX_MESSAGE = 200; // limite du modèle SiteSettings
const SUFFIX = " Détails sur la page de statut.";

type BannerLevel = "info" | "warning" | "critical";

// Impact → niveau de la bannière. « critical » n'est pas fermable par les visiteurs : réservé à l'impact critique.
const LEVEL_BY_IMPACT: Record<IncidentImpact, BannerLevel> = {
  none: "info",
  minor: "warning",
  major: "warning",
  critical: "critical",
};

type StoredBanner = {
  enabled?: boolean;
  message?: string;
  level?: string;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  incidentId?: string | null;
};

async function connect() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }
}

/** Annonce actuellement visible par les visiteurs (activée et dans sa plage de programmation). */
function isLive(banner: StoredBanner | undefined, nowMs: number): boolean {
  if (!banner?.enabled || !banner.message) return false;
  const start = banner.startsAt ? new Date(banner.startsAt).getTime() : 0;
  const end = banner.expiresAt ? new Date(banner.expiresAt).getTime() : Infinity;
  return nowMs >= start && nowMs < end;
}

function buildMessage(title: string): string {
  const room = MAX_MESSAGE - SUFFIX.length - "Incident : ".length;
  const clipped = title.length > room ? `${title.slice(0, room - 1).trimEnd()}…` : title;
  return `Incident : ${clipped}.${SUFFIX}`.slice(0, MAX_MESSAGE);
}

export type BannerResult = { applied: boolean; note?: string };

/** Publie (ou met à jour) la bannière d'un incident. Ne remplace jamais une annonce manuelle active. */
export async function applyIncidentBanner(incident: {
  id: string;
  title: string;
  impact: IncidentImpact;
}): Promise<BannerResult> {
  await connect();

  const settings = await SiteSettings.findOne({ key: "global" }).lean<{ banner?: StoredBanner }>();
  const current = settings?.banner;

  if (isLive(current, Date.now()) && !current?.incidentId) {
    return {
      applied: false,
      note: "Une annonce manuelle est déjà affichée (espace propriétaire) : elle n'a pas été remplacée.",
    };
  }

  const message = buildMessage(incident.title);
  const level = LEVEL_BY_IMPACT[incident.impact] ?? "warning";

  // Déjà identique : on ne touche pas à `updatedAt`, pour ne pas ré-afficher la bannière aux visiteurs qui l'ont fermée.
  if (
    current?.enabled &&
    current.incidentId === incident.id &&
    current.message === message &&
    current.level === level &&
    !current.startsAt &&
    !current.expiresAt
  ) {
    return { applied: true };
  }

  await SiteSettings.findOneAndUpdate(
    { key: "global" },
    {
      $set: {
        "banner.enabled": true,
        "banner.message": message,
        "banner.level": level,
        "banner.startsAt": null,
        "banner.expiresAt": null,
        "banner.updatedAt": new Date(),
        "banner.incidentId": incident.id,
      },
    },
    { upsert: true }
  );

  return { applied: true };
}

/** Retire la bannière si elle appartient à cet incident. Sans effet sur une annonce manuelle ou d'un autre incident. */
export async function clearIncidentBanner(incidentId: string): Promise<boolean> {
  await connect();

  const result = await SiteSettings.updateOne(
    { key: "global", "banner.incidentId": incidentId },
    {
      $set: {
        "banner.enabled": false,
        "banner.updatedAt": new Date(),
        "banner.incidentId": null,
      },
    }
  );

  return result.modifiedCount > 0;
}
