import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { applyIncidentBanner } from "@/lib/incident-banner";
import {
  MESSAGE_MAX,
  TITLE_MAX,
  cleanText,
  isIncidentImpact,
  isIncidentService,
  isIncidentStatus,
} from "@/lib/incidents";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

/** Liste pour l'admin : incidents ouverts + incidents des 30 derniers jours. */
export async function GET() {
  const staff = await requirePermission(PERMISSIONS.MANAGE_STATUS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const client = await clientPromise;
    const incidents = await client
      .db()
      .collection("incidents")
      .find({
        $or: [{ status: { $ne: "resolved" } }, { createdAt: { $gte: new Date(Date.now() - 30 * DAY) } }],
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json({ incidents });
  } catch (error) {
    console.error("Erreur GET incidents admin:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** Création d'un incident : le message saisi devient la première mise à jour publique. */
export async function POST(req: Request) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_STATUS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const body = await req.json();

    const title = cleanText(body?.title, TITLE_MAX);
    const message = cleanText(body?.message, MESSAGE_MAX);
    const service = body?.service;
    const impact = isIncidentImpact(body?.impact) ? body.impact : "minor";
    const status = isIncidentStatus(body?.status) ? body.status : "investigating";
    // Publier aussi l'incident dans la bannière globale du site (sans effet sur un incident déjà résolu).
    const showBanner = body?.showBanner === true && status !== "resolved";

    if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
    if (!message) return NextResponse.json({ error: "Message requis" }, { status: 400 });
    if (!isIncidentService(service)) return NextResponse.json({ error: "Service invalide" }, { status: 400 });

    const now = new Date();
    const doc = {
      title,
      service,
      impact,
      status,
      description: message,
      updates: [{ message, status, createdAt: now }],
      createdAt: now,
      updatedAt: now,
      bannerActive: false,
      ...(status === "resolved" ? { resolvedAt: now } : {}),
      // Jamais renvoyé par l'API publique /api/status (projection).
      createdBy: { id: String(staff._id), name: staff.name || "Staff" },
    };

    const client = await clientPromise;
    const col = client.db().collection("incidents");
    const result = await col.insertOne(doc);
    const id = String(result.insertedId);

    // Bannière globale : l'incident est créé quoi qu'il arrive, un échec de bannière n'annule rien.
    let bannerApplied = false;
    let bannerNote: string | undefined;
    if (showBanner) {
      try {
        const banner = await applyIncidentBanner({ id, title, impact });
        bannerApplied = banner.applied;
        bannerNote = banner.note;
        if (bannerApplied) await col.updateOne({ _id: result.insertedId }, { $set: { bannerActive: true } });
      } catch (e) {
        console.error("Erreur bannière d'incident:", e);
        bannerNote = "L'incident est publié, mais la bannière n'a pas pu l'être.";
      }
    }

    await logAudit({
      actor: staff,
      action: "incident.create",
      target: { id, name: title },
      details: `${service} · ${impact} · ${status}${bannerApplied ? " · bannière" : ""}`,
    });

    return NextResponse.json(
      { incident: { _id: result.insertedId, ...doc, bannerActive: bannerApplied }, bannerApplied, bannerNote },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur POST incident admin:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
