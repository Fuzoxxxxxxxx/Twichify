import { Schema, model, models } from "mongoose";

// Historique des annonces envoyées par le staff (une ligne par envoi, pas par destinataire).
const AnnouncementSchema = new Schema({
  title: { type: String, required: true },
  body: { type: String, default: "" },
  href: { type: String, default: null },
  audience: { type: String, required: true },
  recipientCount: { type: Number, default: 0 },
  sentBy: {
    userId: { type: String, required: true },
    name: { type: String, default: "Inconnu" },
    role: { type: String, default: "user" },
  },
  createdAt: { type: Date, default: Date.now },
});

AnnouncementSchema.index({ createdAt: -1 });

const Announcement = models.Announcement || model("Announcement", AnnouncementSchema);
export default Announcement;
