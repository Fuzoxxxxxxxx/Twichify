import { NextResponse } from "next/server";
import mongoose from "mongoose";
import SupportTicket from "@/models/SupportTicket";
import { getSessionUser } from "@/lib/auth-helpers";
import { hasPermission, PERMISSIONS } from "@/lib/roles";

// POST : signale que l'utilisateur connecté est en train d'écrire une réponse sur ce ticket.
// Appelé (avec throttling côté client) pendant la saisie ; l'indicateur expire tout seul
// côté lecture après quelques secondes sans nouveau ping (voir GET /api/support/tickets/[id]).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { id } = await params;

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const ticket = await SupportTicket.findById(id, "userId status");
    if (!ticket) return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });

    const isOwner = ticket.userId === user._id.toString();
    const isStaff = hasPermission(user.role, PERMISSIONS.MANAGE_TICKETS);
    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    if (ticket.status === "ferme" || ticket.status === "resolu") {
      // Ticket clos : pas de champ de réponse, donc rien à signaler.
      return NextResponse.json({ success: true });
    }

    await SupportTicket.updateOne(
      { _id: id },
      {
        $set: {
          typing: {
            userId: user._id.toString(),
            userName: user.name,
            role: isStaff ? user.role : "user",
            at: new Date(),
          },
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur POST typing:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
