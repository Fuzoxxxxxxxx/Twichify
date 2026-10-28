import { Schema, model, models } from "mongoose";
import { NOTIFICATION_TYPES, NOTIFICATION_TTL_DAYS } from "@/lib/notification-types";

// Une notification appartient à un seul utilisateur (userId = _id du compte, en string, comme pour les tickets).
const NotificationSchema = new Schema({
  userId: { type: String, required: true },
  type: { type: String, enum: NOTIFICATION_TYPES, required: true },
  title: { type: String, required: true },
  body: { type: String, default: "" },
  href: { type: String, default: null },
  readAt: { type: Date, default: null },
  // Regroupe les évènements répétitifs (plusieurs réponses d'affilée sur un même ticket) en une seule notification
  // non lue : tant qu'elle n'est pas lue, une nouvelle réponse la met à jour au lieu d'en créer une autre.
  dedupeKey: { type: String, default: null },
  // Index TTL : suppression automatique après NOTIFICATION_TTL_DAYS jours.
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * NOTIFICATION_TTL_DAYS },
});

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, readAt: 1 });

const NotificationModel = models.Notification || model("Notification", NotificationSchema);
export default NotificationModel;
