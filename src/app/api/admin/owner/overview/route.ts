import { NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/models/User";
import SupportTicket from "@/models/SupportTicket";
import Idea from "@/models/Idea";
import FaqArticle from "@/models/FaqArticle";
import StatusLog from "@/models/StatusLog";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/roles";

type CountRow = { _id: string | null; count: number };

function toMap(rows: CountRow[], fallbackKey = "inconnu"): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) out[row._id ?? fallbackKey] = row.count;
  return out;
}

// Variables d'environnement : on ne renvoie JAMAIS leur valeur, seulement si elles sont bien configurées.
function envChecks() {
  const has = (name: string) => !!process.env[name];
  return [
    { name: "DATABASE_URL", required: true, ok: has("DATABASE_URL"), note: "Base MongoDB" },
    { name: "NEXTAUTH_SECRET", required: true, ok: has("NEXTAUTH_SECRET"), note: "Signature des sessions" },
    { name: "NEXTAUTH_URL", required: false, ok: has("NEXTAUTH_URL"), note: "URL publique (auto sur Vercel)" },
    { name: "TWITCH_CLIENT_ID", required: true, ok: has("TWITCH_CLIENT_ID"), note: "Connexion Twitch" },
    { name: "TWITCH_CLIENT_SECRET", required: true, ok: has("TWITCH_CLIENT_SECRET"), note: "Connexion Twitch" },
    {
      name: "ENCRYPTION_KEY",
      required: true,
      ok: (process.env.ENCRYPTION_KEY || "").length === 64,
      note: "Chiffrement des clés Spotify (64 caractères hex)",
    },
    { name: "CRON_SECRET", required: false, ok: has("CRON_SECRET"), note: "Protège la route cron de statut" },
    { name: "RESEND_API_KEY", required: false, ok: has("RESEND_API_KEY"), note: "Envoi d'e-mails" },
  ];
}

// GET : vue d'ensemble du système — réservé aux propriétaires
export async function GET() {
  const owner = await requirePermission(PERMISSIONS.OWNER_ZONE);
  if (!owner) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const weekAgo = Math.floor(Date.now() / 1000) - 7 * 86400;

    const [
      totalUsers,
      usersByRole,
      spotifyConnected,
      newUsers7d,
      staff,
      ticketsByStatus,
      ideasByStatus,
      faqCount,
      services,
    ] = await Promise.all([
      User.countDocuments({}),
      User.aggregate<CountRow>([{ $group: { _id: { $ifNull: ["$role", "user"] }, count: { $sum: 1 } } }]),
      User.countDocuments({ spotifyRefreshToken: { $ne: null } }),
      User.countDocuments({ _id: { $gte: mongoose.Types.ObjectId.createFromTime(weekAgo) } }),
      User.find({ role: { $in: ["helper", "moderator", "admin", "co_creator", "creator"] } }, "name image role").lean<
        { _id: unknown; name?: string; image?: string; role: string }[]
      >(),
      SupportTicket.aggregate<CountRow>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Idea.aggregate<CountRow>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      FaqArticle.countDocuments({}),
      StatusLog.aggregate([
        { $sort: { timestamp: -1 } },
        {
          $group: {
            _id: "$service",
            status: { $first: "$status" },
            latencyMs: { $first: "$latencyMs" },
            timestamp: { $first: "$timestamp" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return NextResponse.json({
      users: {
        total: totalUsers,
        byRole: toMap(usersByRole, "user"),
        spotifyConnected,
        newLast7Days: newUsers7d,
      },
      staff: staff.map((s) => ({
        _id: String(s._id),
        name: s.name || "Sans nom",
        image: s.image || null,
        role: s.role,
      })),
      tickets: toMap(ticketsByStatus),
      ideas: toMap(ideasByStatus),
      faqCount,
      services: services.map((s) => ({
        name: s._id,
        status: s.status,
        latencyMs: s.latencyMs ?? null,
        checkedAt: s.timestamp,
      })),
      env: envChecks(),
      runtime: {
        node: process.version,
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "inconnu",
      },
    });
  } catch (error) {
    console.error("Erreur GET owner overview:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
