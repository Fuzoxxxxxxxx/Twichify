import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Announcement from "@/models/Announcement";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import { countAudience, sendAnnouncementNotifications } from "@/lib/announcements";
import {
  ANNOUNCEMENT_BODY_MAX,
  ANNOUNCEMENT_DUPLICATE_WINDOW_MINUTES,
  ANNOUNCEMENT_HREF_MAX,
  ANNOUNCEMENT_TITLE_MAX,
  audienceLabel,
  isAnnouncementAudience,
  isInternalPath,
  type AnnouncementRecord,
} from "@/lib/announcement-types";

export const dynamic = "force-dynamic";

async function ensureDb() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }
}

function toRecord(a: any): AnnouncementRecord {
  return {
    id: String(a._id),
    title: a.title,
    body: a.body || "",
    href: a.href || null,
    audience: a.audience,
    recipientCount: a.recipientCount ?? 0,
    sentBy: { name: a.sentBy?.name || "Inconnu", role: a.sentBy?.role || "user" },
    createdAt: new Date(a.createdAt).toISOString(),
  };
}

// Réservé à l'espace propriétaire : une annonce atteint potentiellement tous les comptes.

// GET : historique des 20 derniers envois. Avec ?audience=<groupe> : nombre de destinataires de ce groupe (aperçu avant envoi).
export async function GET(req: Request) {
  const staff = await requirePermission(PERMISSIONS.OWNER_ZONE);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const audience = new URL(req.url).searchParams.get("audience");
    if (audience !== null) {
      if (!isAnnouncementAudience(audience)) return NextResponse.json({ error: "Groupe inconnu" }, { status: 400 });
      return NextResponse.json({ count: await countAudience(audience) });
    }

    await ensureDb();
    const docs = await Announcement.find().sort({ createdAt: -1 }).limit(20).lean();
    return NextResponse.json({ announcements: docs.map(toRecord) });
  } catch (error) {
    console.error("Erreur GET annonces:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST : envoie une annonce { audience, title, body?, href? }.
export async function POST(req: Request) {
  const staff = await requirePermission(PERMISSIONS.OWNER_ZONE);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const input = await req.json().catch(() => ({}));
    const audience = input?.audience;
    const title = typeof input?.title === "string" ? input.title.trim() : "";
    const body = typeof input?.body === "string" ? input.body.trim() : "";
    const href = typeof input?.href === "string" && input.href.trim() ? input.href.trim() : null;

    if (!isAnnouncementAudience(audience)) return NextResponse.json({ error: "Groupe de destinataires invalide." }, { status: 400 });
    if (!title) return NextResponse.json({ error: "Le titre est obligatoire." }, { status: 400 });
    if (title.length > ANNOUNCEMENT_TITLE_MAX) {
      return NextResponse.json({ error: `Titre trop long (${ANNOUNCEMENT_TITLE_MAX} caractères maximum).` }, { status: 400 });
    }
    if (body.length > ANNOUNCEMENT_BODY_MAX) {
      return NextResponse.json({ error: `Message trop long (${ANNOUNCEMENT_BODY_MAX} caractères maximum).` }, { status: 400 });
    }
    if (href && (href.length > ANNOUNCEMENT_HREF_MAX || !isInternalPath(href))) {
      return NextResponse.json({ error: "Le lien doit être une page du site, par exemple /changelog ou /help." }, { status: 400 });
    }

    await ensureDb();

    // Protège d'un double envoi (double clic, rechargement) : même groupe, même texte, dans les dernières minutes.
    const since = new Date(Date.now() - ANNOUNCEMENT_DUPLICATE_WINDOW_MINUTES * 60 * 1000);
    const duplicate = await Announcement.exists({ audience, title, body, createdAt: { $gte: since } });
    if (duplicate) {
      return NextResponse.json(
        { error: `Une annonce identique a déjà été envoyée à ce groupe il y a moins de ${ANNOUNCEMENT_DUPLICATE_WINDOW_MINUTES} minutes.` },
        { status: 409 }
      );
    }

    const recipientCount = await sendAnnouncementNotifications(audience, { title, body, href });
    if (recipientCount === 0) {
      return NextResponse.json({ error: "Aucun destinataire dans ce groupe." }, { status: 400 });
    }

    const record = await Announcement.create({
      title,
      body,
      href,
      audience,
      recipientCount,
      sentBy: { userId: String(staff._id), name: staff.name || "Inconnu", role: staff.role || "user" },
    });

    await logAudit({
      actor: staff,
      action: "announcement.send",
      target: { id: String(record._id), name: title },
      details: `${audienceLabel(audience)} · ${recipientCount} destinataire${recipientCount > 1 ? "s" : ""}`,
    });

    return NextResponse.json({ ok: true, announcement: toRecord(record) }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST annonce:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
