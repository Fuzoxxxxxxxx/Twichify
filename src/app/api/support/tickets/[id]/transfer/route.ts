import { NextResponse } from "next/server";
import mongoose from "mongoose";
import SupportTicket from "@/models/SupportTicket";
import User from "@/models/User";
import { requirePermission } from "@/lib/auth-helpers";
import { canActOn, hasPermission, PERMISSIONS } from "@/lib/roles";
import { TRANSFER_REASON_MAX } from "@/lib/ticket-admin";

export const dynamic = "force-dynamic";

// POST : transfère la prise en charge d'un ticket à un autre membre du staff (ou l'escalade à un niveau supérieur).
// Corps : { toUserId, reason? }.
//
// Règles :
//  - l'appelant doit être le membre assigné, ou de niveau strictement supérieur à celui-ci, ou le ticket doit être libre ;
//  - le destinataire doit avoir la permission manageTickets et ne pas être déjà assigné ;
//  - un ticket résolu ou fermé ne se transfère pas ;
//  - le demandeur voit un message système neutre ; le motif reste dans une note interne (jamais visible de lui).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_TICKETS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { id } = await params;
    const { toUserId, reason } = await req.json();

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(toUserId)) {
      return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    }
    const cleanReason = typeof reason === "string" ? reason.replace(/\r\n/g, "\n").trim() : "";
    if (cleanReason.length > TRANSFER_REASON_MAX) {
      return NextResponse.json({ error: `Motif trop long (${TRANSFER_REASON_MAX} caractères max)` }, { status: 400 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });

    if (ticket.status === "resolu" || ticket.status === "ferme") {
      return NextResponse.json({ error: "Un ticket résolu ou fermé ne peut pas être transféré." }, { status: 400 });
    }

    const staffId = String(staff._id);
    const currentAssignee: string | null = ticket.assignedTo?.userId ?? null;

    if (currentAssignee && currentAssignee !== staffId && !canActOn(staff.role, ticket.assignedTo?.role)) {
      return NextResponse.json(
        { error: `Ce ticket est pris en charge par ${ticket.assignedTo.userName} : seul cette personne (ou un niveau supérieur) peut le transférer.` },
        { status: 403 }
      );
    }

    if (String(toUserId) === staffId) {
      return NextResponse.json({ error: "Pour vous attribuer le ticket, utilisez « Reprendre »." }, { status: 400 });
    }
    if (currentAssignee && String(toUserId) === currentAssignee) {
      return NextResponse.json({ error: "Ce membre a déjà pris en charge ce ticket." }, { status: 400 });
    }

    const target = await User.findById(toUserId).select("name role");
    if (!target || !hasPermission(target.role, PERMISSIONS.MANAGE_TICKETS)) {
      return NextResponse.json({ error: "Ce membre ne peut pas prendre en charge des tickets." }, { status: 400 });
    }

    const now = new Date();
    const targetName: string = target.name || "un membre de l'équipe";
    const fromName = ticket.assignedTo?.userName || staff.name;

    // Le filtre garantit que le ticket n'a pas changé de mains entre la lecture et l'écriture.
    const updated = await SupportTicket.findOneAndUpdate(
      {
        _id: id,
        status: { $nin: ["resolu", "ferme"] },
        "assignedTo.userId": currentAssignee,
      },
      {
        $set: {
          assignedTo: { userId: String(target._id), userName: targetName, role: target.role, assignedAt: now },
          updatedAt: now,
          ...(ticket.status === "en_attente" ? { status: "en_cours" } : {}),
        },
        $push: {
          messages: {
            authorId: "system",
            authorName: "Système",
            authorRole: "system",
            content: `La conversation a été transférée à ${targetName}.`,
            createdAt: now,
          },
          internalNotes: {
            text: `Transfert : ${fromName} → ${targetName}${cleanReason ? ` — ${cleanReason}` : ""}`,
            by: { userId: staffId, name: staff.name || "Staff", role: staff.role },
            createdAt: now,
          },
        },
      },
      { new: true }
    ).select("+internalNotes");

    if (!updated) {
      return NextResponse.json(
        { error: "Le ticket a changé entre-temps (autre prise en charge ou fermeture). Actualisez la page." },
        { status: 409 }
      );
    }

    return NextResponse.json({ ticket: updated });
  } catch (error) {
    console.error("Erreur transfert ticket:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
