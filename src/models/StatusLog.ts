import mongoose, { Schema, model, models } from "mongoose";

const StatusLogSchema = new Schema(
  {
    service: { type: String, required: true }, // "spotify", "twitch", "database"
    status: { type: String, enum: ["operational", "degraded", "down"], required: true },
    latencyMs: { type: Number },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);
StatusLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 });

export default models.StatusLog || model("StatusLog", StatusLogSchema);