import mongoose from "mongoose";
import FollowerTracking from "@/models/FollowerTracking";
import {
  FOLLOWERS_SCOPE,
  fetchUserInfos,
  getUserAuth,
  helixApp,
  helixUser,
  type FollowerRow,
  type SectionStatus,
  type UserTokenResult,
} from "@/lib/twitch-user";

/**
 * Suivi des départs de followers (opt-in).
 *
 * Twitch ne fournit AUCUN historique de désabonnements : ni endpoint, ni événement EventSub.
 * La seule méthode fiable est de comparer des instantanés de la liste des followers.
 * Quand l'utilisateur active le suivi, on enregistre la liste (identifiants seulement : aucun pseudo, nom ni date) ;
 * à chaque analyse, ceux qui ont disparu depuis l'analyse précédente sont des départs.
 * Les pseudos et avatars des départs sont relus sur Twitch à l'affichage : ils ne sont jamais stockés.
 *
 * Limites assumées :
 *  - un départ n'est détecté qu'à l'analyse suivante, pas en temps réel ;
 *  - le suivi est réservé aux chaînes de 5 000 followers maximum (une analyse = 1 appel Twitch par tranche de 100) ;
 *  - on ne sait pas si la personne a quitté volontairement ou si son compte a été supprimé/banni :
 *    on le vérifie en demandant son profil à Twitch (introuvable = compte supprimé ou banni).
 */

export const TRACKING_MAX_FOLLOWERS = 5000;
const SCAN_COOLDOWN_MS = 5 * 60_000;
const MAX_DEPARTURES = 200;
const DEPARTURES_RETURNED = 100;

export type Departure = {
  id: string;
  login: string;
  name: string;
  avatar: string | null;
  // Date à laquelle la personne avait suivi la chaîne : connue uniquement pour les départs enregistrés avant le
  // passage aux identifiants seuls (l'instantané ne la conserve plus).
  followedAt: string | null;
  detectedAt: string;
  accountGone: boolean;
};

export type UnfollowState = {
  status: SectionStatus; // état de l'autorisation Twitch
  enabled: boolean;
  tooLarge: boolean; // la chaîne dépasse la limite de suivi
  limit: number;
  total: number | null; // nombre de followers connu quand `tooLarge`
  tracked: number; // followers dans le dernier instantané
  baselineAt: string | null; // début du suivi
  scannedAt: string | null; // dernière analyse complète
  departures: Departure[];
  // Résultat de la dernière action : analyse trop rapprochée, incomplète, en erreur ou déjà en cours.
  note?: "cooldown" | "incomplete" | "error" | "busy";
  retryInSeconds?: number;
};

async function ensureDb() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }
}

// Évite deux analyses simultanées pour le même utilisateur (double clic, deux onglets).
const scanning = new Set<string>();

// Ancien format de l'instantané : { i: identifiant, l: login, n: nom affiché, f: date de suivi }.
type LegacyFollower = { i: string; l: string; n: string; f: string };

/**
 * Réécrit un ancien document en identifiants seuls : l'instantané perd pseudos, noms et dates, et les départs perdent
 * leur date et leur pseudo. Ces informations sont relues sur Twitch à partir de l'identifiant, sauf pour un compte
 * supprimé ou banni, introuvable par définition : son dernier pseudo connu est conservé. Sans effet (et sans écriture)
 * sur un document déjà compact.
 */
async function compactDocument(userId: string, doc: any | null): Promise<any | null> {
  if (!doc) return doc;

  const followers = (doc.followers ?? []) as (number | LegacyFollower)[];
  const departures = (doc.departures ?? []) as any[];

  const followersLegacy = followers.some((f) => typeof f !== "number");
  const departuresLegacy = departures.some(
    (d) => d.followedAt !== undefined || (!d.accountGone && (d.login !== undefined || d.name !== undefined))
  );
  if (!followersLegacy && !departuresLegacy) return doc;

  const ids = followers
    .map((f) => (typeof f === "number" ? f : Number(f?.i)))
    .filter((id) => Number.isFinite(id));
  const cleaned = departures.map((d) => ({
    id: d.id,
    detectedAt: d.detectedAt,
    accountGone: !!d.accountGone,
    ...(d.accountGone && d.login ? { login: d.login, name: d.name } : {}),
  }));

  await FollowerTracking.updateOne({ user: userId }, { $set: { followers: ids, departures: cleaned } });
  return { ...doc, followers: ids, departures: cleaned };
}

/* ------------------------------------------------------------------ */
/* Analyse complète                                                    */
/* ------------------------------------------------------------------ */

type ScanResult =
  | { ok: true; rows: FollowerRow[] }
  | { ok: false; reason: "expired" | "missing_scope" | "error" | "too_large" | "incomplete"; total: number | null };

async function scanAllFollowers(twitchId: string, token: string): Promise<ScanResult> {
  const rows: FollowerRow[] = [];
  let total: number | null = null;
  let cursor: string | undefined;
  const maxPages = Math.ceil(TRACKING_MAX_FOLLOWERS / 100) + 2;

  for (let page = 0; page < maxPages; page++) {
    const after = cursor ? `&after=${encodeURIComponent(cursor)}` : "";
    let res: Response;
    try {
      res = await helixUser(`/channels/followers?broadcaster_id=${twitchId}&first=100${after}`, token);
    } catch (e) {
      console.error("Erreur analyse des followers:", e);
      return { ok: false, reason: "error", total };
    }

    if (res.status === 401) return { ok: false, reason: "expired", total };
    if (res.status === 403) return { ok: false, reason: "missing_scope", total };
    if (!res.ok) return { ok: false, reason: "error", total };

    const json = await res.json();

    if (page === 0) {
      total = typeof json.total === "number" ? json.total : null;
      // On refuse avant de paginer : inutile de lire des milliers de followers qu'on ne suivra pas.
      if (total != null && total > TRACKING_MAX_FOLLOWERS) return { ok: false, reason: "too_large", total };
    }

    rows.push(...((json.data ?? []) as FollowerRow[]));
    cursor = json.pagination?.cursor;
    if (!cursor) break;
  }

  // Une analyse partielle ferait passer des followers encore présents pour des départs : on la rejette.
  if (cursor) return { ok: false, reason: "incomplete", total };
  if (total != null && rows.length < total - 5) return { ok: false, reason: "incomplete", total };

  return { ok: true, rows };
}

// Identifiants (parmi `ids`) dont le compte n'existe plus côté Twitch. Un lot en erreur n'est pas compté.
async function findMissingAccounts(ids: string[]): Promise<Set<string>> {
  const missing = new Set<string>();

  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    try {
      const json = await helixApp<{ data: { id: string }[] }>(`/users?${chunk.map((id) => `id=${encodeURIComponent(id)}`).join("&")}`);
      const found = new Set((json.data ?? []).map((u) => u.id));
      for (const id of chunk) if (!found.has(id)) missing.add(id);
    } catch (e) {
      console.error("Vérification des comptes disparus impossible:", e);
    }
  }

  return missing;
}

/* ------------------------------------------------------------------ */
/* État                                                                */
/* ------------------------------------------------------------------ */

async function buildState(auth: UserTokenResult, doc: any | null, extra: Partial<UnfollowState> = {}): Promise<UnfollowState> {
  const status: SectionStatus =
    auth.status !== "ok" ? auth.status : auth.scopes.includes(FOLLOWERS_SCOPE) ? "ok" : "missing_scope";

  const list: any[] = ((doc?.departures ?? []) as any[]).slice(0, DEPARTURES_RETURNED);
  const infos = list.length ? await fetchUserInfos(list.map((d) => d.id)) : new Map();

  return {
    status,
    enabled: !!doc,
    tooLarge: false,
    limit: TRACKING_MAX_FOLLOWERS,
    total: null,
    tracked: doc?.followers?.length ?? 0,
    baselineAt: doc?.baselineAt ? new Date(doc.baselineAt).toISOString() : null,
    scannedAt: doc?.scannedAt ? new Date(doc.scannedAt).toISOString() : null,
    departures: list.map((d) => {
      const info = infos.get(d.id);
      return {
        id: d.id,
        // Anciens départs : pseudo déjà enregistré (utile si le compte a disparu depuis). Sinon, profil relu sur Twitch.
        login: d.login ?? info?.login ?? "",
        name: d.name ?? info?.name ?? "Compte introuvable",
        avatar: info?.avatar ?? null,
        followedAt: d.followedAt ?? null,
        detectedAt: new Date(d.detectedAt).toISOString(),
        accountGone: !!d.accountGone,
      };
    }),
    ...extra,
  };
}

export async function getUnfollowState(userId: string): Promise<UnfollowState | null> {
  const auth = await getUserAuth(userId);
  if (!auth) return null;

  await ensureDb();
  const doc = await compactDocument(userId, await FollowerTracking.findOne({ user: userId }).lean());
  return buildState(auth, doc);
}

/**
 * Lance une analyse.
 *  - "enable" : active le suivi (première analyse = point de départ, aucun départ à ce stade) ;
 *  - "scan"   : compare avec le dernier instantané et enregistre les départs.
 */
export async function runScan(userId: string, mode: "enable" | "scan"): Promise<UnfollowState | null> {
  const auth = await getUserAuth(userId);
  if (!auth) return null;

  await ensureDb();
  const doc: any = await FollowerTracking.findOne({ user: userId }).lean();

  if (auth.status !== "ok" || !auth.token || !auth.scopes.includes(FOLLOWERS_SCOPE)) return buildState(auth, doc);
  if (mode === "scan" && !doc) return buildState(auth, null);
  if (mode === "enable" && doc) return buildState(auth, doc);

  if (doc?.scannedAt) {
    const wait = SCAN_COOLDOWN_MS - (Date.now() - new Date(doc.scannedAt).getTime());
    if (wait > 0) return buildState(auth, doc, { note: "cooldown", retryInSeconds: Math.ceil(wait / 1000) });
  }

  if (scanning.has(userId)) return buildState(auth, doc, { note: "busy" });
  scanning.add(userId);

  try {
    const scan = await scanAllFollowers(auth.twitchId, auth.token);

    if (!scan.ok) {
      if (scan.reason === "too_large") return { ...(await buildState(auth, doc)), tooLarge: true, total: scan.total };
      if (scan.reason === "expired" || scan.reason === "missing_scope") {
        return { ...(await buildState(auth, doc)), status: scan.reason };
      }
      return buildState(auth, doc, { note: scan.reason === "incomplete" ? "incomplete" : "error" });
    }

    const now = new Date();
    // Instantané = identifiants seuls, en nombres (les identifiants Twitch sont numériques).
    const ids = scan.rows.map((r) => Number(r.user_id)).filter((id) => Number.isFinite(id));

    if (!doc) {
      await FollowerTracking.create({ user: userId, followers: ids, departures: [], baselineAt: now, scannedAt: now });
    } else {
      // Un document ancien peut encore contenir { i, l, n, f } : on s'en sert une dernière fois pour comparer.
      const previous = new Set<number>();
      const legacy = new Map<number, LegacyFollower>();
      for (const entry of (doc.followers ?? []) as (number | LegacyFollower)[]) {
        if (typeof entry === "number") previous.add(entry);
        else if (entry && typeof entry === "object") {
          const id = Number(entry.i);
          previous.add(id);
          legacy.set(id, entry);
        }
      }

      const current = new Set(ids);
      const departedIds = [...previous].filter((id) => !current.has(id));

      // Une personne revenue suivre la chaîne n'est plus « partie » : son ancienne entrée est retirée,
      // et si elle repart plus tard, ce sera un nouveau départ.
      const existing: any[] = ((doc.departures ?? []) as any[]).filter((d) => !current.has(Number(d.id)));
      const known = new Set(existing.map((d) => String(d.id)));
      const fresh = departedIds.filter((id) => !known.has(String(id)));

      let newDepartures: any[] = [];
      if (fresh.length > 0) {
        const gone = await findMissingAccounts(fresh.map(String));
        newDepartures = fresh.map((id) => {
          const old = legacy.get(id);
          return {
            id: String(id),
            detectedAt: now,
            accountGone: gone.has(String(id)),
            // Seul un compte disparu garde son dernier pseudo connu (introuvable sur Twitch) ; les autres sont relus par identifiant.
            ...(old && gone.has(String(id)) ? { login: old.l, name: old.n } : {}),
          };
        });
      }

      await FollowerTracking.updateOne(
        { user: userId },
        { $set: { followers: ids, departures: [...newDepartures, ...existing].slice(0, MAX_DEPARTURES), scannedAt: now } }
      );
    }

    const latest = await FollowerTracking.findOne({ user: userId }).lean();
    return buildState(auth, latest);
  } finally {
    scanning.delete(userId);
  }
}

/** Désactive le suivi et supprime immédiatement l'instantané et l'historique des départs. */
export async function disableTracking(userId: string): Promise<UnfollowState | null> {
  const auth = await getUserAuth(userId);
  if (!auth) return null;

  await ensureDb();
  await FollowerTracking.deleteOne({ user: userId });
  return buildState(auth, null);
}
