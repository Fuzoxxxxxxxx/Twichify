import { Schema, model, models } from "mongoose";

// Réglages globaux du site : un seul document (key = "global").
const SiteSettingsSchema = new Schema(
  {
    key: { type: String, default: "global", unique: true },
    banner: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: "", maxlength: 200 },
      level: { type: String, enum: ["info", "warning", "critical"], default: "info" },
      // Programmation : l'annonce n'est visible qu'entre startsAt et expiresAt (null = sans limite).
      startsAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
      updatedAt: { type: Date, default: null },
      // Renseigné quand l'annonce a été publiée automatiquement depuis un incident de la page de statut
      // (elle est alors retirée à la résolution de l'incident). Null pour une annonce rédigée à la main.
      incidentId: { type: String, default: null },
    },
  },
  { timestamps: false }
);

const SiteSettings = models.SiteSettings || model("SiteSettings", SiteSettingsSchema);
export default SiteSettings;
