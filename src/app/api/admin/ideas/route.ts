import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Idea from "@/models/Idea";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/roles";

export const dynamic = "force-dynamic";

// GET : liste complète des idées pour la modération (permission manageIdeas).
// Contrairement à GET /api/ideas (publique), elle inclut l'espace de travail du staff :
// notes internes, historique et auteur de la réponse officielle. Le tri est fait côté page.
export async function GET() {
  const staff = await requirePermission(PERMISSIONS.MANAGE_IDEAS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const ideas = await Idea.find({}).sort({ createdAt: -1 }).lean();

    const withScore = ideas.map((idea: any) => ({
      ...idea,
      score: (idea.upvotes?.length || 0) - (idea.downvotes?.length || 0),
    }));

    return NextResponse.json({ ideas: withScore });
  } catch (error) {
    console.error("Erreur GET admin ideas:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
