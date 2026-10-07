import { NextResponse } from "next/server";
import mongoose from "mongoose";
import SupportTicket from "@/models/SupportTicket";
import { requirePermission } from "@/lib/auth-helpers";
import { getRoleLevel, ROLE_LABELS, PERMISSIONS } from "@/lib/roles";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_TICKETS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { id } = await params;
    // `force` n'est envoyé que par un clic explicite sur "Reprendre" — jamais lors
    // de l'ouverture automatique de la page, ce qui évite qu'un simple chargement
    // de page ne vole un ticket déjà pris en charge par quelqu'un d'autre.
    let force = false;
    try {
      const body = await req.json();
      force = !!body?.force;
    } catch {
      // corps vide : claim implicite (montage de page), force reste false
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });

    const staffId = staff._id.toString();
    const currentAssignee = ticket.assignedTo?.userId;

    // Déjà pris en charge par ce même membre du staff : rien à faire
    if (currentAssignee === staffId) {
      return NextResponse.json({ ticket });
    }

    if (currentAssignee) {
      // Niveau du membre actuellement assigné (utilise le rôle enregistré au moment
      // de l'assignation, pour ne pas dépendre d'un lookup supplémentaire fiable
      // même si le rôle de cette personne a changé depuis).
      const assignedLevel = getRoleLevel(ticket.assignedTo.role);
      const staffLevel = getRoleLevel(staff.role);

      if (!force) {
        // Claim implicite (ouverture de page) : jamais de vol automatique.
        return NextResponse.json(
          {
            error: `Ce ticket est déjà pris en charge par ${ticket.assignedTo.userName}.`,
            assignedTo: ticket.assignedTo,
          },
          { status: 409 }
        );
      }

      if (staffLevel <= assignedLevel) {
        return NextResponse.json(
          {
            error: `Niveau insuffisant : ce ticket est pris en charge par ${ticket.assignedTo.userName} (${ROLE_LABELS[ticket.assignedTo.role] || ticket.assignedTo.role}).`,
          },
          { status: 403 }
        );
      }

      // Niveau strictement supérieur : reprise autorisée
      const previousAssigneeName = ticket.assignedTo.userName;
      ticket.assignedTo = {
        userId: staffId,
        userName: staff.name,
        role: staff.role,
        assignedAt: new Date(),
      };
      ticket.messages.push({
        authorId: "system",
        authorName: "Système",
        authorRole: "system",
        content: `${staff.name} a repris la conversation (précédemment prise en charge par ${previousAssigneeName}).`,
      });
    } else {
      // Ticket libre : prise en charge normale
      ticket.assignedTo = {
        userId: staffId,
        userName: staff.name,
        role: staff.role,
        assignedAt: new Date(),
      };
      ticket.messages.push({
        authorId: "system",
        authorName: "Système",
        authorRole: "system",
        content: `${staff.name} a rejoint la conversation.`,
      });
    }

    if (ticket.status === "en_attente") {
      ticket.status = "en_cours";
    }

    ticket.updatedAt = new Date();
    await ticket.save();

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Erreur claim ticket:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
