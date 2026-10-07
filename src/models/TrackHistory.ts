import { Schema, model, models, Types } from "mongoose";

// Un document = une écoute d'un morceau (créé au changement de titre détecté
// par le poll du widget, puis msPlayed incrémenté tant que ce titre reste actif).
const TrackHistorySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    artist: { type: String, required: true },
    albumImageUrl: { type: String, default: null },
    playedAt: { type: Date, default: Date.now },
    msPlayed: { type: Number, default: 0 },
  },
  { timestamps: false }
);

// Liste récente d'un utilisateur, la plus fréquente.
TrackHistorySchema.index({ user: 1, playedAt: -1 });
// Regroupement top titres/artistes sur une période.
TrackHistorySchema.index({ user: 1, title: 1, artist: 1 });
// Conservation limitée à 180 jours (comme le journal d'audit).
TrackHistorySchema.index({ playedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

const TrackHistory = models.TrackHistory || model("TrackHistory", TrackHistorySchema);
export default TrackHistory;

export type TrackHistoryDoc = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  title: string;
  artist: string;
  albumImageUrl: string | null;
  playedAt: Date;
  msPlayed: number;
};
