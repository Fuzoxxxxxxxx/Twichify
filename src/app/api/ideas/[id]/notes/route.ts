import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Idea from "@/models/Idea";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/roles";
import { IDEA_NOTE_MAX, IDEA_NOTES_LIMIT } from "@/lib/idea-admin";

export const dynamic = "force-dynamic";

async function ensureDb() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }
}

// Notes internes d'une idée : espace de travail du staff (permission manageIdeas).
// Jamais visibles de l'auteur ni du public (GET /api/ideas les exclut).

// POST : ajoute une note. Corps : { text }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_IDEAS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { id } = await params;
    const { text } = await req.json();

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    }
    const clean = typeof text === "string" ? text.replace(/\r\n/g, "\n").trim() : "";
    if (!clean) return NextResponse.json({ error: "Note vide" }, { status: 400 });
    if (clean.length > IDEA_NOTE_MAX) {
      return NextResponse.json({ error: `Note trop longue (${IDEA_NOTE_MAX} caractères max)` }, { status: 400 });
    }

    await ensureDb();

    // Le plafond est vérifié dans le filtre : pas de course entre deux ajouts simultanés.
    const idea = await Idea.findOneAndUpdate(
      { _id: id, [`internalNotes.${IDEA_NOTES_LIMIT - 1}`]: { $exists: false } },
      {
        $push: {
          internalNotes: {
            text: clean,
            by: { userId: String(staff._id), name: staff.name || "Staff" },
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!idea) {
      const exists = await Idea.exists({ _id: id });
      return exists
        ? NextResponse.json({ error: `Limite de ${IDEA_NOTES_LIMIT} notes atteinte` }, { status: 400 })
        : NextResponse.json({ error: "Idée introuvable" }, { status: 404 });
    }

    return NextResponse.json({ notes: idea.internalNotes });
  } catch (error) {
    console.error("Erreur POST idea note:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE : supprime une note. Paramètre : ?noteId=...
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_IDEAS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { id } = await params;
    const noteId = new URL(req.url).searchParams.get("noteId");

    if (!mongoose.isValidObjectId(id) || !noteId || !mongoose.isValidObjectId(noteId)) {
      return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    }

    await ensureDb();

    const idea = await Idea.findByIdAndUpdate(id, { $pull: { internalNotes: { _id: noteId } } }, { new: true });
    if (!idea) return NextResponse.json({ error: "Idée introuvable" }, { status: 404 });

    return NextResponse.json({ notes: idea.internalNotes });
  } catch (error) {
    console.error("Erreur DELETE idea note:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
