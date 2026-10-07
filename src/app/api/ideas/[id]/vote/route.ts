import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Idea from "@/models/Idea";
import { getSessionUser } from "@/lib/auth-helpers";

// POST : ajoute/retire le vote de l'utilisateur connecté (up ou down).
// Un utilisateur n'a jamais qu'un seul vote actif : voter dans l'autre sens
// bascule automatiquement le vote, et voter deux fois dans le même sens l'annule.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { id } = await params;
    const { type } = await req.json();

    if (type !== "up" && type !== "down") {
      return NextResponse.json({ error: "Type de vote invalide" }, { status: 400 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const idea = await Idea.findById(id);
    if (!idea) return NextResponse.json({ error: "Idée introuvable" }, { status: 404 });

    const userId = user._id.toString();
    const hasUpvoted = idea.upvotes.includes(userId);
    const hasDownvoted = idea.downvotes.includes(userId);

    // On retire systématiquement l'utilisateur des deux listes avant de recalculer,
    // pour ne jamais le laisser voter dans les deux sens à la fois.
    idea.upvotes = idea.upvotes.filter((u: string) => u !== userId);
    idea.downvotes = idea.downvotes.filter((u: string) => u !== userId);

    if (type === "up" && !hasUpvoted) {
      idea.upvotes.push(userId);
    } else if (type === "down" && !hasDownvoted) {
      idea.downvotes.push(userId);
    }
    // Si le vote demandé correspond au vote déjà actif, il vient d'être retiré
    // ci-dessus sans être réajouté : c'est le comportement "annuler mon vote".

    idea.updatedAt = new Date();
    await idea.save();

    const score = idea.upvotes.length - idea.downvotes.length;

    return NextResponse.json({
      score,
      upvoteCount: idea.upvotes.length,
      downvoteCount: idea.downvotes.length,
      myVote: idea.upvotes.includes(userId) ? "up" : idea.downvotes.includes(userId) ? "down" : null,
    });
  } catch (error) {
    console.error("Erreur vote idea:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
