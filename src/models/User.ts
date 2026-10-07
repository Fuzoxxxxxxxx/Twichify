import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
  name: { type: String },
  email: { type: String, unique: true },
  image: { type: String },
  hasAcceptedTerms: { type: Boolean, default: false },
  acceptedTermsAt: { type: Date, default: null },
    // Onboarding : sur le compte plutôt qu'en localStorage, pour survivre à un changement
    // de navigateur ou d'appareil (comme acceptedTermsAt ci-dessus).
    hasSeenWelcome: { type: Boolean, default: false },
    seenChangelogVersion: { type: String, default: null },
  
  // Spotify API
  spotifyClientId: { type: String, default: null },
  spotifyClientSecret: { type: String, default: null },
  spotifyRefreshToken: { type: String, default: null },
  role: { type: String, enum: ["user", "helper", "moderator", "admin", "co_creator", "creator"], default: "user" },

  // Lien des widgets : jeton aléatoire (dans les URL OBS et les commandes bot) à la place de l'_id du compte,
  // régénérable si le lien fuite. widgetLegacyIdDisabled coupe l'ancien lien basé sur l'_id (mis à true à la régénération).
  widgetToken: { type: String },
  widgetLegacyIdDisabled: { type: Boolean, default: false },

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
    position: { type: String, default: "bottom-left" }, // nouveau : le widget musique devient positionnable

    // Fonctionnalités du widget musique
    showEqualizer: { type: Boolean, default: false }, // égaliseur animé
    autoHide: { type: Boolean, default: false }, // n'affiche le widget que quelques secondes à chaque nouveau morceau
    autoHideSeconds: { type: Number, default: 10 },
  },

  // Bot message settings
  botSettings: {
    customMessage: { type: String, default: "Now playing: {artist} - {title}" },
  },

  chatWidgetSettings: {
    theme: { type: String, default: "glass" },
    fontSize: { type: String, default: "14" },
    showBadges: { type: Boolean, default: true },
    hideBots: { type: Boolean, default: false },
    hideCommands: { type: Boolean, default: false },
    animation: { type: String, default: "slide" },
    maxMessages: { type: Number, default: 8 },
    position: { type: String, default: "bottom-left" },
    widgetWidth: { type: Number, default: 380 },

    // Affichage
    showTimestamps: { type: Boolean, default: false },
    showColors: { type: Boolean, default: true },
    compactMode: { type: Boolean, default: false },
    charLimit: { type: Number, default: 0 }, // 0 = illimité

    // Fonctionnalités du widget chat
    messageLifetime: { type: Number, default: 15 }, // secondes avant disparition, 0 = permanent
    ignoredUsers: { type: [String], default: [] }, // pseudos dont les messages sont masqués
    showReplies: { type: Boolean, default: false }, // affiche le message auquel un viewer répond
    highlightFirstMessage: { type: Boolean, default: false }, // met en avant le tout premier message d'un viewer

    // Surbrillance par rôle (couleur personnalisable par rôle)
    roleHighlights: {
      moderator: {
        enabled: { type: Boolean, default: false },
        color: { type: String, default: "#22c55e" },
      },
      subscriber: {
        enabled: { type: Boolean, default: false },
        color: { type: String, default: "#a855f7" },
      },
      vip: {
        enabled: { type: Boolean, default: false },
        color: { type: String, default: "#ec4899" },
      },
      broadcaster: {
        enabled: { type: Boolean, default: false },
        color: { type: String, default: "#ef4444" },
      },
      bot: {
        enabled: { type: Boolean, default: false },
        color: { type: String, default: "#f97316" },
      },
    },

    // Modération : liste de mots à filtrer, et comportement quand un mot est détecté
    // « hide » (défaut) masque tout le message, « censor » ne masque que le(s) mot(s) trouvé(s)
    moderationWords: { type: [String], default: [] },
    moderationMode: { type: String, enum: ["hide", "censor"], default: "hide" },
  },
 canvasSettings: {
  width: { type: Number, default: 1920 },
  height: { type: Number, default: 1080 },
},

  // Statistiques d'écoute (alimentées par le polling du widget musique)
  listeningStats: {
    totalMsListened: { type: Number, default: 0 },
    totalTracksPlayed: { type: Number, default: 0 },
    lastTrack: {
      title: { type: String, default: null },
      artist: { type: String, default: null },
      albumImageUrl: { type: String, default: null },
      playedAt: { type: Date, default: null },
    },
    lastPollAt: { type: Date, default: null },
    lastTrackKey: { type: String, default: null },
  },

  // Statistiques de chat (optionnelles, désactivées par défaut) : quand elles sont actives, le widget chat envoie
  // des compteurs agrégés (jamais le texte des messages) stockés dans ChatSession, 90 jours.
  chatStats: {
    enabled: { type: Boolean, default: false },
    enabledAt: { type: Date, default: null },
  },

});

// Unicité du jeton, uniquement pour les comptes qui en ont un (les autres n'ont pas le champ).
UserSchema.index(
  { widgetToken: 1 },
  { unique: true, partialFilterExpression: { widgetToken: { $type: "string" } } }
);

const User = models.User || model("User", UserSchema);
export default User;