import { Schema, model, models } from "mongoose";

// Commentaire public sur une idée (collection séparée : une idée populaire peut en recevoir beaucoup).
// Contenu en texte brut uniquement ; modération par l'auteur et par le staff (permission manageIdeas).
const IdeaCommentSchema = new Schema({
  ideaId: { type: String, required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  // Rôle au moment de l'écriture : sert uniquement au badge « Équipe » sur les commentaires du staff.
  authorRole: { type: String, default: "user" },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Lecture par idée dans l'ordre chronologique, et décompte des commentaires récents d'un auteur (anti-spam).
IdeaCommentSchema.index({ ideaId: 1, createdAt: 1 });
IdeaCommentSchema.index({ authorId: 1, createdAt: -1 });

const IdeaComment = models.IdeaComment || model("IdeaComment", IdeaCommentSchema);
export default IdeaComment;
