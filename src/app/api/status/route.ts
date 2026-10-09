import { NextResponse, after } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  SERVICE_NAMES,
  ensureHourlyBackfill,
  getLastCheckStartedAt,
  repairHourly,
  runStatusChecks,
} from "@/lib/status-checker";

export const dynamic = "force-dynamic";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const POINTS = 24; // frise horaire : 24 heures calendaires (la dernière est l'heure en cours)
const MINUTE_POINTS = 90; // frise « par minute » : 90 minutes calendaires (la dernière est la minute en cours)
const MAX_GAP_MINUTES = 2; // une minute sans mesure reprend la dernière valeur connue pendant 2 min, puis passe en gris
const LAZY_AFTER_MS = 90_000; // sonde paresseuse si le pinger a raté un tour (> 1 min 30 sans check)
const STALE_AFTER_MS = 5 * MINUTE; // au-delà : « aucune donnée récente » (jamais de faux vert)
const LATENCY_SAMPLE = 10; // la latence BDD affichée est la médiane des 10 derniers pings

// Trafic réel (mesure passive, voir lib/passive-health) : fenêtre et seuils.
const PASSIVE_WINDOW_MS = 10 * MINUTE;
const PASSIVE_MIN_SAMPLE = 20; // en dessous, l'échantillon est trop petit pour conclure
const PASSIVE_DEGRADED_RATE = 0.5; // au moins la moitié des appels réels en panne → « Dégradé »

type HistoryState = "green" | "yellow" | "red" | "gray";
type CurrentStatus = "Operational" | "Degraded" | "Down" | "Unknown";

interface RecentLog {
  service: string;
  status: string;
  latencyMs?: number;
  timestamp: Date;
}

const RANK: Record<string, number> = { operational: 1, degraded: 2, down: 3 };
const STATE_BY_RANK: HistoryState[] = ["gray", "green", "yellow", "red"];

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
function hourState(total: number, down: number, degraded: number): HistoryState {
  if (total === 0) return "gray";
  if (down >= 2) return "red";
  if (down >= 1 || degraded >= 2) return "yellow";
  return "green";
}

/**
 * Frise par minute, alignée sur les minutes calendaires : une mesure tombe toujours dans la même barre,
 * quel que soit l'instant où la page est chargée (plus de barres qui apparaissent/disparaissent d'un rechargement à l'autre).
 * Une minute sans mesure reprend la dernière valeur connue pendant MAX_GAP_MINUTES (gigue du pinger),
 * puis devient grise : une vraie interruption de la surveillance reste visible.
 */
function buildMinuteHistory(logs: RecentLog[], now: number): HistoryState[] {
  const firstMinute = Math.floor(now / MINUTE) - (MINUTE_POINTS - 1);
  const worst = new Array<number>(MINUTE_POINTS).fill(0);

  for (const l of logs) {
    const idx = Math.floor(new Date(l.timestamp).getTime() / MINUTE) - firstMinute;
    if (idx < 0 || idx >= MINUTE_POINTS) continue;
    worst[idx] = Math.max(worst[idx], RANK[l.status] ?? 1);
  }

  let last = 0;
  let missing = 0;
  return worst.map((rank) => {
    if (rank > 0) {
      last = rank;
      missing = 0;
      return STATE_BY_RANK[rank];
    }
    missing++;
    return last > 0 && missing <= MAX_GAP_MINUTES ? STATE_BY_RANK[last] : "gray";
  });
}

/** Médiane (ms) des derniers pings MongoDB réussis, ou null s'il n'y en a pas. */
function medianDbLatency(logs: RecentLog[]): number | null {
  const values = logs
    .filter((l) => l.status === "operational" && typeof l.latencyMs === "number")
    .slice(0, LATENCY_SAMPLE) // `logs` est trié du plus récent au plus ancien
    .map((l) => l.latencyMs as number)
    .sort((a, b) => a - b);
  return values.length ? values[Math.floor(values.length / 2)] : null;
}

export async function GET() {
  const startTime = Date.now();

  try {
    const client = await clientPromise;
    const db = client.db();

    // Reconstruit une seule fois (par processus) les agrégats horaires à partir des logs bruts après la mise en place.
    await ensureHourlyBackfill(db);

    const now = Date.now();
    // Fenêtre horaire alignée sur les heures calendaires : 23 heures pleines + l'heure en cours.
    const windowStart = new Date(Math.floor(now / HOUR) * HOUR - (POINTS - 1) * HOUR);
    const sevenDaysAgo = new Date(now - 7 * DAY);
    const thirtyDaysAgo = new Date(now - 30 * DAY);
    const thirtyDaysAgoUtcDay = new Date(
      Date.UTC(thirtyDaysAgo.getUTCFullYear(), thirtyDaysAgo.getUTCMonth(), thirtyDaysAgo.getUTCDate())
    );

    const [lastStartedAt, recent, hourlyDocs, daily, passiveDocs, incidents] = await Promise.all([
      getLastCheckStartedAt(db),

      // Derniers checks (fenêtre « minutes » + marge d'une minute) : statut actuel, frise par minute, latence BDD
      db
        .collection("statuslogs")
        .find({ timestamp: { $gte: new Date(now - (MINUTE_POINTS + 1) * MINUTE) } })
        .sort({ timestamp: -1 })
        .limit(1000)
        .toArray(),

      // Frise 24 h : agrégats horaires (≈ 72 documents), plus de parcours des logs bruts
      db.collection("statushourly").find({ hour: { $gte: windowStart } }).toArray(),

      // Disponibilité 30 j : agrégats journaliers (les logs bruts n'en gardent que 3 h)
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

      // Trafic réel des 10 dernières minutes (mesure passive des appels des widgets)
      db
        .collection("statuspassive")
        .find({ minute: { $gte: new Date(now - PASSIVE_WINDOW_MS) } })
        .toArray(),

      db
        .collection("incidents")
        .find({ createdAt: { $gte: sevenDaysAgo } }, { projection: { createdBy: 0 } })
        .sort({ createdAt: -1 })
        .toArray(),
    ]);

    // Sonde paresseuse : si le pinger externe a raté un tour, une visite rattrape le retard.
    // `after` exécute le check après l'envoi de la réponse ; le verrou par minute évite les doublons.
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

    const typedRecent = recent as unknown as RecentLog[];

    // Auto-réparation : des checks existent pour l'heure en cours mais leur agrégat horaire est absent (écriture échouée,
    // ancien déploiement, instance sans le nouveau code…). On reconstruit alors les agrégats depuis les logs bruts (3 h),
    // ce qui comble aussi les heures récentes manquantes, puis on relit : la frise ne reste jamais grise à tort.
    let hourlyRows = hourlyDocs;
    const currentHourMs = Math.floor(now / HOUR) * HOUR;
    const rollupStale = SERVICE_NAMES.some(
      (name) =>
        typedRecent.some((l) => l.service === name && new Date(l.timestamp).getTime() >= currentHourMs) &&
        !hourlyDocs.some(
          (d) => d.service === name && new Date(d.hour).getTime() === currentHourMs && Number(d.total) > 0
        )
    );
    if (rollupStale) {
      try {
        if (await repairHourly(db)) {
          hourlyRows = await db.collection("statushourly").find({ hour: { $gte: windowStart } }).toArray();
        }
      } catch (e) {
        console.error("[status] réparation des agrégats horaires en échec :", e);
      }
    }

    // Trafic réel cumulé par service sur la fenêtre
    const passiveByService = new Map<string, { total: number; errors: number }>();
    for (const doc of passiveDocs) {
      const entry = passiveByService.get(doc.service as string) ?? { total: 0, errors: 0 };
      entry.total += Number(doc.total) || 0;
      entry.errors += Number(doc.errors) || 0;
      passiveByService.set(doc.service as string, entry);
    }

    const servicesData = SERVICE_NAMES.map((name) => {
      // Frise horaire, depuis les agrégats
      const buckets = Array.from({ length: POINTS }, () => ({ total: 0, down: 0, degraded: 0 }));
      for (const doc of hourlyRows) {
        if (doc.service !== name) continue;
        const idx = Math.round((new Date(doc.hour).getTime() - windowStart.getTime()) / HOUR);
        if (idx < 0 || idx >= POINTS) continue;
        buckets[idx].total += Number(doc.total) || 0;
        buckets[idx].down += Number(doc.down) || 0;
        buckets[idx].degraded += Number(doc.degraded) || 0;
      }
      const history = buckets.map((b) => hourState(b.total, b.down, b.degraded));

      // Disponibilité 24 h = part de checks opérationnels
      const total = buckets.reduce((s, b) => s + b.total, 0);
      const bad = buckets.reduce((s, b) => s + b.down + b.degraded, 0);
      const percent = total > 0 ? `${(((total - bad) / total) * 100).toFixed(1)}%` : "--";

      const logs = typedRecent.filter((l) => l.service === name);
      let status = computeCurrentStatus(logs, now);

      // Trafic réel : un taux d'erreur élevé sur les vrais appels des utilisateurs rétrograde un service par ailleurs
      // « opérationnel » en « dégradé » (jamais en « panne » : seule la sonde active peut le décider).
      const passive = passiveByService.get(name);
      const errorRate = passive && passive.total > 0 ? passive.errors / passive.total : 0;
      const trafficDegraded = !!passive && passive.total >= PASSIVE_MIN_SAMPLE && errorRate >= PASSIVE_DEGRADED_RATE;
      if (status === "Operational" && trafficDegraded) status = "Degraded";

      return {
        name,
        status,
        percent,
        uptime30d: uptime30dByService.get(name) ?? null,
        history,
        historyMinutes: buildMinuteHistory(logs, now),
        // Null quand il n'y a pas (ou trop peu) de trafic réel : le service n'est pas mesuré passivement.
        realTraffic:
          passive && passive.total >= 10
            ? { requests: passive.total, errorRate: Math.round(errorRate * 1000) / 10, degraded: trafficDegraded }
            : null,
      };
    });

    const allSystemsOperational = servicesData.every((s) => s.status === "Operational");
    const lastCheckAt = recent[0]?.timestamp ? new Date(recent[0].timestamp).toISOString() : null;

    // « Latence BDD » = vrai temps d'un aller-retour MongoDB (médiane des derniers pings mesurés par le check),
    // et non la durée totale de cet appel d'API (qui inclut le démarrage à froid et la connexion).
    const dbLatency = medianDbLatency(typedRecent.filter((l) => l.service === "Overlays Server"));

    return NextResponse.json(
      {
        services: servicesData,
        latency: dbLatency !== null ? `${dbLatency}ms` : "--",
        apiLatency: `${Date.now() - startTime}ms`,
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
