import {
  EDITORS_SCOPE,
  MODERATORS_SCOPE,
  VIPS_SCOPE,
  BITS_SCOPE,
  fetchSubscriberSummary,
  fetchUserInfos,
  getUserAuth,
  helixUser,
  type SectionStatus,
  type UserInfo,
  type UserTokenResult,
} from "@/lib/twitch-user";

/**
 * Équipe (modérateurs, éditeurs) et communauté (abonnés, VIPs, top bits) d'une chaîne.
 *
 * Distinction voulue : les modérateurs et les éditeurs sont du STAFF (ils ont des droits sur la chaîne).
 * Les VIPs, les abonnés et les cheerers sont de la COMMUNAUTÉ (simples badges / soutien, aucun droit).
 */

const SUBSCRIBERS_PAGE_SIZE = 100;
const SUBSCRIBERS_MAX_PAGES = 3;

export type TeamMember = {
  id: string;
  login: string;
  name: string;
  avatar: string | null;
  // Twitch ne fournit une date d'ajout que pour les éditeurs : ni les modérateurs ni les VIPs n'en ont.
  since: string | null;
};

export type TeamSection = {
  status: SectionStatus;
  total: number;
  capped: boolean; // true si la liste est tronquée (100 premiers)
  members: TeamMember[];
};

export type TeamData = { moderators: TeamSection; editors: TeamSection };

export type SubscriberMember = {
  id: string;
  login: string;
  name: string;
  avatar: string | null;
  tier: 1 | 2 | 3;
  isGift: boolean;
  gifter: string | null;
};

export type SubscribersSection = {
  status: SectionStatus;
  total: number | null;
  points: number | null;
  // Répartition calculée sur les `sampled` premiers abonnés (300 maximum).
  tiers: { tier1: number; tier2: number; tier3: number };
  gifted: number;
  sampled: number;
  capped: boolean;
  members: SubscriberMember[];
};

export type BitsEntry = { rank: number; id: string; login: string; name: string; avatar: string | null; score: number };
export type BitsSection = { status: SectionStatus; entries: BitsEntry[] };

export type CommunityData = {
  subscribers: SubscribersSection;
  vips: TeamSection;
  bits: BitsSection;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type ListResult = { status: SectionStatus; rows: any[]; capped: boolean };

async function fetchList(path: string, scope: string, auth: UserTokenResult): Promise<ListResult> {
  if (auth.status !== "ok" || !auth.token) return { status: auth.status, rows: [], capped: false };
  if (!auth.scopes.includes(scope)) return { status: "missing_scope", rows: [], capped: false };

  try {
    const res = await helixUser(path, auth.token);
    if (res.status === 401) return { status: "expired", rows: [], capped: false };
    if (res.status === 403) return { status: "missing_scope", rows: [], capped: false };
    if (res.status === 400) return { status: "unavailable", rows: [], capped: false };
    if (!res.ok) return { status: "error", rows: [], capped: false };

    const json = await res.json();
    return { status: "ok", rows: json.data ?? [], capped: !!json.pagination?.cursor };
  } catch (e) {
    console.error(`Erreur Twitch (${path.split("?")[0]}):`, e);
    return { status: "error", rows: [], capped: false };
  }
}

function toTeamSection(list: ListResult, infos: Map<string, UserInfo>, withSince = false): TeamSection {
  const members: TeamMember[] = list.rows
    .map((r) => ({
      id: String(r.user_id),
      // L'endpoint des éditeurs ne renvoie pas de user_login : on le déduit du pseudo.
      login: String(r.user_login ?? r.user_name).toLowerCase(),
      name: String(r.user_name),
      avatar: infos.get(String(r.user_id))?.avatar ?? null,
      since: withSince ? (r.created_at ?? null) : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));

  return { status: list.status, total: members.length, capped: list.capped, members };
}

/* ------------------------------------------------------------------ */
/* Équipe                                                              */
/* ------------------------------------------------------------------ */

export async function getTeam(userId: string): Promise<TeamData | null> {
  const auth = await getUserAuth(userId);
  if (!auth) return null;

  const [moderators, editors] = await Promise.all([
    fetchList(`/moderation/moderators?broadcaster_id=${auth.twitchId}&first=100`, MODERATORS_SCOPE, auth),
    // Cet endpoint renvoie tous les éditeurs d'un coup (pas de pagination).
    fetchList(`/channels/editors?broadcaster_id=${auth.twitchId}`, EDITORS_SCOPE, auth),
  ]);

  const infos = await fetchUserInfos([...moderators.rows, ...editors.rows].map((r) => String(r.user_id)));

  return {
    moderators: toTeamSection(moderators, infos),
    editors: toTeamSection(editors, infos, true),
  };
}

/* ------------------------------------------------------------------ */
/* Communauté                                                          */
/* ------------------------------------------------------------------ */

async function fetchSubscribers(twitchId: string, auth: UserTokenResult): Promise<SubscribersSection> {
  const empty = {
    total: null,
    points: null,
    tiers: { tier1: 0, tier2: 0, tier3: 0 },
    gifted: 0,
    sampled: 0,
    capped: false,
    members: [] as SubscriberMember[],
  };

  // Le résumé donne le vrai total (diffuseur exclu) et détecte les chaînes non éligibles (« unavailable »).
  const summary = await fetchSubscriberSummary(twitchId, auth);
  if (summary.status !== "ok") return { status: summary.status, ...empty };

  const rows: any[] = [];
  let cursor: string | undefined;
  let capped = false;

  for (let page = 0; page < SUBSCRIBERS_MAX_PAGES; page++) {
    const after = cursor ? `&after=${encodeURIComponent(cursor)}` : "";
    try {
      const res = await helixUser(
        `/subscriptions?broadcaster_id=${twitchId}&first=${SUBSCRIBERS_PAGE_SIZE}${after}`,
        auth.token!
      );
      if (!res.ok) {
        capped = true;
        break;
      }
      const json = await res.json();
      rows.push(...(json.data ?? []));
      cursor = json.pagination?.cursor;
      capped = !!cursor;
      if (!cursor) break;
    } catch (e) {
      console.error("Erreur liste abonnés Twitch:", e);
      capped = true;
      break;
    }
  }

  // Twitch inclut le diffuseur dans ses propres abonnés : on l'écarte.
  const subs = rows.filter((r) => String(r.user_id) !== twitchId);
  const infos = await fetchUserInfos(subs.map((r) => String(r.user_id)));

  const tierOf = (raw: string): 1 | 2 | 3 => (raw === "3000" ? 3 : raw === "2000" ? 2 : 1);

  const members: SubscriberMember[] = subs
    .map((r) => ({
      id: String(r.user_id),
      login: String(r.user_login ?? r.user_name).toLowerCase(),
      name: String(r.user_name),
      avatar: infos.get(String(r.user_id))?.avatar ?? null,
      tier: tierOf(String(r.tier)),
      isGift: !!r.is_gift,
      gifter: r.gifter_name ? String(r.gifter_name) : null,
    }))
    .sort((a, b) => b.tier - a.tier || a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));

  return {
    status: "ok",
    total: summary.total,
    points: summary.points,
    tiers: {
      tier1: members.filter((m) => m.tier === 1).length,
      tier2: members.filter((m) => m.tier === 2).length,
      tier3: members.filter((m) => m.tier === 3).length,
    },
    gifted: members.filter((m) => m.isGift).length,
    sampled: members.length,
    capped,
    members,
  };
}

async function fetchBits(auth: UserTokenResult): Promise<BitsSection> {
  // Classement du mois en cours (les 10 meilleurs cheerers).
  const list = await fetchList(`/bits/leaderboard?count=10&period=month`, BITS_SCOPE, auth);
  if (list.status !== "ok") return { status: list.status, entries: [] };

  const infos = await fetchUserInfos(list.rows.map((r) => String(r.user_id)));
  return {
    status: "ok",
    entries: list.rows.map((r) => ({
      rank: Number(r.rank) || 0,
      id: String(r.user_id),
      login: String(r.user_login ?? r.user_name).toLowerCase(),
      name: String(r.user_name),
      avatar: infos.get(String(r.user_id))?.avatar ?? null,
      score: Number(r.score) || 0,
    })),
  };
}

export async function getCommunity(userId: string): Promise<CommunityData | null> {
  const auth = await getUserAuth(userId);
  if (!auth) return null;

  const [subscribers, vipList, bits] = await Promise.all([
    fetchSubscribers(auth.twitchId, auth),
    fetchList(`/channels/vips?broadcaster_id=${auth.twitchId}&first=100`, VIPS_SCOPE, auth),
    fetchBits(auth),
  ]);

  const infos = await fetchUserInfos(vipList.rows.map((r) => String(r.user_id)));

  return { subscribers, vips: toTeamSection(vipList, infos), bits };
}
