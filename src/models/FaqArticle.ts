import mongoose, { Schema, model, models } from "mongoose";
import { FAQ_CATEGORY_KEYS } from "@/lib/faq-categories";

const FaqArticleSchema = new Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  category: {
    type: String,
    // Liste partagée : voir lib/faq-categories.ts
    enum: [...FAQ_CATEGORY_KEYS],
    default: "autre",
  },
  order: { type: Number, default: 0 },
  // Retours des lecteurs (« Cet article vous a-t-il aidé ? ») : de simples compteurs anonymes, jamais liés à un compte.
  helpfulYes: { type: Number, default: 0 },
  helpfulNo: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// En développement, le rechargement à chaud peut garder en mémoire une ancienne version du modèle (sans les compteurs de retours) :
// Mongoose ignore alors en silence les écritures sur des champs qu'il ne connaît pas, et les votes n'apparaissent jamais.
// On recompile le modèle s'il est périmé, ce qui évite d'avoir à redémarrer le serveur.
if (models.FaqArticle && !models.FaqArticle.schema.path("helpfulYes")) mongoose.deleteModel("FaqArticle");

const FaqArticle = models.FaqArticle || model("FaqArticle", FaqArticleSchema);
export default FaqArticle;
