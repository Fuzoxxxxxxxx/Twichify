import { NextResponse } from "next/server";
import mongoose from "mongoose";
import FaqArticle from "@/models/FaqArticle";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/roles";
import { isFaqCategory } from "@/lib/faq-categories";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_FAQ);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { id } = await params;
    const { question, answer, category, order } = await req.json();

    // findByIdAndUpdate ne lance pas les validateurs du schéma : on vérifie la catégorie ici.
    if (!isFaqCategory(category)) {
      return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const article = await FaqArticle.findByIdAndUpdate(
      id,
      { question, answer, category, order, updatedAt: new Date() },
      { new: true }
    );

    if (!article) return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
    return NextResponse.json({ article });
  } catch (error) {
    console.error("Erreur PUT FAQ admin:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_FAQ);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { id } = await params;

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    await FaqArticle.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE FAQ admin:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}