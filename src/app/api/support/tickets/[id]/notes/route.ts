import { NextResponse } from "next/server";
import mongoose from "mongoose";
import SupportTicket from "@/models/SupportTicket";
import { requirePermission } from "@/lib/auth-helpers";
import { canActOn, PERMISSIONS } from "@/lib/roles";
import { TICKET_NOTE_MAX, TICKET_NOTES_LIMIT } from "@/lib/ticket-admin";

export const dynamic = "force-dynamic";

async function ensureDb() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }
}

// Notes internes d'un ticket : espace de travail du staff (permission manageTickets).
// Jamais visibles du demandeur : le champ est exclu des lectures par défaut (voir le modèle SupportTicket).
// Contrairement aux réponses, n'importe quel membre du staff peut en ajouter, même sur un ticket pris en charge par
// un collègue (c'est justement fait pour se passer des informations).

// POST : ajoute une note. Corps : { text }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_TICKETS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { id } = await params;
    const { text } = await req.json();

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    }
    const clean = typeof text === "string" ? text.replace(/\r\n/g, "\n").trim() : "";
    if (!clean) return NextResponse.json({ error: "Note vide" }, { status: 400 });
    if (clean.length > TICKET_NOTE_MAX) {
      return NextResponse.json({ error: `Note trop longue (${TICKET_NOTE_MAX} caractères max)` }, { status: 400 });
    }

    await ensureDb();

    // Le plafond est vérifié dans le filtre : pas de course entre deux ajouts simultanés.
    const ticket = await SupportTicket.findOneAndUpdate(
      { _id: id, [`internalNotes.${TICKET_NOTES_LIMIT - 1}`]: { $exists: false } },
      {
        $push: {
          internalNotes: {
            text: clean,
            by: { userId: String(staff._id), name: staff.name || "Staff", role: staff.role },
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    ).select("+internalNotes");

    if (!ticket) {
      const exists = await SupportTicket.exists({ _id: id });
      return exists
        ? NextResponse.json({ error: `Limite de ${TICKET_NOTES_LIMIT} notes atteinte` }, { status: 400 })
        : NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
    }

    return NextResponse.json({ notes: ticket.internalNotes });
  } catch (error) {
    console.error("Erreur POST note ticket:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE : supprime une note. Paramètre : ?noteId=...
// Réservé à son auteur, ou à un membre de niveau strictement supérieur.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_TICKETS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { id } = await params;
    const noteId = new URL(req.url).searchParams.get("noteId");

    if (!mongoose.isValidObjectId(id) || !noteId || !mongoose.isValidObjectId(noteId)) {
      return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    }

    await ensureDb();

    const ticket = await SupportTicket.findById(id).select("+internalNotes");
    if (!ticket) return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });

    const note = ticket.internalNotes.id(noteId);
    if (!note) return NextResponse.json({ notes: ticket.internalNotes }); // déjà supprimée

    const isAuthor = note.by?.userId === String(staff._id);
    if (!isAuthor && !canActOn(staff.role, note.by?.role)) {
      return NextResponse.json({ error: "Seul l'auteur de la note peut la supprimer" }, { status: 403 });
    }

    const updated = await SupportTicket.findByIdAndUpdate(
      id,
      { $pull: { internalNotes: { _id: noteId } } },
      { new: true }
    ).select("+internalNotes");

    return NextResponse.json({ notes: updated?.internalNotes ?? [] });
  } catch (error) {
    console.error("Erreur DELETE note ticket:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
