import { NextResponse } from "next/server";
import mongoose from "mongoose";
import SupportTicket from "@/models/SupportTicket";
import { getSessionUser } from "@/lib/auth-helpers";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { id } = await params;

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });

    const isOwner = ticket.userId === user._id.toString();
    const isStaff = ["moderator", "admin", "helper", "co_creator", "creator"].includes(user.role);

    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // L'indicateur « en train d'écrire » expire côté serveur après quelques secondes sans
    // nouveau ping (voir POST /typing) : le client n'a jamais à raisonner sur une horloge.
    const TYPING_TTL_MS = 4000;
    const plain = ticket.toObject();
    if (!plain.typing?.at || Date.now() - new Date(plain.typing.at).getTime() > TYPING_TTL_MS) {
      plain.typing = null;
    }

    return NextResponse.json({ ticket: plain });
  } catch (error) {
    console.error("Erreur GET ticket:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}