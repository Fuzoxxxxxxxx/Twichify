import mongoose from "mongoose";
import User from "@/models/User";
import NotificationModel from "@/models/Notification";
import { ALL_ROLES, isStaffRole } from "@/lib/roles";
import type { AnnouncementAudience } from "@/lib/announcement-types";

const DAY_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 1000;

async function ensureDb() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }
}

/**
 * Filtre Mongo d'un groupe de destinataires.
 * - « nouveaux de la semaine » se déduit de l'identifiant du compte (un ObjectId contient sa date de création : le modèle n'a pas de champ createdAt).
 * - « widget jamais détecté » : ni le widget musique ni le widget chat n'ont jamais été chargés (champ absent ou vide).
 */
export function audienceFilter(audience: AnnouncementAudience, now: number = Date.now()): Record<string, unknown> {
  switch (audience) {
    case "new_week":
      return { _id: { $gte: mongoose.Types.ObjectId.createFromTime(Math.floor((now - 7 * DAY_MS) / 1000)) } };
    case "spotify":
      return { spotifyRefreshToken: { $nin: [null, ""] } };
    case "no_spotify":
      return { $or: [{ spotifyRefreshToken: null }, { spotifyRefreshToken: "" }] };
    case "no_widget":
      return { "widgetSeen.musicAt": null, "widgetSeen.chatAt": null };
    case "staff":
      return { role: { $in: ALL_ROLES.filter((r) => isStaffRole(r)) } };
    case "all":
    default:
      return {};
  }
}

export async function countAudience(audience: AnnouncementAudience): Promise<number> {
  await ensureDb();
  return User.countDocuments(audienceFilter(audience));
}

/**
 * Crée une notification « annonce » pour chaque destinataire du groupe, par lots.
 * Renvoie le nombre de destinataires réellement touchés.
 */
export async function sendAnnouncementNotifications(
  audience: AnnouncementAudience,
  content: { title: string; body: string; href: string | null }
): Promise<number> {
  await ensureDb();
  const users = await User.find(audienceFilter(audience)).select("_id").lean<{ _id: unknown }[]>();
  const createdAt = new Date();

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE).map((u) => ({
      userId: String(u._id),
      type: "announcement",
      title: content.title,
      body: content.body,
      href: content.href,
      readAt: null,
      createdAt,
    }));
    await NotificationModel.insertMany(batch, { ordered: false });
  }

  return users.length;
}
