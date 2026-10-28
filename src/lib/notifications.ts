import mongoose from "mongoose";
import NotificationModel from "@/models/Notification";
import type { NotificationType } from "@/lib/notification-types";

export type NewNotification = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  /** Si une notification NON LUE du même destinataire a déjà cette clé, elle est mise à jour (et remontée en tête) au lieu d'être dupliquée. */
  dedupeKey?: string;
};

/** Raccourcit un texte pour l'aperçu d'une notification (retours à la ligne et espaces multiples aplatis). */
export function snippet(text: string | null | undefined, max = 140): string {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/**
 * Crée une notification. Ne lève jamais d'erreur : une notification manquée ne doit pas faire échouer
 * l'action principale (envoi d'un message, changement de statut…).
 */
export async function notify(n: NewNotification): Promise<void> {
  try {
    if (!n.userId) return;
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const data = {
      title: n.title.slice(0, 160),
      body: (n.body ?? "").slice(0, 300),
      href: n.href ?? null,
    };

    if (n.dedupeKey) {
      await NotificationModel.findOneAndUpdate(
        { userId: n.userId, dedupeKey: n.dedupeKey, readAt: null },
        { $set: { ...data, createdAt: new Date() }, $setOnInsert: { type: n.type } },
        { upsert: true }
      );
      return;
    }

    await NotificationModel.create({ userId: n.userId, type: n.type, ...data });
  } catch (error) {
    console.error("Erreur création notification:", error);
  }
}
