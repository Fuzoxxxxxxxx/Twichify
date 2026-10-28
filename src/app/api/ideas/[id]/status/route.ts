import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Idea from "@/models/Idea";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { IDEA_HISTORY_LIMIT, IDEA_RESPONSE_MAX } from "@/lib/idea-admin";
import { notify, snippet } from "@/lib/notifications";

const VALID_STATUSES = ["en_etude", "planifie", "en_cours", "termine", "rejete"];

// Formulation du statut dans la notification envoyée à l'auteur de l'idée.
const STATUS_PHRASES: Record<string, string> = {
  en_etude: "à l'étude",
  planifie: "planifiée",
  en_cours: "en cours de développement",
  termine: "terminée",
  rejete: "refusée",
};

// PATCH : réservé au staff (permission manageIdeas) — change le statut d'une idée
// et/ou publie, modifie ou retire la réponse officielle.
// Chaque changement réel est tracé (historique de l'idée + journal d'audit) ; un envoi identique à l'état actuel
// ne modifie rien.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_IDEAS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { id } = await params;
    const { status, officialResponse } = await req.json();

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    }
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    if (typeof officialResponse === "string" && officialResponse.trim().length > IDEA_RESPONSE_MAX) {
      return NextResponse.json(
        { error: `Réponse trop longue (${IDEA_RESPONSE_MAX} caractères max)` },
        { status: 400 }
      );
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const idea = await Idea.findById(id);
    if (!idea) return NextResponse.json({ error: "Idée introuvable" }, { status: 404 });

    const now = new Date();
    const by = { userId: String(staff._id), name: staff.name || "Staff" };
    const events: { type: string; from?: string; to?: string; by: typeof by; at: Date }[] = [];
    const details: string[] = [];

    if (status !== undefined && status !== idea.status) {
      events.push({ type: "status", from: idea.status, to: status, by, at: now });
      details.push(`statut ${idea.status} → ${status}`);
      idea.status = status;
    }

    if (typeof officialResponse === "string") {
      const trimmed = officialResponse.trim();
      const previous: string | null = idea.officialResponse?.content ?? null;

      if (trimmed && trimmed !== previous) {
        idea.officialResponse = { content: trimmed, updatedAt: now, by };
        events.push({ type: "response", by, at: now });
        details.push(previous ? "réponse modifiée" : "réponse publiée");
      } else if (!trimmed && previous) {
        idea.officialResponse = { content: null, updatedAt: null, by: { userId: null, name: null } };
        events.push({ type: "response_removed", by, at: now });
        details.push("réponse retirée");
      }
    }

    // Aucun changement réel : rien à enregistrer, ni à tracer.
    if (events.length === 0) return NextResponse.json({ idea });

    idea.history = [...(idea.history || []), ...events].slice(-IDEA_HISTORY_LIMIT);
    idea.updatedAt = now;
    await idea.save();

    await logAudit({
      actor: staff,
      action: "idea.update",
      target: { id, name: idea.title },
      details: details.join(" · "),
    });

    // Prévient l'auteur de l'idée (sauf s'il est lui-même le membre du staff qui agit).
    if (idea.authorId && idea.authorId !== by.userId) {
      const ideaTitle = `« ${snippet(idea.title, 80)} »`;
      for (const e of events) {
        if (e.type === "status" && e.to) {
          await notify({
            userId: idea.authorId,
            type: "idea_status",
            title: `Ton idée est maintenant ${STATUS_PHRASES[e.to] ?? e.to}`,
            body: ideaTitle,
            href: "/ideas",
            dedupeKey: `idea:${id}:status`,
          });
        } else if (e.type === "response") {
          await notify({
            userId: idea.authorId,
            type: "idea_response",
            title: "L'équipe a répondu à ton idée",
            body: `${ideaTitle} : ${snippet(idea.officialResponse?.content, 120)}`,
            href: "/ideas",
            dedupeKey: `idea:${id}:response`,
          });
        }
      }
    }

    return NextResponse.json({ idea });
  } catch (error) {
    console.error("Erreur PATCH idea status:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
