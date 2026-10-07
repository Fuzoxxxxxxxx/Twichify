import { NextResponse } from "next/server";
import mongoose from "mongoose";
import SiteSettings from "@/models/SiteSettings";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/roles";
import { logAudit } from "@/lib/audit";

const LEVELS = ["info", "warning", "critical"] as const;
const MAX_MESSAGE = 200;

async function connect() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }
}

// Accepte une date ISO (ou null/absente). Retourne undefined si la valeur est invalide.
function parseDate(value: unknown): Date | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

const fmt = (d: Date) => d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });

// GET : réglages actuels (annonce globale) — réservé aux propriétaires
export async function GET() {
  const owner = await requirePermission(PERMISSIONS.OWNER_ZONE);
  if (!owner) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    await connect();
    const settings = await SiteSettings.findOne({ key: "global" }).lean<{
      banner?: {
        enabled?: boolean;
        message?: string;
        level?: string;
        startsAt?: Date | null;
        expiresAt?: Date | null;
      };
    }>();
    const b = settings?.banner;

    return NextResponse.json({
      banner: {
        enabled: !!b?.enabled,
        message: b?.message || "",
        level: b?.level || "info",
        startsAt: b?.startsAt ? new Date(b.startsAt).toISOString() : null,
        expiresAt: b?.expiresAt ? new Date(b.expiresAt).toISOString() : null,
      },
    });
  } catch (error) {
    console.error("Erreur GET owner settings:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT : met à jour l'annonce globale (message, niveau, début/fin automatiques) — réservé aux propriétaires
export async function PUT(req: Request) {
  const owner = await requirePermission(PERMISSIONS.OWNER_ZONE);
  if (!owner) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const body = await req.json();
    const enabled = body?.enabled === true;
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const level = body?.level;
    const startsAt = parseDate(body?.startsAt);
    const expiresAt = parseDate(body?.expiresAt);

    if (!LEVELS.includes(level)) {
      return NextResponse.json({ error: "Niveau invalide" }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE) {
      return NextResponse.json(
        { error: `Le message ne peut pas dépasser ${MAX_MESSAGE} caractères.` },
        { status: 400 }
      );
    }
    if (enabled && !message) {
      return NextResponse.json(
        { error: "Écris un message avant d'activer l'annonce." },
        { status: 400 }
      );
    }
    if (startsAt === undefined || expiresAt === undefined) {
      return NextResponse.json({ error: "Date invalide." }, { status: 400 });
    }

    // Une annonce active ne peut pas se terminer avant son début ni dans le passé.
    if (enabled && expiresAt) {
      const earliest = Math.max(Date.now(), startsAt ? startsAt.getTime() : 0);
      if (expiresAt.getTime() <= earliest) {
        return NextResponse.json(
          { error: "La fin doit être postérieure au début et à maintenant." },
          { status: 400 }
        );
      }
    }

    await connect();
    await SiteSettings.findOneAndUpdate(
      { key: "global" },
      {
        $set: {
          "banner.enabled": enabled,
          "banner.message": message,
          "banner.level": level,
          "banner.startsAt": startsAt,
          "banner.expiresAt": expiresAt,
          "banner.updatedAt": new Date(),
        },
      },
      { upsert: true }
    );

    const schedule = [
      startsAt ? `début ${fmt(startsAt)}` : null,
      expiresAt ? `fin ${fmt(expiresAt)}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    await logAudit({
      actor: owner,
      action: "banner.update",
      details: enabled
        ? `Annonce activée (${level}${schedule ? `, ${schedule}` : ""}) : ${message}`
        : "Annonce désactivée",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur PUT owner settings:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
