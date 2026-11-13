import { NextResponse } from "next/server";
import mongoose from "mongoose";
import FaqArticle from "@/models/FaqArticle";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/roles";
import { isFaqCategory, faqCategoryLabel } from "@/lib/faq-categories";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_FAQ);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { question, answer, category, order } = await req.json();

    if (!isFaqCategory(category)) {
      return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const article = await FaqArticle.create({ question, answer, category, order: order || 0 });
    await logAudit({
      actor: staff,
      action: "faq.create",
      target: { id: String(article._id), name: String(question).slice(0, 120) },
      details: `Catégorie : ${faqCategoryLabel(category)}`,
    });
    return NextResponse.json({ article });
  } catch (error) {
    console.error("Erreur POST FAQ admin:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}