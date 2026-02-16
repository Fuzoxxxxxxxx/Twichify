import mongoose, { Schema, model, models } from "mongoose";

// On définit la structure de l'utilisateur
const UserSchema = new Schema({
  name: { type: String },
  email: { type: String, unique: true },
  image: { type: String },
  // Champs spécifiques pour Spotify
  spotifyClientId: { type: String, default: null },
  spotifyClientSecret: { type: String, default: null },
  spotifyRefreshToken: { type: String, default: null },
  widgetSettings: {
    backgroundColor: { type: String, default: "#000000cc" },
    textColor: { type: String, default: "#ffffff" },
    accentColor: { type: String, default: "#1DB954" }, // Vert Spotify
    borderRadius: { type: String, default: "1rem" },
    showProgressBar: { type: Boolean, default: true },
  }
});

// Cette ligne est cruciale : elle vérifie si le modèle existe déjà 
// pour éviter l'erreur "OverwriteModelError"
const User = models.User || model("User", UserSchema);

export default User;