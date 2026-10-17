import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Idea from "@/models/Idea";
import IdeaComment from "@/models/IdeaComment";
import { getSessionUser } from "@/lib/auth-helpers";
import { hasPermission, PERMISSIONS } from "@/lib/roles";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// DELETE : supprime un commentaire. Réservé à son auteur, ou au staff (permission manageIdeas).
// Une suppression par le staff est tracée dans le journal d'audit ; la suppression par l'auteur ne l'est pas.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });

  try {
    const { id, commentId } = await params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(commentId)) {
      return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const comment = await IdeaComment.findOne({ _id: commentId, ideaId: id });
    if (!comment) return NextResponse.json({ success: true }); // déjà supprimé

    const isAuthor = comment.authorId === String(user._id);
    const canModerate = hasPermission(user.role, PERMISSIONS.MANAGE_IDEAS);
    if (!isAuthor && !canModerate) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    await IdeaComment.deleteOne({ _id: commentId });

    if (!isAuthor) {
      const idea = await Idea.findById(id).select("title").lean<{ title?: string }>();
      await logAudit({
        actor: user,
        action: "idea.comment.delete",
        target: { id, name: idea?.title ?? "" },
        details: `commentaire de ${comment.authorName} supprimé`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE commentaire:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
