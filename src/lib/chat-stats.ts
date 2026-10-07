import mongoose from "mongoose";
import ChatSession from "@/models/ChatSession";
import User from "@/models/User";
import { fetchUserInfos } from "@/lib/twitch-user";
import type { StatsPayload } from "@/lib/chat-stats-client";

/**
 * Statistiques de chat (optionnelles).
 *
 * Le widget chat compte les messages dans le navigateur et envoie des agrégats toutes les 30 secondes
 * (voir `chat-stats-client.ts`). Ici : validation de ces envois, regroupement en sessions, lecture pour le tableau
 * de bord. Le texte des messages n'est jamais reçu ni stocké.
 */

export const SESSION_GAP_MS = 30 * 60_000; // 30 min sans message = nouvelle session
export const RETENTION_DAYS = 90;
const SESSIONS_LISTED = 20;
const MAX_CHATTERS = 2500;
const MAX_EMOTES = 300;
const MAX_COMMANDS = 100;
const TOP_SHOWN = 10;

async function ensureDb() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }
}

/* ------------------------------------------------------------------ */
/* Validation des envois du widget                                     */
/* ------------------------------------------------------------------ */

const LOGIN_RE = /^[a-z0-9_]{1,25}$/;
const ID_RE = /^\d{1,12}$/;
const CMD_RE = /^![a-z0-9_-]{1,29}$/;

const clean = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);

const count = (v: unknown, max: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
};

const asArray = (v: unknown, max: number): any[] => (Array.isArray(v) ? v.slice(0, max) : []);

/**
 * Vérifie et nettoie un envoi. L'adresse du widget est un simple lien : n'importe qui qui la connaît peut
 * écrire dedans, donc chaque champ est borné et tout ce qui est hors format est écarté.
 */
export function parseStatsPayload(raw: unknown): StatsPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const nowMinute = Math.floor(Date.now() / 60000);

  const payload: StatsPayload = {
    messages: count(r.messages, 50_000),
    botMessages: count(r.botMessages, 50_000),
    commandMessages: count(r.commandMessages, 50_000),
    firstTimers: count(r.firstTimers, 5_000),
    emoteUses: count(r.emoteUses, 100_000),
    // Un envoi couvre ~30 s : on refuse les minutes trop anciennes ou dans le futur.
    activity: asArray(r.activity, 40)
      .map((a) => ({ t: Math.floor(Number(a?.t)), n: count(a?.n, 5_000) }))
      .filter((a) => Number.isFinite(a.t) && a.n > 0 && a.t >= nowMinute - 30 && a.t <= nowMinute + 1),
    chatters: asArray(r.chatters, 500)
      .map((c) => {
        const login = clean(c?.l, 25).toLowerCase();
        return {
          i: ID_RE.test(String(c?.i ?? "")) ? String(c.i) : "",
          l: login,
          n: clean(c?.n, 25) || login,
          c: count(c?.c, 5_000),
        };
      })
      .filter((c) => LOGIN_RE.test(c.l) && c.c > 0),
    emotes: asArray(r.emotes, 200)
      .map((e) => ({ k: clean(e?.k, 40), c: count(e?.c, 5_000) }))
      .filter((e) => e.k && e.c > 0),
    commands: asArray(r.commands, 50)
      .map((c) => ({ k: clean(c?.k, 30).toLowerCase(), c: count(c?.c, 5_000) }))
      .filter((c) => CMD_RE.test(c.k) && c.c > 0),
  };

  return payload;
}

export function isEmptyPayload(p: StatsPayload) {
  return p.messages === 0 && p.botMessages === 0 && p.commandMessages === 0;
}

/* ------------------------------------------------------------------ */
/* Enregistrement                                                      */
/* ------------------------------------------------------------------ */

type Counted = { k: string; c: number };

function mergeCounted(existing: Counted[], incoming: Counted[], max: number): Counted[] {
  const map = new Map<string, number>(existing.map((e) => [e.k, e.c]));
  for (const e of incoming) map.set(e.k, (map.get(e.k) ?? 0) + e.c);
  return [...map.entries()]
    .map(([k, c]) => ({ k, c }))
    .sort((a, b) => b.c - a.c)
    .slice(0, max);
}

// Un envoi à la fois par utilisateur : deux écritures simultanées sur la même session se perdraient mutuellement.
const queues = new Map<string, Promise<unknown>>();

export async function ingestChatStats(userId: string, payload: StatsPayload): Promise<void> {
  const previous = queues.get(userId) ?? Promise.resolve();
  const run = previous.catch(() => {}).then(() => writePayload(userId, payload));
  queues.set(userId, run);
  try {
    await run;
  } finally {
    if (queues.get(userId) === run) queues.delete(userId);
  }
}

async function writePayload(userId: string, p: StatsPayload) {
  await ensureDb();
  const now = new Date();

  let session: any = await ChatSession.findOne({ user: userId }).sort({ lastAt: -1 });
  if (!session || now.getTime() - new Date(session.lastAt).getTime() > SESSION_GAP_MS) {
    const firstMinute = p.activity.length ? Math.min(...p.activity.map((a) => a.t)) : null;
    const startedAt = firstMinute != null ? new Date(firstMinute * 60000) : now;
    session = new ChatSession({ user: userId, startedAt, lastAt: now });
  }

  session.messages += p.messages;
  session.botMessages += p.botMessages;
  session.commandMessages += p.commandMessages;
  session.firstTimers += p.firstTimers;
  session.emoteUses += p.emoteUses;
  session.lastAt = now;

  // Spectateurs : fusion par identifiant Twitch (à défaut, par login).
  const chatters = new Map<string, { i: string; l: string; n: string; c: number }>();
  for (const c of session.chatters as any[]) chatters.set(c.i || c.l, { i: c.i || "", l: c.l, n: c.n, c: c.c });
  let added = 0;
  for (const c of p.chatters) {
    const key = c.i || c.l;
    const existing = chatters.get(key);
    if (existing) {
      existing.c += c.c;
      existing.n = c.n;
    } else {
      chatters.set(key, { ...c });
      added++;
    }
  }
  session.uniqueChatters += added;
  session.chatters = [...chatters.values()].sort((a, b) => b.c - a.c).slice(0, MAX_CHATTERS);

  session.emotes = mergeCounted(session.emotes as Counted[], p.emotes, MAX_EMOTES);
  session.commands = mergeCounted(session.commands as Counted[], p.commands, MAX_COMMANDS);

  const activity = new Map<number, number>((session.activity as { t: number; n: number }[]).map((a) => [a.t, a.n]));
  for (const a of p.activity) activity.set(a.t, (activity.get(a.t) ?? 0) + a.n);
  session.activity = [...activity.entries()].map(([t, n]) => ({ t, n })).sort((a, b) => a.t - b.t);

  await session.save();
}

/* ------------------------------------------------------------------ */
/* Lecture pour le tableau de bord                                     */
/* ------------------------------------------------------------------ */

export type ChatSessionSummary = {
  id: string;
  startedAt: string;
  lastAt: string;
  durationMin: number;
  messages: number;
  uniqueChatters: number;
  msgsPerMin: number;
  peakCount: number; // pic de messages sur une minute
  peakAt: string | null;
};

export type ChatRankRow = {
  key: string;
  name: string;
  login: string;
  avatar: string | null;
  count: number;
  share?: number; // part des messages de la session, en %
  sessions?: number; // nombre de sessions où la personne a écrit
};

export type ChatStatsData = {
  enabled: boolean;
  enabledAt: string | null;
  retentionDays: number;
  lastDataAt: string | null;
  sessions: ChatSessionSummary[];
  selected: null | {
    summary: ChatSessionSummary;
    botMessages: number;
    commandMessages: number;
    firstTimers: number;
    emoteUses: number;
    activity: { startMs: number; stepMin: number; values: number[] };
    topChatters: ChatRankRow[];
    topEmotes: { name: string; count: number }[];
    topCommands: { name: string; count: number }[];
    // Écart en % avec la moyenne des autres sessions listées (null si aucune autre session ou moyenne nulle).
    vsAverage: null | { messages: number | null; chatters: number | null; msgsPerMin: number | null; durationMin: number | null; sample: number };
  };
  regulars: ChatRankRow[];
};

function summarize(s: any): ChatSessionSummary {
  const start = new Date(s.startedAt).getTime();
  const last = new Date(s.lastAt).getTime();
  const durationMin = Math.max(1, Math.round((last - start) / 60000));
  const peak = ((s.activity ?? []) as { t: number; n: number }[]).reduce<{ t: number; n: number } | null>(
    (top, a) => (!top || a.n > top.n ? a : top),
    null
  );

  return {
    id: String(s._id),
    startedAt: new Date(start).toISOString(),
    lastAt: new Date(last).toISOString(),
    durationMin,
    messages: s.messages ?? 0,
    uniqueChatters: s.uniqueChatters ?? 0,
    msgsPerMin: Math.round(((s.messages ?? 0) / durationMin) * 10) / 10,
    peakCount: peak?.n ?? 0,
    peakAt: peak ? new Date(peak.t * 60000).toISOString() : null,
  };
}

// Courbe d'activité continue (minutes sans message = 0), regroupée par tranches si la session est longue.
function buildActivity(s: any) {
  const acts = (s.activity ?? []) as { t: number; n: number }[];
  const startMin = Math.floor(new Date(s.startedAt).getTime() / 60000);
  const endMin = Math.floor(new Date(s.lastAt).getTime() / 60000);
  const first = Math.min(startMin, ...acts.map((a) => a.t));
  const last = Math.max(endMin, ...acts.map((a) => a.t));
  const total = last - first + 1;
  const stepMin = total > 2000 ? 30 : total > 720 ? 10 : total > 360 ? 5 : total > 120 ? 2 : 1;

  const values = new Array(Math.ceil(total / stepMin)).fill(0);
  for (const a of acts) values[Math.floor((a.t - first) / stepMin)] += a.n;

  return { startMs: first * 60000, stepMin, values };
}

const percentVs = (value: number, average: number) => (average > 0 ? Math.round(((value - average) / average) * 100) : null);

export async function getChatStats(userId: string, sessionId?: string | null): Promise<ChatStatsData> {
  await ensureDb();

  const user: any = await User.findById(userId, "chatStats").lean();
  const docs: any[] = await ChatSession.find({ user: userId }).sort({ startedAt: -1 }).limit(SESSIONS_LISTED).lean();

  const sessions = docs.map(summarize);
  const base = {
    enabled: !!user?.chatStats?.enabled,
    enabledAt: user?.chatStats?.enabledAt ? new Date(user.chatStats.enabledAt).toISOString() : null,
    retentionDays: RETENTION_DAYS,
    lastDataAt: docs[0]?.lastAt ? new Date(docs[0].lastAt).toISOString() : null,
    sessions,
  };

  if (docs.length === 0) return { ...base, selected: null, regulars: [] };

  const selectedDoc = (sessionId && docs.find((d) => String(d._id) === sessionId)) || docs[0];
  const summary = summarize(selectedDoc);

  // Comparaison avec la moyenne des autres sessions listées.
  const others = sessions.filter((s) => s.id !== summary.id);
  const avg = (pick: (s: ChatSessionSummary) => number) => (others.length ? others.reduce((sum, s) => sum + pick(s), 0) / others.length : 0);
  const vsAverage = others.length
    ? {
        messages: percentVs(summary.messages, avg((s) => s.messages)),
        chatters: percentVs(summary.uniqueChatters, avg((s) => s.uniqueChatters)),
        msgsPerMin: percentVs(summary.msgsPerMin, avg((s) => s.msgsPerMin)),
        durationMin: percentVs(summary.durationMin, avg((s) => s.durationMin)),
        sample: others.length,
      }
    : null;

  // Regroupe les spectateurs de toutes les sessions listées (des plus récentes aux plus anciennes).
  const regularsMap = new Map<string, { i: string; l: string; n: string; c: number; sessions: number }>();
  for (const d of docs) {
    for (const c of (d.chatters ?? []) as { i: string; l: string; n: string; c: number }[]) {
      const key = c.i || c.l;
      const entry = regularsMap.get(key);
      if (entry) {
        entry.c += c.c;
        entry.sessions += 1;
      } else {
        regularsMap.set(key, { i: c.i || "", l: c.l, n: c.n, c: c.c, sessions: 1 });
      }
    }
  }
  const regularsTop = [...regularsMap.values()].sort((a, b) => b.c - a.c).slice(0, TOP_SHOWN);

  const chatterTop = ((selectedDoc.chatters ?? []) as { i: string; l: string; n: string; c: number }[])
    .slice()
    .sort((a, b) => b.c - a.c)
    .slice(0, TOP_SHOWN);

  // Avatars (un seul appel Twitch, mis en cache) pour les deux classements.
  const infos = await fetchUserInfos([...chatterTop, ...regularsTop].map((c) => c.i).filter(Boolean));
  const avatarOf = (id: string) => (id ? (infos.get(id)?.avatar ?? null) : null);

  const topChatters: ChatRankRow[] = chatterTop.map((c) => ({
    key: c.i || c.l,
    name: c.n,
    login: c.l,
    avatar: avatarOf(c.i),
    count: c.c,
    share: summary.messages > 0 ? Math.round((c.c / summary.messages) * 1000) / 10 : 0,
  }));

  const regulars: ChatRankRow[] = regularsTop.map((c) => ({
    key: c.i || c.l,
    name: c.n,
    login: c.l,
    avatar: avatarOf(c.i),
    count: c.c,
    sessions: c.sessions,
  }));

  const top = (list: Counted[]) =>
    list
      .slice()
      .sort((a, b) => b.c - a.c)
      .slice(0, TOP_SHOWN)
      .map((e) => ({ name: e.k, count: e.c }));

  return {
    ...base,
    selected: {
      summary,
      botMessages: selectedDoc.botMessages ?? 0,
      commandMessages: selectedDoc.commandMessages ?? 0,
      firstTimers: selectedDoc.firstTimers ?? 0,
      emoteUses: selectedDoc.emoteUses ?? 0,
      activity: buildActivity(selectedDoc),
      topChatters,
      topEmotes: top((selectedDoc.emotes ?? []) as Counted[]),
      topCommands: top((selectedDoc.commands ?? []) as Counted[]),
      vsAverage,
    },
    regulars,
  };
}

/* ------------------------------------------------------------------ */
/* Réglages                                                            */
/* ------------------------------------------------------------------ */

export async function setChatStatsEnabled(userId: string, enabled: boolean) {
  await ensureDb();
  await User.updateOne(
    { _id: userId },
    enabled ? { $set: { "chatStats.enabled": true, "chatStats.enabledAt": new Date() } } : { $set: { "chatStats.enabled": false } }
  );
}

/** Supprime toutes les sessions enregistrées (la collecte, elle, n'est pas modifiée). */
export async function deleteChatStats(userId: string): Promise<number> {
  await ensureDb();
  const result = await ChatSession.deleteMany({ user: userId });
  return result.deletedCount ?? 0;
}
