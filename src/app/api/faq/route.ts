import { NextResponse } from "next/server";
import mongoose from "mongoose";
import FaqArticle from "@/models/FaqArticle";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const articles = await FaqArticle.find().sort({ category: 1, order: 1 });
    return NextResponse.json({ articles });
  } catch (error) {
    console.error("Erreur GET FAQ:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}