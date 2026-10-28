import { NextResponse } from "next/server";
import mongoose from "mongoose";
import SupportTicket from "@/models/SupportTicket";
import { getSessionUser } from "@/lib/auth-helpers";
import { hasPermission, PERMISSIONS } from "@/lib/roles";
import { notify, snippet } from "@/lib/notifications";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { id } = await params;
    const { content } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "Message vide" }, { status: 400 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });

    const isOwner = ticket.userId === user._id.toString();
    const isStaff = hasPermission(user.role, PERMISSIONS.MANAGE_TICKETS);

    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Un seul membre du staff actif par ticket : si quelqu'un d'autre est déjà assigné,
    // il faut d'abord passer par /claim (avec reprise explicite) avant de pouvoir répondre.
    if (isStaff) {
      const currentAssignee = ticket.assignedTo?.userId;
      const staffId = user._id.toString();
      if (currentAssignee && currentAssignee !== staffId) {
        return NextResponse.json(
          { error: `Ce ticket est déjà pris en charge par ${ticket.assignedTo.userName}. Reprends-le avant de répondre.` },
          { status: 409 }
        );
      }
    }

    ticket.messages.push({
      authorId: user._id.toString(),
      authorName: user.name,
      authorRole: isStaff ? user.role : "user",
      content,
    });

    // Si un membre du staff répond à un ticket en attente, on le passe en "en_cours"
    if (isStaff && ticket.status === "en_attente") {
      ticket.status = "en_cours";
    }

    ticket.updatedAt = new Date();
    await ticket.save();

    // Notifications (best-effort : n'interrompent jamais la réponse). Les messages successifs sont regroupés tant que la notification n'est pas lue.
    if (isStaff && !isOwner) {
      await notify({
        userId: ticket.userId,
        type: "ticket_reply",
        title: `Réponse à « ${snippet(ticket.subject, 60)} »`,
        body: `${user.name} : ${snippet(content)}`,
        href: `/support/${ticket._id}`,
        dedupeKey: `ticket:${ticket._id}:reply`,
      });
    } else if (isOwner && ticket.assignedTo?.userId && ticket.assignedTo.userId !== ticket.userId) {
      await notify({
        userId: ticket.assignedTo.userId,
        type: "ticket_user_reply",
        title: `Le demandeur a répondu : « ${snippet(ticket.subject, 60)} »`,
        body: `${ticket.userName} : ${snippet(content)}`,
        href: `/admin/tickets/${ticket._id}`,
        dedupeKey: `ticket:${ticket._id}:userreply`,
      });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Erreur ajout message:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
