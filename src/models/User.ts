import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
  name: { type: String },
  email: { type: String, unique: true },
  image: { type: String },
  
  // Spotify API
  spotifyClientId: { type: String, default: null },
  spotifyClientSecret: { type: String, default: null },
  spotifyRefreshToken: { type: String, default: null },

  // Widget Settings
  widgetSettings: {
    layout: { type: String, default: "default" },
    fontFamily: { type: String, default: "font-sans" },
    accentColor: { type: String, default: "#22c55e" },
    borderRadius: { type: String, default: "20" },
    bgOpacity: { type: String, default: "60" },
    blurAmount: { type: String, default: "10" }, 
    
    // Options d'affichage (Booleans)
    showCover: { type: Boolean, default: true },
    showArtist: { type: Boolean, default: true },
    showProgress: { type: Boolean, default: true },
    showTimestamp: { type: Boolean, default: true },
    enableGlow: { type: Boolean, default: true },
    isRotating: { type: Boolean, default: false },
    enableBlurBg: { type: Boolean, default: true },
  }
});

const User = models.User || model("User", UserSchema);
export default User;