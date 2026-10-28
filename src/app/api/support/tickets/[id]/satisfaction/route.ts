import { NextResponse } from "next/server";
import mongoose from "mongoose";
import SupportTicket from "@/models/SupportTicket";
import { getSessionUser } from "@/lib/auth-helpers";
import { notify, snippet } from "@/lib/notifications";
import { SATISFACTION_COMMENT_MAX } from "@/lib/support-satisfaction";

const CLOSED_STATUSES = ["resolu", "ferme"];

// POST { rating: "yes" | "no", comment?: string } : le demandeur indique si son problème est réglé.
// Réservé au demandeur lui-même, et seulement une fois le ticket résolu ou fermé. Il peut changer d'avis tant que le ticket reste clos.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });

    const input = await req.json().catch(() => ({}));
    const rating = input?.rating;
    if (rating !== "yes" && rating !== "no") {
      return NextResponse.json({ error: "Réponse invalide." }, { status: 400 });
    }
    const comment = typeof input?.comment === "string" ? input.comment.trim().slice(0, SATISFACTION_COMMENT_MAX) : "";

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const ticket = await SupportTicket.findById(id).select("userId subject status satisfaction messages.authorId messages.authorRole").lean<any>();
    if (!ticket) return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });

    // Même réponse qu'un ticket inexistant pour un tiers : on ne révèle pas l'existence du ticket.
    if (ticket.userId !== user._id.toString()) {
      return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
    }

    if (!CLOSED_STATUSES.includes(ticket.status)) {
      return NextResponse.json({ error: "Tu pourras donner ton avis une fois le ticket résolu ou fermé." }, { status: 409 });
    }

    const previousRating = ticket.satisfaction?.rating;
    const ratedAt = new Date();

    await SupportTicket.updateOne(
      { _id: id },
      { $set: { "satisfaction.rating": rating, "satisfaction.comment": comment, "satisfaction.ratedAt": ratedAt } }
    );

    // Un retour négatif prévient la dernière personne du staff qui a répondu (une seule fois par changement de réponse).
    if (rating === "no" && previousRating !== "no") {
      const lastStaff = [...(ticket.messages ?? [])]
        .reverse()
        .find((m: any) => m.authorRole !== "user" && m.authorRole !== "system" && m.authorId && m.authorId !== ticket.userId);
      if (lastStaff?.authorId) {
        await notify({
          userId: lastStaff.authorId,
          type: "ticket_feedback",
          title: `Problème non réglé : « ${snippet(ticket.subject, 60)} »`,
          body: comment ? snippet(comment) : "Le demandeur indique que son problème n'est pas réglé.",
          href: `/admin/tickets/${id}`,
          dedupeKey: `ticket:${id}:feedback`,
        });
      }
    }

    return NextResponse.json({ ok: true, satisfaction: { rating, comment, ratedAt: ratedAt.toISOString() } });
  } catch (error) {
    console.error("Erreur satisfaction ticket:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
