import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Idea from "@/models/Idea";
import IdeaComment from "@/models/IdeaComment";
import { getSessionUser } from "@/lib/auth-helpers";
import { hasPermission, PERMISSIONS } from "@/lib/roles";
import {
  COMMENT_COOLDOWN_MS,
  COMMENT_MAX,
  COMMENTS_PER_DAY,
  COMMENTS_SHOWN,
} from "@/lib/idea-comments";
import { notify, snippet } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["helper", "moderator", "admin", "co_creator", "creator"];

async function ensureDb() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }
}

// Forme publique d'un commentaire : l'identifiant de l'auteur n'en sort jamais.
// `mine` et `canDelete` sont calculés côté serveur pour le lecteur courant.
function toPublic(c: any, viewer: { id: string; canModerate: boolean } | null) {
  const mine = !!viewer && c.authorId === viewer.id;
  return {
    id: String(c._id),
    authorName: c.authorName,
    isStaff: STAFF_ROLES.includes(c.authorRole),
    content: c.content,
    createdAt: c.createdAt,
    mine,
    canDelete: mine || !!viewer?.canModerate,
  };
}

// GET : commentaires d'une idée (publics, lisibles sans connexion), du plus ancien au plus récent.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    }

    await ensureDb();

    const user = await getSessionUser();
    const viewer = user
      ? { id: String(user._id), canModerate: hasPermission(user.role, PERMISSIONS.MANAGE_IDEAS) }
      : null;

    const [total, latest] = await Promise.all([
      IdeaComment.countDocuments({ ideaId: id }),
      IdeaComment.find({ ideaId: id }).sort({ createdAt: -1 }).limit(COMMENTS_SHOWN).lean(),
    ]);

    return NextResponse.json(
      { total, comments: latest.reverse().map((c: any) => toPublic(c, viewer)) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Erreur GET commentaires:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST : publie un commentaire (connexion requise). Corps : { content }
// Anti-spam : délai minimal entre deux commentaires et plafond sur 24 h.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });

  try {
    const { id } = await params;
    const { content } = await req.json();

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    }

    // Texte brut : retours à la ligne normalisés, pas plus d'une ligne vide d'affilée.
    const clean =
      typeof content === "string" ? content.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() : "";
    if (!clean) return NextResponse.json({ error: "Commentaire vide" }, { status: 400 });
    if (clean.length > COMMENT_MAX) {
      return NextResponse.json({ error: `Commentaire trop long (${COMMENT_MAX} caractères max)` }, { status: 400 });
    }

    await ensureDb();

    const idea = await Idea.findById(id).select("authorId title").lean<{ authorId: string; title: string }>();
    if (!idea) {
      return NextResponse.json({ error: "Idée introuvable" }, { status: 404 });
    }

    const authorId = String(user._id);
    const now = Date.now();

    const last = await IdeaComment.findOne({ authorId }).sort({ createdAt: -1 }).select("createdAt").lean<{ createdAt: Date }>();
    if (last && now - new Date(last.createdAt).getTime() < COMMENT_COOLDOWN_MS) {
      return NextResponse.json({ error: "Doucement : patientez quelques secondes avant de commenter à nouveau." }, { status: 429 });
    }

    const today = await IdeaComment.countDocuments({ authorId, createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) } });
    if (today >= COMMENTS_PER_DAY) {
      return NextResponse.json({ error: "Limite quotidienne de commentaires atteinte." }, { status: 429 });
    }

    const comment = await IdeaComment.create({
      ideaId: id,
      authorId,
      authorName: user.name || "Utilisateur",
      authorRole: user.role || "user",
      content: clean,
    });

    const viewer = { id: authorId, canModerate: hasPermission(user.role, PERMISSIONS.MANAGE_IDEAS) };

    // Prévient l'auteur de l'idée (sauf pour son propre commentaire). Regroupé tant qu'il n'est pas lu.
    if (idea.authorId && idea.authorId !== authorId) {
      await notify({
        userId: idea.authorId,
        type: "idea_comment",
        title: `Nouveau commentaire sur « ${snippet(idea.title, 60)} »`,
        body: `${user.name || "Utilisateur"} : ${snippet(clean)}`,
        href: "/ideas",
        dedupeKey: `idea:${id}:comment`,
      });
    }

    return NextResponse.json({ comment: toPublic(comment, viewer) }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST commentaire:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
