import type { Db } from "mongodb";
import clientPromise from "@/lib/mongodb";

/**
 * Moteur de vérification de la page de statut.
 *
 * Deux déclencheurs, une seule logique :
 *  - un pinger externe (cron-job.org, Cloudflare…) qui appelle /api/cron/check-status chaque minute ;
 *  - une « sonde paresseuse » lancée par /api/status quand le dernier check est trop vieux.
 *
 * Un verrou atomique en base (collection `statusmeta`) garantit qu'un seul check part
 * par fenêtre de MIN_INTERVAL_MS, quelle que soit l'instance serverless qui reçoit la requête.
 */

export type CheckStatus = "operational" | "degraded" | "down";

export const SERVICE_NAMES = ["Spotify API", "Twitch API", "Overlays Server"] as const;

const HTTP_TARGETS = [
  { name: "Spotify API", url: "https://api.spotify.com/v1" },
  { name: "Twitch API", url: "https://api.twitch.tv/helix" },
] as const;

const MIN_INTERVAL_MS = 45_000; // anti-doublon entre pinger externe et sonde paresseuse
const REQUEST_TIMEOUT_MS = 4_000;
const RETRY_DELAY_MS = 500;
const LOG_TTL_SECONDS = 24 * 60 * 60; // logs bruts : 24 h (frise horaire)
const DAILY_TTL_SECONDS = 95 * 24 * 60 * 60; // agrégats journaliers : 95 j (disponibilité 30 j)

interface StatusLogDoc {
  service: string;
  status: CheckStatus;
  latencyMs: number;
  timestamp: Date;
}

interface StatusMetaDoc {
  _id: string;
  nextRunAt?: Date;
  lastStartedAt?: Date;
}

interface StatusDailyDoc {
  _id: string;
  service: string;
  day: Date;
  total?: number;
  operational?: number;
  degraded?: number;
  down?: number;
}

/* ------------------------------- Index (1×/process) ------------------------------- */

let indexesReady: Promise<void> | null = null;

function ensureIndexes(db: Db): Promise<void> {
  if (!indexesReady) {
    const safe = (p: Promise<unknown>) =>
      p.catch((e: unknown) => console.warn("[status] index ignoré :", (e as Error)?.message));

    indexesReady = Promise.all([
      safe(db.collection("statuslogs").createIndex({ timestamp: 1 }, { expireAfterSeconds: LOG_TTL_SECONDS })),
      safe(db.collection("statuslogs").createIndex({ service: 1, timestamp: -1 })),
      safe(db.collection("statusdaily").createIndex({ day: 1 }, { expireAfterSeconds: DAILY_TTL_SECONDS })),
    ]).then(() => undefined);
  }
  return indexesReady;
}

/* ----------------------------------- Verrou ----------------------------------- */

/** Réserve atomiquement le prochain créneau de check. Retourne false si un check est déjà récent. */
async function claimRun(db: Db, now: Date): Promise<boolean> {
  try {
    await db.collection<StatusMetaDoc>("statusmeta").updateOne(
      { _id: "checker", $or: [{ nextRunAt: { $lte: now } }, { nextRunAt: { $exists: false } }] },
      { $set: { nextRunAt: new Date(now.getTime() + MIN_INTERVAL_MS), lastStartedAt: now } },
      { upsert: true }
    );
    return true;
  } catch (e) {
    // Document déjà présent et créneau non échu → l'upsert tente un insert et échoue (E11000)
    if ((e as { code?: number })?.code === 11000) return false;
    throw e;
  }
}

/** Date du dernier check démarré (null si aucun). Utilisé pour décider d'une sonde paresseuse. */
export async function getLastCheckStartedAt(db: Db): Promise<number | null> {
  const meta = await db.collection<StatusMetaDoc>("statusmeta").findOne({ _id: "checker" });
  return meta?.lastStartedAt ? meta.lastStartedAt.getTime() : null;
}

/* ----------------------------------- Sondes ----------------------------------- */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET avec 1 retry : évite qu'un timeout isolé ne soit enregistré comme panne. */
async function probeHttp(url: string): Promise<{ status: CheckStatus; latencyMs: number }> {
  const attempts = 2;
  for (let i = 0; i < attempts; i++) {
    const start = Date.now();
    const last = i === attempts - 1;
    try {
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      // Toute réponse < 500 (même 401/403/404/429 sur un appel anonyme) prouve que l'API répond.
      if (res.status < 500) return { status: "operational", latencyMs: Date.now() - start };
      if (last) return { status: "degraded", latencyMs: Date.now() - start };
    } catch {
      if (last) return { status: "down", latencyMs: Date.now() - start };
    }
    await sleep(RETRY_DELAY_MS);
  }
  return { status: "down", latencyMs: 0 };
}

async function probeDatabase(db: Db): Promise<{ status: CheckStatus; latencyMs: number }> {
  const start = Date.now();
  try {
    await db.command({ ping: 1 });
    return { status: "operational", latencyMs: Date.now() - start };
  } catch {
    return { status: "down", latencyMs: Date.now() - start };
  }
}

/* --------------------------------- Exécution --------------------------------- */

export type RunResult =
  | { ran: false }
  | { ran: true; timestamp: Date; results: StatusLogDoc[] };

export async function runStatusChecks(source: "cron" | "lazy"): Promise<RunResult> {
  const client = await clientPromise;
  const db = client.db();

  await ensureIndexes(db);

  const now = new Date();
  if (!(await claimRun(db, now))) return { ran: false };

  const [spotify, twitch, overlays] = await Promise.all([
    probeHttp(HTTP_TARGETS[0].url),
    probeHttp(HTTP_TARGETS[1].url),
    probeDatabase(db),
  ]);

  const results: StatusLogDoc[] = [
    { service: HTTP_TARGETS[0].name, ...spotify, timestamp: now },
    { service: HTTP_TARGETS[1].name, ...twitch, timestamp: now },
    { service: "Overlays Server", ...overlays, timestamp: now },
  ];

  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayKey = day.toISOString().slice(0, 10);

  await Promise.all([
    db.collection<StatusLogDoc>("statuslogs").insertMany(results.map((r) => ({ ...r }))),
    db.collection<StatusDailyDoc>("statusdaily").bulkWrite(
      results.map((r) => ({
        updateOne: {
          filter: { _id: `${r.service}|${dayKey}` },
          update: {
            $setOnInsert: { service: r.service, day },
            $inc: { total: 1, [r.status]: 1 } as Record<string, number>,
          },
          upsert: true,
        },
      }))
    ),
  ]);

  console.log(`[status] check (${source}) :`, results.map((r) => `${r.service}=${r.status}`).join(", "));
  return { ran: true, timestamp: now, results };
}
