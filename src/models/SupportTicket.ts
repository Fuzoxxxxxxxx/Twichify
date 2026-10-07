import mongoose, { Schema, model, models } from "mongoose";

const MessageSchema = new Schema({
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  authorRole: {
    type: String,
    enum: ["user", "helper", "moderator", "admin", "co_creator", "creator", "system"],
    required: true,
  },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const SupportTicketSchema = new Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  subject: { type: String, required: true },
  category: {
    type: String,
    enum: ["spotify", "obs", "api", "compte", "autre"],
    default: "autre",
  },
  status: {
    type: String,
    enum: ["en_attente", "en_cours", "resolu", "ferme"],
    default: "en_attente",
  },
  
  // Prise en charge : un seul membre du staff actif sur le ticket à la fois
  assignedTo: {
    userId: { type: String, default: null },
    userName: { type: String, default: null },
    role: { type: String, default: null },
    assignedAt: { type: Date, default: null },
  },
  // Indicateur « en train d'écrire » : un seul auteur à la fois (utilisateur ou staff assigné),
  // rafraîchi par la route /typing et considéré périmé après quelques secondes sans ping.
  typing: {
    userId: { type: String, default: null },
    userName: { type: String, default: null },
    role: { type: String, default: null },
    at: { type: Date, default: null },
  },
  messages: [MessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const SupportTicket = models.SupportTicket || model("SupportTicket", SupportTicketSchema);
export default SupportTicket;