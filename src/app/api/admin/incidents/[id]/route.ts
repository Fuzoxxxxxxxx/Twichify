import { NextResponse } from "next/server";
import { ObjectId, type Document, type UpdateFilter } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { applyIncidentBanner, clearIncidentBanner } from "@/lib/incident-banner";
import {
  MESSAGE_MAX,
  TITLE_MAX,
  cleanText,
  isIncidentImpact,
  isIncidentService,
  isIncidentStatus,
  type IncidentImpact,
} from "@/lib/incidents";

export const dynamic = "force-dynamic";

/** Mise à jour d'un incident : publier un message, changer le statut/l'impact, corriger le titre, gérer la bannière. */
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
    // true = publier/mettre à jour la bannière globale, false = la retirer, absent = ne rien changer.
    const bannerFlag = typeof body?.banner === "boolean" ? body.banner : undefined;

    // Passer en « résolu » sans message : on publie un message par défaut.
    if (!message && status === "resolved") message = "L'incident est résolu et le service fonctionne normalement.";

    if (!message && !title && !status && !impact && !service && bannerFlag === undefined) {
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
    // La bannière disparaît avec l'incident résolu, ou si on la retire explicitement.
    if (status === "resolved" || bannerFlag === false) set.bannerActive = false;

    const update: Record<string, unknown> = { $set: set };
    if (Object.keys(unset).length) update.$unset = unset;
    if (message) {
      update.$push = { updates: { message, ...(status ? { status } : {}), createdAt: now } };
    }

    const client = await clientPromise;
    const col = client.db().collection("incidents");
    const result = await col.findOneAndUpdate({ _id: new ObjectId(id) }, update as UpdateFilter<Document>, {
      returnDocument: "after",
    });

    if (!result) return NextResponse.json({ error: "Incident introuvable" }, { status: 404 });

    // ── Bannière globale ──
    let bannerActive = !!result.bannerActive;
    let bannerNote: string | undefined;
    const isResolved = result.status === "resolved";

    try {
      if (status === "resolved" || bannerFlag === false) {
        await clearIncidentBanner(id);
        bannerActive = false;
      } else if (isResolved) {
        if (bannerFlag === true) bannerNote = "Un incident résolu ne peut pas être affiché en bannière.";
      } else if (bannerFlag === true || (bannerActive && (impact || title))) {
        // Publication demandée, ou rafraîchissement du niveau/texte d'une bannière déjà active (impact ou titre modifié).
        const banner = await applyIncidentBanner({
          id,
          title: String(result.title),
          impact: result.impact as IncidentImpact,
        });
        if (banner.applied !== bannerActive) {
          bannerActive = banner.applied;
          await col.updateOne({ _id: new ObjectId(id) }, { $set: { bannerActive } });
        }
        bannerNote = banner.note;
      }
    } catch (e) {
      console.error("Erreur bannière d'incident:", e);
      bannerNote = "L'incident est mis à jour, mais la bannière n'a pas pu l'être.";
    }

    await logAudit({
      actor: staff,
      action: "incident.update",
      target: { id, name: String(result.title ?? "") },
      details: [
        status && `statut → ${status}`,
        impact && `impact → ${impact}`,
        message && "message publié",
        bannerFlag === true && "bannière activée",
        bannerFlag === false && "bannière retirée",
      ]
        .filter(Boolean)
        .join(" · "),
    });

    return NextResponse.json({ incident: { ...result, bannerActive }, bannerNote });
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

    // Une bannière issue de cet incident ne doit pas survivre à sa suppression.
    try {
      await clearIncidentBanner(id);
    } catch (e) {
      console.error("Erreur retrait bannière d'incident:", e);
    }

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
