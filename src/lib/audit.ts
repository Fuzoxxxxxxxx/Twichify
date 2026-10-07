import mongoose from "mongoose";
import AuditLog from "@/models/AuditLog";

export type AuditAction =
  | "banner.update"
  | "role.change"
  | "user.delete"
  | "incident.create"
  | "incident.update"
  | "incident.delete";

type AuditEntry = {
  actor: { _id: unknown; name?: string | null; role?: string | null };
  action: AuditAction;
  target?: { id?: string; name?: string | null };
  details?: string;
};

/**
 * Enregistre une action sensible. Ne lève jamais d'erreur : un échec du
 * journal ne doit pas bloquer l'action principale.
 */
export async function logAudit({ actor, action, target, details }: AuditEntry) {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    await AuditLog.create({
      actorId: String(actor._id),
      actorName: actor.name || "Inconnu",
      actorRole: actor.role || "user",
      action,
      targetId: target?.id ?? null,
      targetName: target?.name ?? null,
      details: details ?? "",
    });
  } catch (error) {
    console.error("Erreur journal d'audit:", error);
  }
}
