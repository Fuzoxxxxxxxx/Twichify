import { NextResponse } from "next/server";
import mongoose from "mongoose";
import SupportTicket from "@/models/SupportTicket";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/roles";
import {
  STATS_PERIODS,
  buildDaily,
  computeBacklog,
  computeNegativeFeedback,
  computePeriod,
  computeStaffActivity,
  type StatsPeriod,
  type StatsTicket,
} from "@/lib/support-stats";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

// Champs lus pour les calculs : on évite de rapatrier le contenu des messages.
const SELECT = "subject category status createdAt updatedAt assignedTo satisfaction.rating satisfaction.comment satisfaction.ratedAt messages.authorId messages.authorName messages.authorRole messages.createdAt";

// GET /api/admin/support/stats?days=30 (7, 30 ou 90) : indicateurs du support sur la période, comparés à la période précédente.
export async function GET(req: Request) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_TICKETS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const requested = Number(new URL(req.url).searchParams.get("days"));
    const days: StatsPeriod = (STATS_PERIODS as readonly number[]).includes(requested) ? (requested as StatsPeriod) : 30;

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const now = Date.now();
    const since = new Date(now - days * DAY_MS);
    const previousSince = new Date(now - 2 * days * DAY_MS);

    const [current, previous, open] = await Promise.all([
      SupportTicket.find({ createdAt: { $gte: since } }).select(SELECT).lean<StatsTicket[]>(),
      SupportTicket.find({ createdAt: { $gte: previousSince, $lt: since } }).select(SELECT).lean<StatsTicket[]>(),
      SupportTicket.find({ status: { $in: ["en_attente", "en_cours"] } }).select(SELECT).lean<StatsTicket[]>(),
    ]);

    const currentStats = computePeriod(current);
    const previousStats = computePeriod(previous);

    return NextResponse.json(
      {
        days,
        generatedAt: new Date(now).toISOString(),
        current: currentStats,
        // Seuls les indicateurs comparables d'une période à l'autre sont renvoyés.
        previous: {
          created: previousStats.created,
          resolutionRate: previousStats.resolutionRate,
          avgFirstResponseMs: previousStats.avgFirstResponseMs,
          medianResolutionMs: previousStats.medianResolutionMs,
          satisfactionRate: previousStats.satisfactionRate,
        },
        daily: buildDaily(current, since.getTime(), now),
        backlog: computeBacklog(open, now),
        staff: computeStaffActivity(current),
        negativeFeedback: computeNegativeFeedback(current),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Erreur GET stats support:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
