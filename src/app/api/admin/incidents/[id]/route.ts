import { NextResponse } from "next/server";
import { ObjectId, type Document, type UpdateFilter } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import {
  MESSAGE_MAX,
  TITLE_MAX,
  cleanText,
  isIncidentImpact,
  isIncidentService,
  isIncidentStatus,
} from "@/lib/incidents";

export const dynamic = "force-dynamic";

/** Mise à jour d'un incident : publier un message, changer le statut/l'impact, corriger le titre. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_STATUS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  try {
    const body = await req.json();

    const title = cleanText(body?.title, TITLE_MAX);
    let message = cleanText(body?.message, MESSAGE_MAX);
    const status = isIncidentStatus(body?.status) ? body.status : undefined;
    const impact = isIncidentImpact(body?.impact) ? body.impact : undefined;
    const service = isIncidentService(body?.service) ? body.service : undefined;

    // Passer en « résolu » sans message : on publie un message par défaut.
    if (!message && status === "resolved") message = "L'incident est résolu et le service fonctionne normalement.";

    if (!message && !title && !status && !impact && !service) {
      return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });
    }

    const now = new Date();
    const set: Record<string, unknown> = { updatedAt: now };
    const unset: Record<string, ""> = {};

    if (title) set.title = title;
    if (impact) set.impact = impact;
    if (service) set.service = service;
    if (status) {
      set.status = status;
      if (status === "resolved") set.resolvedAt = now;
      else unset.resolvedAt = ""; // réouverture
    }

    const update: Record<string, unknown> = { $set: set };
    if (Object.keys(unset).length) update.$unset = unset;
    if (message) {
      update.$push = { updates: { message, ...(status ? { status } : {}), createdAt: now } };
    }

    const client = await clientPromise;
    const result = await client
      .db()
      .collection("incidents")
      .findOneAndUpdate({ _id: new ObjectId(id) }, update as UpdateFilter<Document>, { returnDocument: "after" });

    if (!result) return NextResponse.json({ error: "Incident introuvable" }, { status: 404 });

    await logAudit({
      actor: staff,
      action: "incident.update",
      target: { id, name: String(result.title ?? "") },
      details: [status && `statut → ${status}`, impact && `impact → ${impact}`, message && "message publié"]
        .filter(Boolean)
        .join(" · "),
    });

    return NextResponse.json({ incident: result });
  } catch (error) {
    console.error("Erreur PATCH incident admin:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** Suppression définitive (ex. incident créé par erreur). Pour clore normalement, passer en « résolu ». */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_STATUS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  try {
    const client = await clientPromise;
    const deleted = await client.db().collection("incidents").findOneAndDelete({ _id: new ObjectId(id) });

    if (!deleted) return NextResponse.json({ error: "Incident introuvable" }, { status: 404 });

    await logAudit({
      actor: staff,
      action: "incident.delete",
      target: { id, name: String(deleted.title ?? "") },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE incident admin:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
