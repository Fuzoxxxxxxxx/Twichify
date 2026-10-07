import { Schema, model, models } from "mongoose";

/**
 * Statistiques de chat (optionnelles) : une « session » = une période d'activité du chat, séparée de la
 * suivante par au moins 30 minutes de silence.
 *
 * On ne stocke JAMAIS le texte des messages : seulement des compteurs agrégés (messages par minute,
 * messages par spectateur, emotes et commandes les plus utilisées). Les clés sont courtes pour limiter la taille :
 *   chatters : i = identifiant Twitch, l = login, n = pseudo affiché, c = nombre de messages
 *   emotes / commands : k = nom, c = nombre d'utilisations
 *   activity : t = minute (époque / 60 000), n = messages sur cette minute
 */
const ChatterSchema = new Schema({ i: String, l: String, n: String, c: Number }, { _id: false });
const CountedSchema = new Schema({ k: String, c: Number }, { _id: false });
const ActivitySchema = new Schema({ t: Number, n: Number }, { _id: false });

const ChatSessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startedAt: { type: Date, required: true },
    lastAt: { type: Date, required: true },

    messages: { type: Number, default: 0 }, // conversation (hors bots et commandes)
    botMessages: { type: Number, default: 0 },
    commandMessages: { type: Number, default: 0 },
    firstTimers: { type: Number, default: 0 },
    emoteUses: { type: Number, default: 0 },
    uniqueChatters: { type: Number, default: 0 },

    chatters: { type: [ChatterSchema], default: [] },
    emotes: { type: [CountedSchema], default: [] },
    commands: { type: [CountedSchema], default: [] },
    activity: { type: [ActivitySchema], default: [] },
  },
  { timestamps: false }
);

// Liste des sessions d'un utilisateur, la plus récente d'abord.
ChatSessionSchema.index({ user: 1, startedAt: -1 });
// Conservation limitée à 90 jours après la dernière activité de la session.
ChatSessionSchema.index({ lastAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

const ChatSession = models.ChatSession || model("ChatSession", ChatSessionSchema);
export default ChatSession;
