import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Idea from "@/models/Idea";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/roles";

const VALID_STATUSES = ["en_etude", "planifie", "en_cours", "termine", "rejete"];

// PATCH : réservé au staff (permission manageIdeas) — change le statut d'une idée
// et/ou publie une réponse officielle.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_IDEAS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { id } = await params;
    const { status, officialResponse } = await req.json();

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const idea = await Idea.findById(id);
    if (!idea) return NextResponse.json({ error: "Idée introuvable" }, { status: 404 });

    if (status !== undefined) {
      idea.status = status;
    }

    if (typeof officialResponse === "string") {
      const trimmed = officialResponse.trim();
      idea.officialResponse = trimmed
        ? { content: trimmed, updatedAt: new Date() }
        : { content: null, updatedAt: null };
    }

    idea.updatedAt = new Date();
    await idea.save();

    return NextResponse.json({ idea });
  } catch (error) {
    console.error("Erreur PATCH idea status:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
