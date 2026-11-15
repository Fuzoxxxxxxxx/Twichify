import { NextResponse } from "next/server";
import mongoose from "mongoose";
import FaqArticle from "@/models/FaqArticle";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/roles";

export const dynamic = "force-dynamic";

// GET : articles de la FAQ.
// - Public (page d'aide) : sans les compteurs de retours, qui ne regardent que l'équipe.
// - `?stats=1` : avec les compteurs « utile / pas utile », réservé à la permission manageFaq (page admin FAQ).
export async function GET(req: Request) {
  try {
    const withStats = new URL(req.url).searchParams.get("stats") === "1";
    if (withStats) {
      const staff = await requirePermission(PERMISSIONS.MANAGE_FAQ);
      if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const query = FaqArticle.find().sort({ category: 1, order: 1 });
    const articles = await (withStats ? query : query.select("-helpfulYes -helpfulNo"));
    return NextResponse.json({ articles });
  } catch (error) {
    console.error("Erreur GET FAQ:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
