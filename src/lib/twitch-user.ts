import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getAppAccessToken } from "@/lib/twitch";

/**
 * Statistiques de chaîne Twitch d'un utilisateur connecté.
 *
 * - Followers, abonnés, équipe, communauté : jeton de l'utilisateur, avec des scopes en lecture seule.
 * - Profil, live, diffusions, clips, planning, avatars : données publiques, lues avec le jeton d'application.
 *
 * Le jeton utilisateur est stocké par l'adapter NextAuth dans la collection `accounts`.
 * Les jetons Twitch expirent (~4 h) : on le rafraîchit avec le refresh_token quand il est périmé.
 *
 * Ce module contient le cœur (jeton, appels Helix, avatars) et la vue d'ensemble.
 * L'équipe et la communauté sont dans `twitch-community.ts`, le suivi des départs dans `twitch-unfollows.ts`.
 */

const HELIX = "https://api.twitch.tv/helix";

export const FOLLOWERS_SCOPE = "moderator:read:followers";
export const MODERATORS_SCOPE = "moderation:read";
export const VIPS_SCOPE = "channel:read:vips";
export const EDITORS_SCOPE = "channel:read:editors";
export const SUBSCRIPTIONS_SCOPE = "channel:read:subscriptions";
export const BITS_SCOPE = "bits:read";
// Toutes en lecture seule, sur la propre chaîne de l'utilisateur.
export const TWITCH_LOGIN_SCOPES = [
  "openid",
  "user:read:email",
  FOLLOWERS_SCOPE,
  MODERATORS_SCOPE,
  VIPS_SCOPE,
  EDITORS_SCOPE,
  SUBSCRIPTIONS_SCOPE,
  BITS_SCOPE,
].join(" ");

const DAY_MS = 24 * 3600 * 1000;
const CACHE_TTL_MS = 30_000;
// Échantillon de followers pour les gains et le graphique : 3 pages de 100 = les 300 derniers.
const FOLLOWERS_PAGE_SIZE = 100;
const FOLLOWERS_MAX_PAGES = 3;
const RECENT_FOLLOWERS_SHOWN = 10;
const VIDEOS_FETCHED = 20;
const VIDEOS_SHOWN = 6;
const CLIPS_FETCHED = 100;
const CLIPS_SHOWN = 6;

/**
 * - ok            : données disponibles
 * - missing_scope : permission Twitch non accordée (reconnexion nécessaire)
 * - expired       : jeton expiré ou révoqué (reconnexion nécessaire)
 * - unavailable   : fonctionnalité réservée (par exemple abonnements : affiliés et partenaires uniquement)
 * - error         : erreur temporaire de Twitch
 */
export type SectionStatus = "ok" | "missing_scope" | "expired" | "unavailable" | "error";
export type FollowersStatus = SectionStatus;

export type TwitchFollower = {
  id: string;
  login: string;
  name: string;
  followedAt: string;
  avatar: string | null;
};

export type TwitchVideo = {
  id: string;
  title: string;
  url: string;
  thumbnail: string | null;
  durationSeconds: number;
  views: number;
  createdAt: string;
};

export type TwitchClip = {
  id: string;
  title: string;
  url: string;
  thumbnail: string | null;
  views: number;
  creator: string;
  createdAt: string;
};

export type TwitchSegment = {
  id: string;
  title: string;
  start: string;
  end: string | null;
  category: string | null;
  isRecurring: boolean;
};

export type VideoStats = {
  count: number;
  totalViews: number;
  avgViews: number;
  totalSeconds: number;
  avgSeconds: number;
  last30dCount: number;
  last30dSeconds: number;
  last30dCapped: boolean; // true si les 20 diffusions analysées sont toutes dans les 30 derniers jours
  best: { title: string; url: string; views: number } | null;
};

export type ClipStats = {
  count: number;
  totalViews: number;
  capped: boolean; // true si 100 clips ont été analysés (il peut y en avoir plus)
  topCreators: { name: string; clips: number; views: number }[];
};

export type SubscriberSummary = {
  status: SectionStatus;
  total: number | null;
  points: number | null;
};

export type TwitchStats = {
  channel: {
    id: string;
    login: string;
    name: string;
    avatar: string | null;
    // Image « hors ligne » de la chaîne : la bannière de profil n'est pas exposée par l'API Twitch.
    banner: string | null;
    broadcasterType: string;
    description: string;
    createdAt: string | null;
    language: string | null;
    title: string | null;
    game: string | null;
    tags: string[];
  };
  live: {
    isLive: boolean;
    title: string | null;
    game: string | null;
    viewers: number;
    startedAt: string | null;
    thumbnail: string | null;
  };
  followers: {
    status: SectionStatus;
    total: number | null;
    recent: TwitchFollower[];
    // Gains calculés sur les 300 derniers followers : si l'échantillon ne remonte pas assez loin, la valeur est un minimum.
    gained24h: number;
    gained24hCapped: boolean;
    gained7d: number;
    gained7dCapped: boolean;
    gained30d: number;
    gained30dCapped: boolean;
    // Dates de suivi de l'échantillon (ISO), regroupées par jour côté client (fuseau de l'utilisateur).
    sample: string[];
    sampleCapped: boolean;
  };
  subscribers: SubscriberSummary;
  videos: TwitchVideo[];
  videoStats: VideoStats;
  clips: TwitchClip[];
  clipStats: ClipStats;
  schedule: TwitchSegment[];
  fetchedAt: string;
};

export type FollowersPage = {
  status: SectionStatus;
  total: number | null;
  followers: TwitchFollower[];
  cursor: string | null; // à renvoyer en `after` pour la page suivante, null = dernière page
};

/* ------------------------------------------------------------------ */
/* Jeton utilisateur                                                   */
/* ------------------------------------------------------------------ */

function parseScopes(scope: unknown): string[] {
  if (Array.isArray(scope)) return scope.map(String);
  return String(scope || "")
    .split(/[ ,]+/)
    .filter(Boolean);
}

const refreshing = new Map<string, Promise<string | null>>();

async function refreshAccessToken(userObjectId: ObjectId, refreshToken: string): Promise<string | null> {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.access_token) return null;

  const client = await clientPromise;
  await client
    .db()
    .collection("accounts")
    .updateOne(
      { userId: userObjectId, provider: "twitch" },
      {
        $set: {
          access_token: data.access_token,
          // Twitch fait tourner le refresh_token : il faut conserver le nouveau.
          refresh_token: data.refresh_token ?? refreshToken,
          expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 14400),
          ...(data.scope ? { scope: data.scope } : {}),
        },
      }
    );

  return data.access_token as string;
}

export type UserTokenResult = {
  twitchId: string;
  token: string | null;
  status: "ok" | "missing_scope" | "expired";
  scopes: string[]; // permissions réellement accordées sur le jeton
};

export async function getUserAuth(userId: string): Promise<UserTokenResult | null> {
  const client = await clientPromise;
  const userObjectId = new ObjectId(userId);
  const account = await client.db().collection("accounts").findOne({ userId: userObjectId, provider: "twitch" });
  if (!account) return null;

  const twitchId = String(account.providerAccountId);
  const scopes = parseScopes(account.scope);

  // Sans jeton : il faut se reconnecter. Les scopes manquants sont gérés section par section.
  if (!account.access_token) {
    return { twitchId, token: null, status: "missing_scope", scopes };
  }

  const stillValid = typeof account.expires_at === "number" && account.expires_at * 1000 - 60_000 > Date.now();
  if (stillValid) return { twitchId, token: account.access_token as string, status: "ok", scopes };

  if (!account.refresh_token) return { twitchId, token: null, status: "expired", scopes };

  // Une seule actualisation à la fois par utilisateur : Twitch invalide l'ancien refresh_token après usage.
  let pending = refreshing.get(userId);
  if (!pending) {
    pending = refreshAccessToken(userObjectId, account.refresh_token as string).finally(() => refreshing.delete(userId));
    refreshing.set(userId, pending);
  }
  const token = await pending;
  return token ? { twitchId, token, status: "ok", scopes } : { twitchId, token: null, status: "expired", scopes };
}

/* ------------------------------------------------------------------ */
/* Appels Helix                                                        */
/* ------------------------------------------------------------------ */

export async function helixApp<T>(path: string): Promise<T> {
  const token = await getAppAccessToken();
  const res = await fetch(`${HELIX}${path}`, {
    headers: { "Client-ID": process.env.TWITCH_CLIENT_ID!, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Twitch ${res.status} sur ${path.split("?")[0]}`);
  return res.json() as Promise<T>;
}

export function helixUser(path: string, token: string) {
  return fetch(`${HELIX}${path}`, {
    headers: { "Client-ID": process.env.TWITCH_CLIENT_ID!, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

export function thumb(url: string | null | undefined, size = "320x180"): string | null {
  if (!url) return null;
  return url.replace("%{width}x%{height}", size).replace("{width}x{height}", size);
}

// "3h2m1s" -> secondes
function parseDuration(value: string | undefined): number {
  if (!value) return 0;
  const m = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/.exec(value);
  if (!m) return 0;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

/* ------------------------------------------------------------------ */
/* Avatars et infos de profil (avec cache mémoire)                     */
/* ------------------------------------------------------------------ */

export type UserInfo = { avatar: string | null; createdAt: string | null };

// Les avatars Twitch sont servis en 300x300 par défaut (30 à 60 Ko pièce) : pour les listes on demande
// la variante 70x70 que le CDN fournit en remplaçant le suffixe de taille (nette jusqu'à ~35 px en affichage retina).
function smallAvatar(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/-\d+x\d+(\.\w+)$/, "-70x70$1");
}

const USER_INFO_TTL_MS = 6 * 3600 * 1000;
const USER_INFO_MAX = 5000;
const userInfoCache = new Map<string, { at: number; info: UserInfo }>();

/**
 * Avatar et date de création de compte pour une liste d'identifiants Twitch (100 par appel).
 * Les comptes introuvables (supprimés, bannis) sont simplement absents du résultat.
 * Une erreur Twitch n'interrompt rien : on renvoie ce qu'on a.
 */
export async function fetchUserInfos(ids: string[]): Promise<Map<string, UserInfo>> {
  const result = new Map<string, UserInfo>();
  const missing: string[] = [];
  const now = Date.now();

  for (const id of new Set(ids.filter(Boolean))) {
    const cached = userInfoCache.get(id);
    if (cached && now - cached.at < USER_INFO_TTL_MS) result.set(id, cached.info);
    else missing.push(id);
  }

  const chunks: string[][] = [];
  for (let i = 0; i < missing.length; i += 100) chunks.push(missing.slice(i, i + 100));

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const json = await helixApp<{ data: any[] }>(`/users?${chunk.map((id) => `id=${encodeURIComponent(id)}`).join("&")}`);
        for (const u of json.data ?? []) {
          const info: UserInfo = { avatar: smallAvatar(u.profile_image_url), createdAt: u.created_at ?? null };
          userInfoCache.set(u.id, { at: now, info });
          result.set(u.id, info);
        }
      } catch (e) {
        console.error("Erreur récupération des avatars Twitch:", e);
      }
    })
  );

  // Garde la mémoire sous contrôle : on écarte les entrées les plus anciennes (ordre d'insertion).
  if (userInfoCache.size > USER_INFO_MAX) {
    const overflow = userInfoCache.size - USER_INFO_MAX;
    let removed = 0;
    for (const key of userInfoCache.keys()) {
      userInfoCache.delete(key);
      if (++removed >= overflow) break;
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/* Followers                                                           */
/* ------------------------------------------------------------------ */

export type FollowerRow = { user_id: string; user_login: string; user_name: string; followed_at: string };

async function attachAvatars(rows: FollowerRow[]): Promise<TwitchFollower[]> {
  const infos = await fetchUserInfos(rows.map((r) => r.user_id));
  return rows.map((r) => ({
    id: r.user_id,
    login: r.user_login,
    name: r.user_name,
    followedAt: r.followed_at,
    avatar: infos.get(r.user_id)?.avatar ?? null,
  }));
}

async function fetchFollowers(twitchId: string, auth: UserTokenResult): Promise<TwitchStats["followers"]> {
  const empty = {
    total: null,
    recent: [] as TwitchFollower[],
    gained24h: 0,
    gained24hCapped: false,
    gained7d: 0,
    gained7dCapped: false,
    gained30d: 0,
    gained30dCapped: false,
    sample: [] as string[],
    sampleCapped: false,
  };

  if (auth.status !== "ok" || !auth.token) return { status: auth.status, ...empty };
  if (!auth.scopes.includes(FOLLOWERS_SCOPE)) return { status: "missing_scope", ...empty };

  try {
    const rows: FollowerRow[] = [];
    let total: number | null = null;
    let cursor: string | undefined;
    let hasMore = false;

    for (let page = 0; page < FOLLOWERS_MAX_PAGES; page++) {
      const after = cursor ? `&after=${encodeURIComponent(cursor)}` : "";
      const res = await helixUser(
        `/channels/followers?broadcaster_id=${twitchId}&first=${FOLLOWERS_PAGE_SIZE}${after}`,
        auth.token
      );

      if (page === 0) {
        if (res.status === 401) return { status: "expired", ...empty };
        if (res.status === 403) return { status: "missing_scope", ...empty };
        if (!res.ok) return { status: "error", ...empty };
      } else if (!res.ok) {
        // Une page suivante qui échoue ne doit pas faire perdre les premières : on garde ce qu'on a.
        hasMore = true;
        break;
      }

      const json = await res.json();
      if (page === 0) total = typeof json.total === "number" ? json.total : null;
      rows.push(...((json.data ?? []) as FollowerRow[]));

      cursor = json.pagination?.cursor;
      hasMore = !!cursor;
      if (!cursor) break;
    }

    const now = Date.now();
    const times = rows.map((f) => new Date(f.followed_at).getTime());
    const oldest = times.length ? Math.min(...times) : Infinity;
    const gains = (windowMs: number) => {
      const since = now - windowMs;
      return { count: times.filter((t) => t >= since).length, capped: hasMore && oldest >= since };
    };
    const g24 = gains(DAY_MS);
    const g7 = gains(7 * DAY_MS);
    const g30 = gains(30 * DAY_MS);

    return {
      status: "ok",
      total,
      recent: await attachAvatars(rows.slice(0, RECENT_FOLLOWERS_SHOWN)),
      gained24h: g24.count,
      gained24hCapped: g24.capped,
      gained7d: g7.count,
      gained7dCapped: g7.capped,
      gained30d: g30.count,
      gained30dCapped: g30.capped,
      sample: rows.map((f) => f.followed_at),
      sampleCapped: hasMore,
    };
  } catch (e) {
    console.error("Erreur followers Twitch:", e);
    return { status: "error", ...empty };
  }
}

/**
 * Une page de la liste complète des followers, du plus récent au plus ancien.
 * Twitch ne pagine que vers l'avant : le client conserve la pile des curseurs pour revenir en arrière.
 */
export async function getFollowersPage(userId: string, after?: string | null, first = 25): Promise<FollowersPage | null> {
  const auth = await getUserAuth(userId);
  if (!auth) return null;

  const base = { total: null, followers: [] as TwitchFollower[], cursor: null };
  if (auth.status !== "ok" || !auth.token) return { status: auth.status, ...base };
  if (!auth.scopes.includes(FOLLOWERS_SCOPE)) return { status: "missing_scope", ...base };

  const size = Math.min(Math.max(Math.floor(first) || 25, 1), 100);
  const afterParam = after ? `&after=${encodeURIComponent(after)}` : "";

  try {
    const res = await helixUser(`/channels/followers?broadcaster_id=${auth.twitchId}&first=${size}${afterParam}`, auth.token);
    if (res.status === 401) return { status: "expired", ...base };
    if (res.status === 403) return { status: "missing_scope", ...base };
    if (!res.ok) return { status: "error", ...base };

    const json = await res.json();
    return {
      status: "ok",
      total: typeof json.total === "number" ? json.total : null,
      followers: await attachAvatars((json.data ?? []) as FollowerRow[]),
      cursor: json.pagination?.cursor ?? null,
    };
  } catch (e) {
    console.error("Erreur page followers Twitch:", e);
    return { status: "error", ...base };
  }
}

/* ------------------------------------------------------------------ */
/* Abonnés (résumé)                                                    */
/* ------------------------------------------------------------------ */

/**
 * Nombre d'abonnés et points d'abonnement. Réservé aux affiliés et partenaires (sinon : « unavailable »).
 *
 * Twitch inclut le diffuseur lui-même dans la liste de ses abonnés : on le détecte avec une seconde requête
 * ciblée sur son propre identifiant et on le retire du total.
 */
export async function fetchSubscriberSummary(twitchId: string, auth: UserTokenResult): Promise<SubscriberSummary> {
  const base = { total: null, points: null };

  if (auth.status !== "ok" || !auth.token) return { status: auth.status, ...base };
  if (!auth.scopes.includes(SUBSCRIPTIONS_SCOPE)) return { status: "missing_scope", ...base };

  try {
    const [res, selfRes] = await Promise.all([
      helixUser(`/subscriptions?broadcaster_id=${twitchId}&first=1`, auth.token),
      helixUser(`/subscriptions?broadcaster_id=${twitchId}&user_id=${twitchId}`, auth.token),
    ]);

    if (res.status === 401) return { status: "expired", ...base };
    if (res.status === 403) return { status: "missing_scope", ...base };
    if (res.status === 400) return { status: "unavailable", ...base };
    if (!res.ok) return { status: "error", ...base };

    const json = await res.json();
    const selfJson = selfRes.ok ? await selfRes.json() : { data: [] };
    const selfSub = ((selfJson.data ?? []) as any[]).length > 0 ? 1 : 0;

    return {
      status: "ok",
      total: Math.max(0, (typeof json.total === "number" ? json.total : 0) - selfSub),
      points: typeof json.points === "number" ? json.points : null,
    };
  } catch (e) {
    console.error("Erreur abonnés Twitch:", e);
    return { status: "error", ...base };
  }
}

/* ------------------------------------------------------------------ */
/* Contenu : diffusions, clips                                         */
/* ------------------------------------------------------------------ */

function buildVideoStats(list: TwitchVideo[]): VideoStats {
  const since30d = Date.now() - 30 * DAY_MS;
  const count = list.length;
  const totalViews = list.reduce((sum, v) => sum + v.views, 0);
  const totalSeconds = list.reduce((sum, v) => sum + v.durationSeconds, 0);
  const recent = list.filter((v) => new Date(v.createdAt).getTime() >= since30d);
  const best = list.reduce<TwitchVideo | null>((top, v) => (!top || v.views > top.views ? v : top), null);
  const oldest = count ? Math.min(...list.map((v) => new Date(v.createdAt).getTime())) : Infinity;

  return {
    count,
    totalViews,
    avgViews: count ? Math.round(totalViews / count) : 0,
    totalSeconds,
    avgSeconds: count ? Math.round(totalSeconds / count) : 0,
    last30dCount: recent.length,
    last30dSeconds: recent.reduce((sum, v) => sum + v.durationSeconds, 0),
    last30dCapped: count >= VIDEOS_FETCHED && oldest >= since30d,
    best: best && best.views > 0 ? { title: best.title, url: best.url, views: best.views } : null,
  };
}

function buildClipStats(list: TwitchClip[]): ClipStats {
  const byCreator = new Map<string, { clips: number; views: number }>();
  for (const c of list) {
    if (!c.creator) continue;
    const entry = byCreator.get(c.creator) ?? { clips: 0, views: 0 };
    entry.clips += 1;
    entry.views += c.views;
    byCreator.set(c.creator, entry);
  }

  return {
    count: list.length,
    totalViews: list.reduce((sum, c) => sum + c.views, 0),
    capped: list.length >= CLIPS_FETCHED,
    topCreators: [...byCreator.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.clips - a.clips || b.views - a.views)
      .slice(0, 5),
  };
}

/* ------------------------------------------------------------------ */
/* Vue d'ensemble                                                      */
/* ------------------------------------------------------------------ */

const cache = new Map<string, { at: number; data: TwitchStats }>();

export async function getTwitchStats(userId: string): Promise<TwitchStats | null> {
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const auth = await getUserAuth(userId);
  if (!auth) return null;
  const { twitchId } = auth;

  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * DAY_MS);
  const none = { data: [] as any[] };

  const [profile, channel, stream, videos, clips, schedule, followers, subscribers] = await Promise.all([
    helixApp<{ data: any[] }>(`/users?id=${twitchId}`),
    helixApp<{ data: any[] }>(`/channels?broadcaster_id=${twitchId}`).catch(() => none),
    helixApp<{ data: any[] }>(`/streams?user_id=${twitchId}`).catch(() => none),
    helixApp<{ data: any[] }>(`/videos?user_id=${twitchId}&type=archive&first=${VIDEOS_FETCHED}`).catch(() => none),
    helixApp<{ data: any[] }>(
      `/clips?broadcaster_id=${twitchId}&first=${CLIPS_FETCHED}&started_at=${encodeURIComponent(monthAgo.toISOString())}&ended_at=${encodeURIComponent(now.toISOString())}`
    ).catch(() => none),
    // 404 si la chaîne n'a pas de planning : on l'ignore.
    helixApp<{ data: { segments?: any[] } }>(`/schedule?broadcaster_id=${twitchId}&first=10`).catch(() => ({
      data: { segments: [] as any[] },
    })),
    fetchFollowers(twitchId, auth),
    fetchSubscriberSummary(twitchId, auth),
  ]);

  const me = profile.data?.[0];
  if (!me) throw new Error("Profil Twitch introuvable");

  const live = stream.data?.[0];
  const info = channel.data?.[0];

  const videoList: TwitchVideo[] = (videos.data ?? []).map((v) => ({
    id: v.id,
    title: v.title || "Sans titre",
    url: v.url,
    thumbnail: thumb(v.thumbnail_url),
    durationSeconds: parseDuration(v.duration),
    views: v.view_count ?? 0,
    createdAt: v.created_at,
  }));

  const clipList: TwitchClip[] = (clips.data ?? []).map((c) => ({
    id: c.id,
    title: c.title || "Sans titre",
    url: c.url,
    thumbnail: thumb(c.thumbnail_url),
    views: c.view_count ?? 0,
    creator: c.creator_name || "",
    createdAt: c.created_at,
  }));

  const segments: TwitchSegment[] = ((schedule.data?.segments ?? []) as any[])
    .filter((s) => !s.canceled_until)
    .slice(0, 3)
    .map((s) => ({
      id: s.id,
      title: s.title || "Stream prévu",
      start: s.start_time,
      end: s.end_time ?? null,
      category: s.category?.name ?? null,
      isRecurring: !!s.is_recurring,
    }));

  const stats: TwitchStats = {
    channel: {
      id: me.id,
      login: me.login,
      name: me.display_name,
      avatar: me.profile_image_url || null,
      banner: me.offline_image_url || null,
      broadcasterType: me.broadcaster_type || "",
      description: me.description || "",
      createdAt: me.created_at ?? null,
      language: info?.broadcaster_language || null,
      title: info?.title || null,
      game: info?.game_name || null,
      tags: Array.isArray(info?.tags) ? info.tags.slice(0, 8) : [],
    },
    live: {
      isLive: !!live,
      title: live?.title ?? null,
      game: live?.game_name || null,
      viewers: live?.viewer_count ?? 0,
      startedAt: live?.started_at ?? null,
      thumbnail: thumb(live?.thumbnail_url, "640x360"),
    },
    followers,
    subscribers,
    videos: videoList.slice(0, VIDEOS_SHOWN),
    videoStats: buildVideoStats(videoList),
    clips: clipList.slice(0, CLIPS_SHOWN),
    clipStats: buildClipStats(clipList),
    schedule: segments,
    fetchedAt: now.toISOString(),
  };

  // On ne met pas en cache un état « reconnexion requise » : il doit disparaître dès que l'utilisateur se reconnecte.
  const needsReauth = [followers.status, subscribers.status].some((s) => s === "missing_scope" || s === "expired");
  if (!needsReauth) cache.set(userId, { at: Date.now(), data: stats });

  return stats;
}
