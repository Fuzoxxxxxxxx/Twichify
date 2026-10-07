import { Schema, model, models } from "mongoose";

// Journal des actions sensibles du staff (changement de rôle, suppression de compte, annonce…).
const AuditLogSchema = new Schema(
  {
    actorId: { type: String, required: true },
    actorName: { type: String, default: "Inconnu" },
    actorRole: { type: String, default: "user" },
    action: { type: String, required: true }, // ex. "role.change"
    targetId: { type: String, default: null },
    targetName: { type: String, default: null },
    details: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);
// Conservation limitée à 180 jours.
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

const AuditLog = models.AuditLog || model("AuditLog", AuditLogSchema);
export default AuditLog;
