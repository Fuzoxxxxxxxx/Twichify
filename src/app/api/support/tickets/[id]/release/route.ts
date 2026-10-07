import { NextResponse } from "next/server";
import mongoose from "mongoose";
import SupportTicket from "@/models/SupportTicket";
import { requirePermission } from "@/lib/auth-helpers";
import { canActOn, PERMISSIONS } from "@/lib/roles";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_TICKETS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { id } = await params;

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });

    const staffId = staff._id.toString();
    const isSelf = ticket.assignedTo?.userId === staffId;

    // Seul le membre assigné, ou quelqu'un de niveau strictement supérieur, peut retirer l'assignation
    if (!isSelf && !canActOn(staff.role, ticket.assignedTo?.role)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const releasedName = ticket.assignedTo?.userName || staff.name;

    ticket.assignedTo = { userId: null, userName: null, role: null, assignedAt: null };
    ticket.messages.push({
      authorId: "system",
      authorName: "Système",
      authorRole: "system",
      content: `${releasedName} a quitté la conversation.`,
    });

    ticket.updatedAt = new Date();
    await ticket.save();

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Erreur release ticket:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
