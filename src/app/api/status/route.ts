import { NextResponse, after } from "next/server";
import clientPromise from "@/lib/mongodb";
import { SERVICE_NAMES, getLastCheckStartedAt, runStatusChecks } from "@/lib/status-checker";

export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const POINTS = 24;
const LAZY_AFTER_MS = 60_000; // sonde paresseuse si le dernier check a plus d'1 min
const STALE_AFTER_MS = 5 * 60_000; // au-delà : « aucune donnée récente » (jamais de faux vert)

type HistoryState = "green" | "yellow" | "red" | "gray";
type CurrentStatus = "Operational" | "Degraded" | "Down" | "Unknown";

interface RecentLog {
  status: string;
  timestamp: Date;
}

/**
 * Statut actuel basé sur les derniers checks (et non sur le bucket horaire) :
 *  - Down      : 2 échecs « down » parmi les 3 derniers checks ;
 *  - Degraded  : dernier check non opérationnel, ou ≥ 2 anomalies sur 3 ;
 *  - Unknown   : aucun check depuis STALE_AFTER_MS.
 */
function computeCurrentStatus(logs: RecentLog[], now: number): CurrentStatus {
  const latest = logs[0];
  if (!latest || now - new Date(latest.timestamp).getTime() > STALE_AFTER_MS) return "Unknown";

  const lastThree = logs.slice(0, 3);
  const down = lastThree.filter((l) => l.status === "down").length;
  const bad = lastThree.filter((l) => l.status !== "operational").length;

  if (down >= 2) return "Down";
  if (bad >= 2 || latest.status !== "operational") return "Degraded";
  return "Operational";
}

/** Un check isolé en échec ne suffit pas à colorer une heure en rouge. */
function bucketState(total: number, down: number, degraded: number): HistoryState {
  if (total === 0) return "gray";
  if (down >= 2) return "red";
  if (down >= 1 || degraded >= 2) return "yellow";
  return "green";
}

export async function GET() {
  const startTime = Date.now();

  try {
    const client = await clientPromise;
    const db = client.db();

    const now = Date.now();
    const windowStart = new Date(now - POINTS * HOUR);
    const sevenDaysAgo = new Date(now - 7 * DAY);
    const thirtyDaysAgo = new Date(now - 30 * DAY);
    const thirtyDaysAgoUtcDay = new Date(
      Date.UTC(thirtyDaysAgo.getUTCFullYear(), thirtyDaysAgo.getUTCMonth(), thirtyDaysAgo.getUTCDate())
    );

    const [lastStartedAt, recent, hourly, daily, incidents] = await Promise.all([
      getLastCheckStartedAt(db),

      // Derniers checks (10 min) pour le statut actuel
      db
        .collection("statuslogs")
        .find({ timestamp: { $gte: new Date(now - 10 * 60_000) } })
        .sort({ timestamp: -1 })
        .limit(60)
        .toArray(),

      // Frise 24 h : agrégation côté Mongo, un document par (service, heure)
      db
        .collection("statuslogs")
        .aggregate([
          { $match: { timestamp: { $gte: windowStart } } },
          {
            $group: {
              _id: {
                service: "$service",
                hour: { $floor: { $divide: [{ $subtract: ["$timestamp", windowStart] }, HOUR] } },
              },
              total: { $sum: 1 },
              down: { $sum: { $cond: [{ $eq: ["$status", "down"] }, 1, 0] } },
              degraded: { $sum: { $cond: [{ $eq: ["$status", "degraded"] }, 1, 0] } },
            },
          },
        ])
        .toArray(),

      // Disponibilité 30 j : agrégats journaliers (les logs bruts n'en gardent que 24 h)
      db
        .collection("statusdaily")
        .aggregate([
          { $match: { day: { $gte: thirtyDaysAgoUtcDay } } },
          {
            $group: {
              _id: "$service",
              total: { $sum: "$total" },
              operational: { $sum: "$operational" },
            },
          },
        ])
        .toArray(),

      db.collection("incidents").find({ createdAt: { $gte: sevenDaysAgo } }).sort({ createdAt: -1 }).toArray(),
    ]);

    // Sonde paresseuse : si le pinger externe a raté un tour, une visite rattrape le retard.
    // `after` exécute le check après l'envoi de la réponse ; le verrou en base évite les doublons.
    if (lastStartedAt === null || now - lastStartedAt > LAZY_AFTER_MS) {
      after(async () => {
        try {
          await runStatusChecks("lazy");
        } catch (e) {
          console.error("[status] échec de la sonde paresseuse :", e);
        }
      });
    }

    const uptime30dByService = new Map<string, number | null>(
      daily.map((r) => [r._id as string, r.total > 0 ? (r.operational / r.total) * 100 : null])
    );

    const servicesData = SERVICE_NAMES.map((name) => {
      // Frise
      const buckets = Array.from({ length: POINTS }, () => ({ total: 0, down: 0, degraded: 0 }));
      for (const row of hourly) {
        if (row._id.service !== name) continue;
        const idx = Math.min(Math.max(Number(row._id.hour), 0), POINTS - 1);
        buckets[idx].total += row.total;
        buckets[idx].down += row.down;
        buckets[idx].degraded += row.degraded;
      }
      const history = buckets.map((b) => bucketState(b.total, b.down, b.degraded));

      // Disponibilité 24 h = part de checks opérationnels
      const total = buckets.reduce((s, b) => s + b.total, 0);
      const bad = buckets.reduce((s, b) => s + b.down + b.degraded, 0);
      const percent = total > 0 ? `${(((total - bad) / total) * 100).toFixed(1)}%` : "--";

      const logs = recent.filter((l) => l.service === name) as unknown as RecentLog[];

      return {
        name,
        status: computeCurrentStatus(logs, now),
        percent,
        uptime30d: uptime30dByService.get(name) ?? null,
        history,
      };
    });

    const allSystemsOperational = servicesData.every((s) => s.status === "Operational");
    const lastCheckAt = recent[0]?.timestamp ? new Date(recent[0].timestamp).toISOString() : null;

    return NextResponse.json(
      {
        services: servicesData,
        latency: `${Date.now() - startTime}ms`,
        allSystemsOperational,
        lastCheckAt,
        incidents,
      },
      {
        headers: {
          // Cache CDN très court : protège MongoDB quand plusieurs visiteurs rafraîchissent la page.
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    console.error("Erreur API status:", error);
    return NextResponse.json(
      { error: "Impossible de charger le statut" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
