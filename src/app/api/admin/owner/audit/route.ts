import { NextResponse } from "next/server";
import mongoose from "mongoose";
import AuditLog from "@/models/AuditLog";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/roles";

// GET : 50 dernières actions sensibles du staff — réservé aux propriétaires
export async function GET() {
  const owner = await requirePermission(PERMISSIONS.OWNER_ZONE);
  if (!owner) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const entries = await AuditLog.find({}).sort({ createdAt: -1 }).limit(50).lean<
      {
        _id: unknown;
        actorName?: string;
        actorRole?: string;
        action: string;
        targetName?: string | null;
        details?: string;
        createdAt: Date;
      }[]
    >();

    return NextResponse.json({
      entries: entries.map((e) => ({
        _id: String(e._id),
        actorName: e.actorName || "Inconnu",
        actorRole: e.actorRole || "user",
        action: e.action,
        targetName: e.targetName || null,
        details: e.details || "",
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    console.error("Erreur GET owner audit:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
