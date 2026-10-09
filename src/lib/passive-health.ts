import { after } from "next/server";
import clientPromise from "@/lib/mongodb";

/**
 * Mesure passive de la santé des API tierces, à partir des vrais appels des utilisateurs
 * (widget musique → Spotify, widget chat → Twitch). Aucun appel supplémentaire n'est émis.
 *
 * Les résultats sont comptés en mémoire puis écrits par lots, par minute et par service, dans la collection
 * `statuspassive` : un document par (service, minute) avec { total, errors }.
 *
 * Seules les pannes de l'API elles-mêmes comptent comme erreurs : échec réseau, délai dépassé ou réponse 5xx.
 * Un 4xx (jeton expiré, clés Spotify invalides, quota d'une app personnelle…) prouve au contraire que l'API
 * répond : il est compté comme un succès, car il dépend du compte de l'utilisateur et non de la santé du service.
 */

export type PassiveService = "Spotify API" | "Twitch API";

const MINUTE_MS = 60_000;
const FLUSH_EVERY_MS = 10_000;
const TTL_SECONDS = 12 * 60 * 60; // les agrégats ne servent qu'à la fenêtre récente

type PassiveDoc = { _id: string; service: string; minute: Date; total?: number; errors?: number };

type Counter = { total: number; errors: number };

// État propre à l'instance serverless : les compteurs sont écrits par lots, jamais à chaque appel.
const buffer = new Map<string, Counter>();
let lastFlushAt = 0;
let indexReady: Promise<void> | null = null;

/** Enregistre le résultat d'un appel réel. `ok = false` uniquement pour une panne du service (réseau, 5xx). */
export function recordApiCall(service: PassiveService, ok: boolean): void {
  const now = Date.now();
  const key = `${service}|${Math.floor(now / MINUTE_MS)}`;
  const counter = buffer.get(key) ?? { total: 0, errors: 0 };
  counter.total++;
  if (!ok) counter.errors++;
  buffer.set(key, counter);

  if (now - lastFlushAt >= FLUSH_EVERY_MS) scheduleFlush();
}

/** Classe un statut HTTP : false seulement pour une réponse 5xx. */
export const isHealthyStatus = (status: number): boolean => status < 500;

/**
 * fetch() qui enregistre le résultat comme appel réel : exception réseau et 5xx = erreur, le reste = succès.
 * Comportement identique à fetch pour l'appelant (la réponse ou l'exception sont renvoyées telles quelles).
 */
export async function trackedFetch(
  service: PassiveService,
  input: string | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    const res = await fetch(input, init);
    recordApiCall(service, isHealthyStatus(res.status));
    return res;
  } catch (error) {
    recordApiCall(service, false);
    throw error;
  }
}

function scheduleFlush() {
  lastFlushAt = Date.now(); // posé tout de suite : évite de relancer une écriture à chaque appel pendant la première
  const task = flush().catch((e) => console.warn("[status] écriture des mesures passives ignorée :", (e as Error)?.message));
  try {
    // Dans une requête, `after` laisse l'écriture se terminer après l'envoi de la réponse.
    after(task);
  } catch {
    // Hors contexte de requête : la promesse s'exécute quand même.
  }
}

async function flush(): Promise<void> {
  if (buffer.size === 0) return;

  const entries = [...buffer.entries()];
  buffer.clear();

  try {
    const db = (await clientPromise).db();
    const col = db.collection<PassiveDoc>("statuspassive");

    if (!indexReady) {
      indexReady = col
        .createIndex({ minute: 1 }, { expireAfterSeconds: TTL_SECONDS })
        .then(() => undefined)
        .catch((e: unknown) => console.warn("[status] index passif ignoré :", (e as Error)?.message));
    }
    await indexReady;

    await col.bulkWrite(
      entries.map(([key, c]) => {
        const [service, slot] = key.split("|");
        return {
          updateOne: {
            filter: { _id: key },
            update: {
              $setOnInsert: { service, minute: new Date(Number(slot) * MINUTE_MS) },
              $inc: { total: c.total, errors: c.errors },
            },
            upsert: true,
          },
        };
      })
    );
  } catch (error) {
    // Échec d'écriture : on remet les compteurs pour la prochaine tentative (best-effort).
    for (const [key, c] of entries) {
      const existing = buffer.get(key);
      buffer.set(key, { total: (existing?.total ?? 0) + c.total, errors: (existing?.errors ?? 0) + c.errors });
    }
    throw error;
  }
}
