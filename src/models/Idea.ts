import mongoose, { Schema, model, models } from "mongoose";

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
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Idea = models.Idea || model("Idea", IdeaSchema);
export default Idea;
