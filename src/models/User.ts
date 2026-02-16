import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
  name: { type: String },
  email: { type: String, unique: true },
  image: { type: String },
  
  // Spotify API
  spotifyClientId: { type: String, default: null },
  spotifyClientSecret: { type: String, default: null },
  spotifyRefreshToken: { type: String, default: null },

  // Widget Settings (Doit correspondre aux noms dans Dashboard/page.tsx)
  widgetSettings: {
    accentColor: { type: String, default: "#22c55e" },
    borderRadius: { type: String, default: "16" }, // On stocke le chiffre en string pour plus de souplesse
    bgOpacity: { type: String, default: "80" },   // On stocke l'opacité (0 à 100)
  }
});

const User = models.User || model("User", UserSchema);
export default User;