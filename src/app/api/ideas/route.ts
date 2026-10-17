import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Idea from "@/models/Idea";
import IdeaComment from "@/models/IdeaComment";
import { getSessionUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = ["general", "support", "feature", "ui_ux"];
const VALID_STATUSES = ["en_etude", "planifie", "en_cours", "termine", "rejete"];

// GET : liste des idées, avec tri (récent/populaire) et filtres optionnels par statut/catégorie.
// Route publique en lecture — n'importe qui peut consulter la boîte à idées.
export async function GET(req: Request) {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") || "popular"; // "popular" | "recent"
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    const query: Record<string, unknown> = {};
    if (status && VALID_STATUSES.includes(status)) query.status = status;
    if (category && VALID_CATEGORIES.includes(category)) query.category = category;

    // Route publique : l'espace de travail du staff (notes internes, historique, auteur de la réponse) n'en sort jamais.
    const ideas = await Idea.find(query)
      .select("-internalNotes -history -officialResponse.by")
      .sort(sort === "recent" ? { createdAt: -1 } : { createdAt: -1 } // tri fin (score) fait ensuite en mémoire
      );

    // Nombre de commentaires par idée (un seul regroupement pour toute la liste)
    const commentCounts = new Map<string, number>(
      (await IdeaComment.aggregate([{ $group: { _id: "$ideaId", n: { $sum: 1 } } }])).map(
        (r: { _id: string; n: number }) => [r._id, r.n] as [string, number]
      )
    );

    const withScore = ideas.map((idea) => ({
      ...idea.toObject(),
      score: (idea.upvotes?.length || 0) - (idea.downvotes?.length || 0),
      commentCount: commentCounts.get(String(idea._id)) ?? 0,
    }));

    if (sort === "popular") {
      withScore.sort((a, b) => b.score - a.score);
    }
    // "recent" reste déjà trié par createdAt desc depuis la requête Mongo.

    return NextResponse.json({ ideas: withScore });
  } catch (error) {
    console.error("Erreur GET ideas:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST : soumission d'une nouvelle idée (utilisateur connecté requis).
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { title, description, category } = await req.json();

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: "Titre et description requis" }, { status: 400 });
    }
    if (title.trim().length > 150) {
      return NextResponse.json({ error: "Titre trop long (150 caractères max)" }, { status: 400 });
    }
    if (description.trim().length > 2000) {
      return NextResponse.json({ error: "Description trop longue (2000 caractères max)" }, { status: 400 });
    }

    const finalCategory = VALID_CATEGORIES.includes(category) ? category : "general";

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const idea = await Idea.create({
      title: title.trim(),
      description: description.trim(),
      category: finalCategory,
      authorId: user._id.toString(),
      authorName: user.name,
    });

    return NextResponse.json({ idea });
  } catch (error) {
    console.error("Erreur POST idea:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
