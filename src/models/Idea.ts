import { Schema, model, models } from "mongoose";

// Signature d'un membre du staff (qui a répondu, écrit une note, changé un statut).
// Jamais renvoyée par l'API publique : voir les projections de GET /api/ideas.
const StaffRef = {
  userId: { type: String, default: null },
  name: { type: String, default: null },
};

// Note interne : visible du staff uniquement, jamais de l'auteur de l'idée ni du public.
const NoteSchema = new Schema({
  text: { type: String, required: true },
  by: StaffRef,
  createdAt: { type: Date, default: Date.now },
});

// Historique des décisions du staff (les plus anciennes sont écartées au-delà de la limite).
const HistorySchema = new Schema(
  {
    type: { type: String, enum: ["status", "response", "response_removed"], required: true },
    from: { type: String, default: null }, // ancien statut (type « status »)
    to: { type: String, default: null }, // nouveau statut (type « status »)
    by: StaffRef,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const IdeaSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ["general", "support", "feature", "ui_ux"],
    default: "general",
  },
  status: {
    type: String,
    enum: ["en_etude", "planifie", "en_cours", "termine", "rejete"],
    default: "en_etude",
  },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },

  // Chaque tableau contient les _id (string) des utilisateurs ayant voté.
  // Un utilisateur ne peut apparaître que dans un seul des deux à la fois.
  upvotes: { type: [String], default: [] },
  downvotes: { type: [String], default: [] },

  officialResponse: {
    content: { type: String, default: null },
    updatedAt: { type: Date, default: null },
    by: StaffRef, // privé : qui a rédigé la réponse
  },

  // Espace de travail du staff (privé).
  internalNotes: { type: [NoteSchema], default: [] },
  history: { type: [HistorySchema], default: [] },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Idea = models.Idea || model("Idea", IdeaSchema);
export default Idea;
