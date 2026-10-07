"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Users, Gauge, Zap, Smile, Terminal, Bot, UserPlus, RefreshCw, Trash2, Power, Clock,
  TrendingUp, TrendingDown, Trophy, Info, AlertTriangle, History,
} from "lucide-react";
import type { ChatStatsData, ChatSessionSummary, ChatRankRow } from "@/lib/chat-stats";

/**
 * Onglet « Chat » de la page Twitch : statistiques du chat collectées par le widget chat (optionnel).
 * Autonome : il charge et met à jour ses propres données, et gère l'activation, la désactivation
 * et la suppression de l'historique.
 */

const nf = new Intl.NumberFormat("fr-FR");

const TONES = {
  purple: "border-purple-500/20 bg-purple-500/5",
  emerald: "border-emerald-500/20 bg-emerald-500/5",
  amber: "border-amber-500/20 bg-amber-500/5",
  sky: "border-sky-500/20 bg-sky-500/5",
  rose: "border-rose-500/20 bg-rose-500/5",
} as const;
type Tone = keyof typeof TONES;

const GLOWS: Record<Tone, string> = {
  purple: "bg-purple-500/25",
  emerald: "bg-emerald-500/25",
  amber: "bg-amber-500/25",
  sky: "bg-sky-500/25",
  rose: "bg-rose-500/25",
};

const RANK_COLORS: Record<number, string> = { 1: "text-amber-300", 2: "text-zinc-300", 3: "text-orange-400" };

function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}min` : `${m} min`;
}

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

/* ------------------------------------------------------------------ */
/* Petits composants (même style que le reste de la page Twitch)       */
/* ------------------------------------------------------------------ */

function Panel({ title, icon, right, children }: { title: string; icon: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="twichify-rise rounded-[28px] border border-zinc-800/80 bg-gradient-to-b from-zinc-900/50 to-zinc-950/60 p-6 shadow-2xl shadow-black/30">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2.5 text-xs font-bold text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/70">{icon}</span>
          {title}
        </p>
        {right}
      </div>
      {children}
    </div>
  );
}

function Kpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: React.ReactNode; tone: Tone }) {
  return (
    <div className={`twichify-rise group relative overflow-hidden rounded-[24px] border ${TONES[tone]} p-5 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl`}>
      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100 ${GLOWS[tone]}`} />
      <div className="relative">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/70">{icon}</div>
        <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">{label}</p>
        <p className="mt-2 text-2xl font-black tracking-tighter text-white">{value}</p>
        {sub && <div className="mt-1 text-[11px] leading-snug text-zinc-500">{sub}</div>}
      </div>
    </div>
  );
}

function Delta({ value, sample }: { value: number | null | undefined; sample: number }) {
  if (value == null) return <span>pas encore de comparaison</span>;
  const up = value > 0;
  const flat = value === 0;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={`inline-flex items-center gap-0.5 font-bold ${flat ? "text-zinc-400" : up ? "text-emerald-400" : "text-rose-400"}`}>
        {!flat && (up ? <TrendingUp size={11} /> : <TrendingDown size={11} />)}
        {up ? "+" : ""}
        {value} %
      </span>
      <span>vs ta moyenne ({sample} stream{sample > 1 ? "s" : ""})</span>
    </span>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/70 to-zinc-950/40 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
        {icon} {label}
      </p>
      <p className="mt-1 text-lg font-black tracking-tight text-white">{value}</p>
    </div>
  );
}

function Avatar({ src, name, size = 36 }: { src: string | null; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const base = "shrink-0 rounded-full border border-zinc-800 bg-zinc-900";
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${base} object-cover`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div className={`${base} flex items-center justify-center text-[11px] font-black text-zinc-500`} style={{ width: size, height: size }}>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement des statistiques de chat">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="twichify-skeleton h-36 rounded-[24px] border border-zinc-800/60" />
        ))}
      </div>
      <div className="twichify-skeleton h-72 rounded-[28px] border border-zinc-800/60" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Graphique d'activité                                                */
/* ------------------------------------------------------------------ */

function ActivityChart({ activity }: { activity: NonNullable<ChatStatsData["selected"]>["activity"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const { startMs, stepMin, values } = activity;
  const max = Math.max(1, ...values);
  const peakIndex = values.indexOf(Math.max(...values));
  const labelEvery = Math.max(1, Math.ceil(values.length / 8));
  const timeOf = (i: number) => new Date(startMs + i * stepMin * 60000);

  return (
    <div>
      <div className="flex gap-3">
        <div className="flex h-44 w-8 shrink-0 flex-col justify-between text-right text-[9px] font-bold text-zinc-600">
          <span>{nf.format(max)}</span>
          <span>{nf.format(Math.round(max / 2))}</span>
          <span>0</span>
        </div>

        <div className="relative h-44 flex-1">
          {[0, 50, 100].map((p) => (
            <div key={p} className="absolute inset-x-0 border-t border-dashed border-white/5" style={{ bottom: `${p}%` }} />
          ))}

          <div className="relative flex h-full items-end gap-px">
            {values.map((v, i) => (
              <div
                key={i}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className="relative flex h-full min-w-0 flex-1 cursor-default flex-col justify-end"
              >
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-[10px] shadow-xl">
                    <p className="font-bold text-white">
                      {nf.format(v)} message{v > 1 ? "s" : ""}
                    </p>
                    <p className="text-zinc-500">
                      {timeOf(i).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      {stepMin > 1 ? ` (${stepMin} min)` : ""}
                    </p>
                  </div>
                )}
                <div
                  className={`w-full rounded-t-sm transition-all duration-150 ${
                    i === peakIndex && v > 0
                      ? "bg-gradient-to-t from-amber-500 to-orange-400"
                      : hover === i
                        ? "bg-gradient-to-t from-purple-500 to-indigo-400"
                        : "bg-gradient-to-t from-purple-600/70 to-indigo-500/70"
                  }`}
                  style={{ height: `${Math.max(v ? 4 : 1, (v / max) * 100)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 flex gap-px pl-11">
        {values.map((_, i) => (
          <span key={i} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-[9px] text-zinc-600">
            {i % labelEvery === 0 ? timeOf(i).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}
          </span>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-2 text-[10px] text-zinc-600">
        <span className="inline-block h-2 w-2 rounded-sm bg-gradient-to-t from-amber-500 to-orange-400" />
        Pic d'activité · chaque barre = {stepMin > 1 ? `${stepMin} minutes` : "1 minute"}
      </p>
    </div>
  );
}

function RankList({ rows, unit, withShare }: { rows: ChatRankRow[]; unit: string; withShare?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-1">
      {rows.map((r, i) => (
        <li key={r.key} className="rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <span className={`w-5 shrink-0 text-right text-[11px] font-black ${RANK_COLORS[i + 1] ?? "text-zinc-600"}`}>{i + 1}</span>
            <Avatar src={r.avatar} name={r.name} size={32} />
            <div className="min-w-0 flex-1">
              <a
                href={`https://twitch.tv/${r.login}`}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-sm font-semibold text-zinc-200 transition-colors hover:text-purple-300"
              >
                {r.name}
              </a>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-black text-white">
                {nf.format(r.count)} <span className="font-medium text-zinc-500">{unit}</span>
              </p>
              {withShare && r.share != null && <p className="text-[10px] text-zinc-600">{r.share} %</p>}
              {r.sessions != null && (
                <p className="text-[10px] text-zinc-600">
                  {r.sessions} stream{r.sessions > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function NameBars({ rows, empty }: { rows: { name: string; count: number }[]; empty: string }) {
  if (rows.length === 0) return <p className="py-4 text-sm text-zinc-600">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.name}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-zinc-300">
              <span className={`mr-1.5 font-black ${RANK_COLORS[i + 1] ?? "text-zinc-600"}`}>{i + 1}</span>
              {r.name}
            </span>
            <span className="shrink-0 font-bold text-zinc-500">{nf.format(r.count)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Onglet                                                              */
/* ------------------------------------------------------------------ */

export default function ChatStatsTab() {
  const [data, setData] = useState<ChatStatsData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<"toggle" | "delete" | null>(null);

  const load = useCallback(async (id: string | null, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/user/chat-stats${id ? `?session=${encodeURIComponent(id)}` : ""}`);
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setError(false);
    } catch (e) {
      console.error("Erreur chargement des statistiques de chat:", e);
      if (!silent) setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(sessionId);
  }, [sessionId, load]);

  // Tant que la collecte est active, la session en cours évolue : on actualise toutes les 30 secondes.
  useEffect(() => {
    if (!data?.enabled) return;
    const interval = setInterval(() => load(sessionId, true), 30000);
    return () => clearInterval(interval);
  }, [data?.enabled, sessionId, load]);

  const setEnabled = async (enabled: boolean) => {
    setBusy("toggle");
    try {
      const res = await fetch("/api/user/chat-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setError(false);
    } catch (e) {
      console.error("Erreur réglage des statistiques de chat:", e);
      setError(true);
    } finally {
      setBusy(null);
    }
  };

  const deleteAll = async () => {
    if (!window.confirm("Supprimer tout l'historique des statistiques de chat ? Cette action est définitive.")) return;
    setBusy("delete");
    try {
      const res = await fetch("/api/user/chat-stats", { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setSessionId(null);
      setError(false);
    } catch (e) {
      console.error("Erreur suppression des statistiques de chat:", e);
      setError(true);
    } finally {
      setBusy(null);
    }
  };

  if (loading && !data) return <Skeleton />;

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center">
        <AlertTriangle size={26} className="mx-auto mb-3 text-zinc-700" />
        <p className="text-sm text-zinc-600">Impossible de charger les statistiques de chat pour le moment.</p>
      </div>
    );
  }
  if (!data) return null;

  /* ── Pas encore activé et aucun historique ── */
  if (!data.enabled && data.sessions.length === 0) {
    return (
      <Panel title="Statistiques de chat" icon={<MessageSquare size={14} className="text-purple-400" />}>
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
          <p className="text-sm font-bold text-purple-200">Découvre ce qui se passe dans ton chat</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            Une fois activées, ces statistiques sont calculées par ton widget chat pendant tes streams (il doit donc être actif dans OBS) :
            messages, chatteurs uniques, pic d'activité minute par minute, chatteurs les plus actifs, emotes et commandes les plus utilisées.
          </p>
          <ul className="mt-3 space-y-1 text-[11px] leading-relaxed text-zinc-500">
            <li>· Le texte des messages n'est jamais envoyé ni enregistré : seulement des compteurs.</li>
            <li>· Les pseudos publics des chatteurs les plus actifs sont conservés {data.retentionDays} jours.</li>
            <li>· Les statistiques démarrent à l'activation : elles ne remontent pas dans le passé.</li>
            <li>· Tu peux désactiver la collecte et supprimer l'historique à tout moment.</li>
          </ul>
          <button
            onClick={() => setEnabled(true)}
            disabled={busy === "toggle"}
            className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-purple-500 disabled:opacity-60"
          >
            <Power size={13} /> Activer les statistiques de chat
          </button>
        </div>
      </Panel>
    );
  }

  const selected = data.selected;
  const live = !!data.lastDataAt && Date.now() - new Date(data.lastDataAt).getTime() < 5 * 60_000;

  const controls = (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${
            data.enabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-zinc-700 bg-zinc-900 text-zinc-500"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${data.enabled ? "animate-pulse bg-emerald-400" : "bg-zinc-600"}`} />
          {data.enabled ? "Collecte active" : "Collecte en pause"}
        </span>
        <span className="text-zinc-500">
          {data.lastDataAt ? `Dernières données : ${fmtDateTime(data.lastDataAt)}` : "Aucune donnée reçue pour l'instant"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => load(sessionId, true)}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition hover:text-white"
        >
          <RefreshCw size={11} /> Actualiser
        </button>
        <button
          onClick={() => setEnabled(!data.enabled)}
          disabled={busy === "toggle"}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition hover:text-white disabled:opacity-50"
        >
          <Power size={11} /> {data.enabled ? "Mettre en pause" : "Reprendre"}
        </button>
        <button
          onClick={deleteAll}
          disabled={busy === "delete" || data.sessions.length === 0}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 transition hover:text-rose-300 disabled:cursor-default disabled:opacity-40"
        >
          <Trash2 size={11} /> Supprimer l'historique
        </button>
      </div>
    </div>
  );

  /* ── Activé, en attente des premiers messages ── */
  if (!selected) {
    return (
      <div className="space-y-6">
        {controls}
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-10 text-center">
          <MessageSquare size={26} className="mx-auto mb-3 text-zinc-700" />
          <p className="text-sm font-semibold text-zinc-400">En attente des premiers messages</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-600">
            Les statistiques sont envoyées par ton widget chat toutes les 30 secondes. Vérifie qu'il est bien actif dans OBS pendant ton stream :
            la première session apparaît dès qu'un message est reçu.
          </p>
        </div>
      </div>
    );
  }

  const s = selected.summary;
  const vs = selected.vsAverage;
  const sample = vs?.sample ?? 0;
  const isLive = live && s.id === data.sessions[0]?.id;

  return (
    <div className="space-y-6">
      {controls}

      {/* ── Choix de la session ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="chat-session" className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
            Session
          </label>
          <select
            id="chat-session"
            value={s.id}
            onChange={(e) => setSessionId(e.target.value)}
            className="cursor-pointer rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-200"
          >
            {data.sessions.map((x, i) => (
              <option key={x.id} value={x.id}>
                {fmtDateTime(x.startedAt)} · {fmtDuration(x.durationMin)}
                {i === 0 ? " (la plus récente)" : ""}
              </option>
            ))}
          </select>
          {isLive && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-red-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> En cours
            </span>
          )}
        </div>
        <p className="text-[11px] text-zinc-600">
          Une session regroupe l'activité du chat séparée de la suivante par au moins 30 minutes de silence.
        </p>
      </div>

      {/* ── Chiffres clés ── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<MessageSquare className="text-purple-400" />}
          label="Messages"
          value={nf.format(s.messages)}
          sub={<Delta value={vs?.messages} sample={sample} />}
          tone="purple"
        />
        <Kpi
          icon={<Users className="text-emerald-400" />}
          label="Chatteurs uniques"
          value={nf.format(s.uniqueChatters)}
          sub={<Delta value={vs?.chatters} sample={sample} />}
          tone="emerald"
        />
        <Kpi
          icon={<Gauge className="text-sky-400" />}
          label="Messages / minute"
          value={s.msgsPerMin.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
          sub={<Delta value={vs?.msgsPerMin} sample={sample} />}
          tone="sky"
        />
        <Kpi
          icon={<Zap className="text-amber-400" />}
          label="Pic d'activité"
          value={s.peakCount ? `${nf.format(s.peakCount)} / min` : "—"}
          sub={s.peakAt ? `à ${fmtTime(s.peakAt)}` : undefined}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MiniStat icon={<Clock size={12} className="text-zinc-500" />} label="Durée" value={fmtDuration(s.durationMin)} />
        <MiniStat icon={<UserPlus size={12} className="text-emerald-400" />} label="Premiers messages" value={nf.format(selected.firstTimers)} />
        <MiniStat icon={<Smile size={12} className="text-amber-400" />} label="Emotes utilisées" value={nf.format(selected.emoteUses)} />
        <MiniStat icon={<Terminal size={12} className="text-sky-400" />} label="Commandes" value={nf.format(selected.commandMessages)} />
        <MiniStat icon={<Bot size={12} className="text-zinc-500" />} label="Messages de bots" value={nf.format(selected.botMessages)} />
      </div>

      {/* ── Activité ── */}
      <Panel title="Activité du chat" icon={<TrendingUp size={14} className="text-purple-400" />}>
        <ActivityChart activity={selected.activity} />
      </Panel>

      {/* ── Classements de la session ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <Panel title="Chatteurs les plus actifs" icon={<Users size={14} className="text-purple-400" />}>
            {selected.topChatters.length === 0 ? (
              <p className="py-4 text-sm text-zinc-600">Aucun message sur cette session.</p>
            ) : (
              <RankList rows={selected.topChatters} unit="msg" withShare />
            )}
          </Panel>
        </div>
        <Panel title="Emotes les plus utilisées" icon={<Smile size={14} className="text-amber-400" />}>
          <NameBars rows={selected.topEmotes} empty="Aucune emote détectée sur cette session." />
        </Panel>
        <Panel title="Commandes les plus utilisées" icon={<Terminal size={14} className="text-sky-400" />}>
          <NameBars rows={selected.topCommands} empty="Aucune commande détectée sur cette session." />
        </Panel>
      </div>

      {/* ── Fidèles sur les derniers streams ── */}
      {data.regulars.length > 0 && data.sessions.length > 1 && (
        <Panel
          title={`Les plus actifs sur tes ${data.sessions.length} derniers streams`}
          icon={<Trophy size={14} className="text-amber-400" />}
        >
          <RankList rows={data.regulars} unit="msg" />
        </Panel>
      )}

      {/* ── Historique ── */}
      <Panel title="Historique des sessions" icon={<History size={14} className="text-sky-400" />}>
        <div className="twichify-scroll max-h-96 overflow-auto">
          <table className="w-full min-w-[34rem] text-left text-xs">
            <thead>
              <tr className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                <th className="pb-3 pr-3 font-bold">Début</th>
                <th className="pb-3 pr-3 font-bold">Durée</th>
                <th className="pb-3 pr-3 text-right font-bold">Messages</th>
                <th className="pb-3 pr-3 text-right font-bold">Chatteurs</th>
                <th className="pb-3 pr-3 text-right font-bold">Msg / min</th>
                <th className="pb-3 text-right font-bold">Pic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {data.sessions.map((x: ChatSessionSummary) => (
                <tr
                  key={x.id}
                  onClick={() => setSessionId(x.id)}
                  className={`cursor-pointer transition-colors hover:bg-white/[0.03] ${x.id === s.id ? "bg-purple-500/10" : ""}`}
                >
                  <td className="py-2.5 pr-3 font-semibold text-zinc-200">{fmtDateTime(x.startedAt)}</td>
                  <td className="py-2.5 pr-3 text-zinc-400">{fmtDuration(x.durationMin)}</td>
                  <td className="py-2.5 pr-3 text-right text-zinc-300">{nf.format(x.messages)}</td>
                  <td className="py-2.5 pr-3 text-right text-zinc-300">{nf.format(x.uniqueChatters)}</td>
                  <td className="py-2.5 pr-3 text-right text-zinc-400">{x.msgsPerMin.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</td>
                  <td className="py-2.5 text-right text-amber-300">{x.peakCount ? nf.format(x.peakCount) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-zinc-600">
        <Info size={12} className="mt-0.5 shrink-0" />
        Seuls les messages vus par ton widget chat sont comptés (source OBS active). Les bots et les commandes sont comptés à part, et les
        utilisateurs ignorés dans les réglages du widget sont exclus. Historique conservé {data.retentionDays} jours.
      </p>
    </div>
  );
}
