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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const FaqArticle = models.FaqArticle || model("FaqArticle", FaqArticleSchema);
export default FaqArticle;
