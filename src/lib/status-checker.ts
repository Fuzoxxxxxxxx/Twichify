import type { Db } from "mongodb";
import clientPromise from "@/lib/mongodb";

/**
 * Moteur de vérification de la page de statut.
 *
 * Deux déclencheurs, une seule logique :
 *  - un pinger externe (cron-job.org, Cloudflare…) qui appelle /api/cron/check-status chaque minute ;
 *  - une « sonde paresseuse » lancée par /api/status quand le dernier check est trop vieux.
 *
 * Un verrou atomique PAR MINUTE (collection `statusmeta`, champ `slot`) garantit :
 *  - au plus un check par minute calendaire, quelle que soit l'instance serverless qui reçoit la requête ;
 *  - un horodatage aligné sur le début de la minute : chaque check tombe toujours dans la même barre de la frise,
 *    quelle que soit la gigue du pinger ou la durée du démarrage à froid.
 */

export type CheckStatus = "operational" | "degraded" | "down";

export const SERVICE_NAMES = ["Spotify API", "Twitch API", "Overlays Server"] as const;

const HTTP_TARGETS = [
  { name: "Spotify API", url: "https://api.spotify.com/v1" },
  { name: "Twitch API", url: "https://api.twitch.tv/helix" },
] as const;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const REQUEST_TIMEOUT_MS = 4_000;
const RETRY_DELAY_MS = 500;
const LOG_TTL_SECONDS = 3 * 60 * 60; // logs bruts : 3 h (frise par minute sur 90 min + statut actuel)
const HOURLY_TTL_SECONDS = 48 * 60 * 60; // agrégats horaires : 48 h (frise 24 h)
const DAILY_TTL_SECONDS = 95 * 24 * 60 * 60; // agrégats journaliers : 95 j (disponibilité 30 j)

interface StatusLogDoc {
  service: string;
  status: CheckStatus;
  latencyMs: number;
  timestamp: Date;
}

interface StatusMetaDoc {
  _id: string;
  /** Numéro de la dernière minute calendaire vérifiée (floor(epoch / 60 s)). */
  slot?: number;
  lastStartedAt?: Date;
  /** Ancien verrou (avant le passage au verrou par minute), ignoré. */
  nextRunAt?: Date;
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

/** Agrégat par service et par heure UTC : la frise 24 h lit ~72 documents au lieu de milliers de logs bruts. */
interface StatusHourlyDoc {
  _id: string;
  service: string;
  hour: Date;
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
      safe(ensureLogsTtl(db)),
      safe(db.collection("statuslogs").createIndex({ service: 1, timestamp: -1 })),
      safe(db.collection("statushourly").createIndex({ hour: 1 }, { expireAfterSeconds: HOURLY_TTL_SECONDS })),
      safe(db.collection("statusdaily").createIndex({ day: 1 }, { expireAfterSeconds: DAILY_TTL_SECONDS })),
    ]).then(() => undefined);
  }
  return indexesReady;
}

/**
 * Applique la durée de conservation des logs bruts (LOG_TTL_SECONDS), y compris sur une base existante dont l'index TTL
 * a une autre durée : createIndex refuse de modifier un index existant, il faut collMod (ou le recréer).
 * Avant de raccourcir la conservation, on fige dans les agrégats horaires ce que les anciens logs contiennent encore.
 */
async function ensureLogsTtl(db: Db): Promise<void> {
  const col = db.collection("statuslogs");
  const existing = (await col.indexes()).find(
    (i) => Object.keys(i.key).length === 1 && (i.key as Record<string, number>).timestamp === 1
  );

  if (!existing) {
    await col.createIndex({ timestamp: 1 }, { expireAfterSeconds: LOG_TTL_SECONDS });
    return;
  }
  if (existing.expireAfterSeconds === LOG_TTL_SECONDS) return;

  await rebuildHourlyFromLogs(db); // agrégats d'abord : le TTL supprimera les vieux logs dans la minute qui suit

  try {
    if (existing.expireAfterSeconds === undefined) throw new Error("index sans TTL");
    await db.command({
      collMod: "statuslogs",
      index: { keyPattern: { timestamp: 1 }, expireAfterSeconds: LOG_TTL_SECONDS },
    });
  } catch {
    // collMod indisponible (ou index sans TTL) : on recrée l'index avec la bonne durée.
    await col.dropIndex(existing.name as string);
    await col.createIndex({ timestamp: 1 }, { expireAfterSeconds: LOG_TTL_SECONDS });
  }
}

/* ----------------------- Rattrapage des agrégats horaires ----------------------- */

/** Clé d'un agrégat horaire : `Service|2026-10-08T14` (heure UTC). */
const hourlyId = (service: string, hourStartMs: number) => `${service}|${new Date(hourStartMs).toISOString().slice(0, 13)}`;

async function backfillHourly(db: Db): Promise<void> {
  const hourly = db.collection<StatusHourlyDoc>("statushourly");
  const currentHourMs = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;

  // Déjà rattrapé (ou installation récente) : au moins une heure terminée existe déjà.
  const past = await hourly.findOne({ hour: { $lt: new Date(currentHourMs) } }, { projection: { _id: 1 } });
  if (past) return;

  await rebuildHourlyFromLogs(db);
}

/**
 * Reconstruit (ou complète) les agrégats horaires depuis les logs bruts encore conservés (3 h). Idempotent.
 * Sert au rattrapage initial et à la réparation automatique quand les agrégats ont du retard sur les logs.
 */
export async function rebuildHourlyFromLogs(db: Db): Promise<void> {
  const hourly = db.collection<StatusHourlyDoc>("statushourly");

  // Arithmétique sur les millisecondes plutôt que $dateTrunc : fonctionne quelle que soit la version de MongoDB.
  const rows = await db
    .collection("statuslogs")
    .aggregate([
      {
        $group: {
          _id: {
            service: "$service",
            hourMs: { $subtract: [{ $toLong: "$timestamp" }, { $mod: [{ $toLong: "$timestamp" }, HOUR_MS] }] },
          },
          total: { $sum: 1 },
          down: { $sum: { $cond: [{ $eq: ["$status", "down"] }, 1, 0] } },
          degraded: { $sum: { $cond: [{ $eq: ["$status", "degraded"] }, 1, 0] } },
        },
      },
    ])
    .toArray();

  if (rows.length === 0) return;

  // $max : idempotent si plusieurs instances rattrapent en même temps, et ne réduit jamais un compteur déjà incrémenté.
  await hourly.bulkWrite(
    rows.map((r) => {
      const hourMs = Number(r._id.hourMs);
      return {
        updateOne: {
          filter: { _id: hourlyId(r._id.service, hourMs) },
          update: {
            $setOnInsert: { service: r._id.service as string, hour: new Date(hourMs) },
            $max: {
              total: r.total as number,
              operational: (r.total - r.down - r.degraded) as number,
              degraded: r.degraded as number,
              down: r.down as number,
            },
          },
          upsert: true,
        },
      };
    })
  );
}

let backfillPromise: Promise<void> | null = null;

/** Rattrapage unique par processus des agrégats horaires depuis les logs bruts. Sans effet une fois fait. */
export function ensureHourlyBackfill(db: Db): Promise<void> {
  if (!backfillPromise) {
    backfillPromise = backfillHourly(db).catch((e: unknown) => {
      console.warn("[status] rattrapage horaire ignoré :", (e as Error)?.message);
      backfillPromise = null; // nouvelle tentative au prochain appel
    });
  }
  return backfillPromise;
}

let lastRepairAt = 0;

/** Réparation à la demande des agrégats horaires (au plus une fois par minute et par instance). */
export async function repairHourly(db: Db): Promise<boolean> {
  if (Date.now() - lastRepairAt < MINUTE_MS) return false;
  lastRepairAt = Date.now();
  await rebuildHourlyFromLogs(db);
  return true;
}

/* ----------------------------------- Verrou ----------------------------------- */

/** Réserve atomiquement la minute `slot`. Retourne false si elle est déjà prise (ou une plus récente). */
async function claimSlot(db: Db, slot: number, arrival: Date): Promise<boolean> {
  try {
    await db.collection<StatusMetaDoc>("statusmeta").updateOne(
      { _id: "checker", $or: [{ slot: { $lt: slot } }, { slot: { $exists: false } }] },
      { $set: { slot, lastStartedAt: arrival } },
      { upsert: true }
    );
    return true;
  } catch (e) {
    // Document déjà présent et minute déjà prise → l'upsert tente un insert et échoue (E11000)
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

/**
 * Latence réelle d'un aller-retour vers MongoDB. Un premier ping (non mesuré) ouvre/réchauffe la connexion du pool :
 * sans lui, un démarrage à froid (handshake TLS + authentification) gonflerait la mesure de plusieurs centaines de ms.
 */
async function probeDatabase(db: Db): Promise<{ status: CheckStatus; latencyMs: number }> {
  try {
    await db.command({ ping: 1 });
    const start = Date.now();
    await db.command({ ping: 1 });
    return { status: "operational", latencyMs: Date.now() - start };
  } catch {
    return { status: "down", latencyMs: 0 };
  }
}

/* --------------------------------- Exécution --------------------------------- */

export type RunResult =
  | { ran: false }
  | { ran: true; timestamp: Date; results: StatusLogDoc[] };

export async function runStatusChecks(source: "cron" | "lazy"): Promise<RunResult> {
  // Heure d'arrivée relevée AVANT toute attente (connexion, index) : le démarrage à froid ne décale pas la minute.
  const arrival = new Date();
  const slot = Math.floor(arrival.getTime() / MINUTE_MS);
  const timestamp = new Date(slot * MINUTE_MS); // horodatage aligné sur la minute

  const client = await clientPromise;
  const db = client.db();

  await ensureIndexes(db);
  await ensureHourlyBackfill(db);

  if (!(await claimSlot(db, slot, arrival))) return { ran: false };

  const [spotify, twitch, overlays] = await Promise.all([
    probeHttp(HTTP_TARGETS[0].url),
    probeHttp(HTTP_TARGETS[1].url),
    probeDatabase(db),
  ]);

  const results: StatusLogDoc[] = [
    { service: HTTP_TARGETS[0].name, ...spotify, timestamp },
    { service: HTTP_TARGETS[1].name, ...twitch, timestamp },
    { service: "Overlays Server", ...overlays, timestamp },
  ];

  const day = new Date(Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth(), timestamp.getUTCDate()));
  const dayKey = day.toISOString().slice(0, 10);
  const hourMs = Math.floor(timestamp.getTime() / HOUR_MS) * HOUR_MS;
  const hour = new Date(hourMs);

  // Les logs bruts sont essentiels : s'ils échouent, le check échoue. Les agrégats, eux, ne doivent jamais faire
  // échouer le check : leur erreur est journalisée (Vercel → Logs) et la page les répare depuis les logs bruts.
  await db.collection<StatusLogDoc>("statuslogs").insertMany(results.map((r) => ({ ...r })));

  const rollups = await Promise.allSettled([
    db.collection<StatusHourlyDoc>("statushourly").bulkWrite(
      results.map((r) => ({
        updateOne: {
          filter: { _id: hourlyId(r.service, hourMs) },
          update: {
            $setOnInsert: { service: r.service, hour },
            $inc: { total: 1, [r.status]: 1 } as Record<string, number>,
          },
          upsert: true,
        },
      }))
    ),
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
  rollups.forEach((r, i) => {
    if (r.status === "rejected") console.error(`[status] agrégat ${i === 0 ? "horaire" : "journalier"} en échec :`, r.reason);
  });

  console.log(`[status] check (${source}) :`, results.map((r) => `${r.service}=${r.status}`).join(", "));
  return { ran: true, timestamp, results };
}
