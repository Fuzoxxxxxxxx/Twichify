import { NextResponse } from "next/server";
import mongoose from "mongoose";
import SupportTicket from "@/models/SupportTicket";
import { requirePermission } from "@/lib/auth-helpers";
import { canActOn, PERMISSIONS } from "@/lib/roles";

const VALID_STATUSES = ["en_attente", "en_cours", "resolu", "ferme"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_TICKETS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });

    // Le statut ne peut être changé que par le membre assigné, ou par quelqu'un
    // de niveau strictement supérieur à l'assigné actuel.
    const staffId = staff._id.toString();
    const currentAssignee = ticket.assignedTo?.userId;
    if (currentAssignee && currentAssignee !== staffId && !canActOn(staff.role, ticket.assignedTo?.role)) {
      return NextResponse.json(
        { error: `Ce ticket est pris en charge par ${ticket.assignedTo.userName}. Reprends-le avant de changer son statut.` },
        { status: 409 }
      );
    }

    const previousStatus = ticket.status;
    ticket.status = status;

    // Message système pour tracer les transitions importantes dans la conversation
    if (status !== previousStatus) {
      if (status === "ferme") {
        ticket.messages.push({
          authorId: "system",
          authorName: "Système",
          authorRole: "system",
          content: `La conversation a été fermée par ${staff.name}.`,
        });
      } else if (status === "resolu") {
        ticket.messages.push({
          authorId: "system",
          authorName: "Système",
          authorRole: "system",
          content: `Le ticket a été marqué comme résolu par ${staff.name}.`,
        });
      }
    }

    ticket.updatedAt = new Date();
    await ticket.save();

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Erreur changement statut:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
