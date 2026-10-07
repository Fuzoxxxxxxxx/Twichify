"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RotateCcw, TimerReset, ListMusic, Disc3, Music2, Mic2, History, Flame, LayoutDashboard, Trophy, CalendarClock,
  Headphones, Gauge, SkipForward, Sparkles, Hourglass, Clock, Sun, Moon, Sunrise, Sunset,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardUI";
import { useToast, ToastDisplay } from "@/components/dashboard/useToast";
import { KpiCard, Panel, EmptyState, Cover, DeltaBadge } from "@/components/dashboard/StatsUI";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type RecentEntry = { title: string; artist: string; albumImageUrl: string | null; playedAt: string; msPlayed: number };
type TopTrack = { title: string; artist: string; albumImageUrl: string | null; plays: number; msPlayed: number; lastPlayedAt: string };
type TopArtist = { artist: string; albumImageUrl: string | null; plays: number; msPlayed: number; distinctTracks: number };

type HistoryData = {
  period: string;
  tz: string;
  trackingSince: string | null;
  totals: { msPlayed: number; plays: number; distinctTracks: number; distinctArtists: number; skipped: number; skipRate: number };
  previous: { msPlayed: number; plays: number } | null;
  daily: { date: string; plays: number; msPlayed: number }[];
  streak: { current: number; longest: number };
  heatmap: number[][];
  activityByHour: { hour: number; plays: number }[];
  sessions: { count: number; avgMs: number; longest: { ms: number; startedAt: string } | null; capped: boolean };
  discoveries: { count: number; top: { artist: string; plays: number; albumImageUrl: string | null }[] } | null;
  recent: RecentEntry[];
  topTracks: TopTrack[];
  topArtists: TopArtist[];
};

type ListeningStats = {
  totalMsListened: number;
  totalTracksPlayed: number;
  lastTrack: { title: string; artist: string; albumImageUrl: string | null; playedAt: string } | null;
};

/* ------------------------------------------------------------------ */
/* Constantes et helpers                                               */
/* ------------------------------------------------------------------ */

const nf = new Intl.NumberFormat("fr-FR");

const PERIODS: { value: string; label: string; days: number | null }[] = [
  { value: "7d", label: "7 jours", days: 7 },
  { value: "30d", label: "30 jours", days: 30 },
  { value: "90d", label: "90 jours", days: 90 },
  { value: "all", label: "Tout", days: null },
];

type Tab = "overview" | "rankings" | "habits" | "history";
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Vue d'ensemble", icon: <LayoutDashboard size={14} /> },
  { id: "rankings", label: "Classements", icon: <Trophy size={14} /> },
  { id: "habits", label: "Habitudes", icon: <Flame size={14} /> },
  { id: "history", label: "Historique", icon: <History size={14} /> },
];

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const WEEKDAYS_LONG = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const MIN_LISTEN_MS = 15_000; // même seuil que l'API : en dessous, l'écoute est un « skip »
const RANK_COLORS: Record<number, string> = { 1: "text-amber-300", 2: "text-zinc-300", 3: "text-orange-400" };
const MAX_CHART_DAYS = 190;

function formatListeningTime(ms: number) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}min`;
  return `${minutes} min`;
}

function formatClock(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Variation en % ; null quand la comparaison n'a pas de sens (pas de période précédente, ou précédente à zéro).
function pct(current: number, previous: number | null | undefined): number | null {
  if (previous == null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

// Jours du graphique, un par jour (même ceux sans écoute), dans le fuseau du navigateur.
function buildDays(period: string, daily: HistoryData["daily"]) {
  const byDate = new Map(daily.map((d) => [d.date, d]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const configured = PERIODS.find((p) => p.value === period)?.days;
  let count = configured ?? 1;
  if (!configured && daily.length > 0) {
    const first = new Date(`${daily[0].date}T00:00:00`);
    count = Math.round((today.getTime() - first.getTime()) / 86_400_000) + 1;
  }
  count = Math.min(Math.max(count, 1), MAX_CHART_DAYS);

  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (count - 1 - i));
    const key = d.toLocaleDateString("en-CA"); // AAAA-MM-JJ
    const row = byDate.get(key);
    return { date: d, key, plays: row?.plays ?? 0, msPlayed: row?.msPlayed ?? 0 };
  });
}

/* ------------------------------------------------------------------ */
/* Graphique par jour                                                  */
/* ------------------------------------------------------------------ */

function DailyChart({ days, metric }: { days: ReturnType<typeof buildDays>; metric: "minutes" | "plays" }) {
  const [hover, setHover] = useState<number | null>(null);

  const values = days.map((d) => (metric === "minutes" ? Math.round(d.msPlayed / 60000) : d.plays));
  const max = Math.max(1, ...values);
  const active = values.filter((v) => v > 0);
  const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
  const step = Math.max(1, Math.ceil(days.length / 8));
  const unit = metric === "minutes" ? "min" : "titres";

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <p className="text-[11px] text-zinc-500">
          <span className="mr-2 text-3xl font-black tracking-tighter text-white">{nf.format(values.reduce((s, v) => s + v, 0))}</span>
          {unit} sur {days.length} jour{days.length > 1 ? "s" : ""}
          <span className="text-zinc-600"> · {active.length} jour{active.length > 1 ? "s" : ""} actif{active.length > 1 ? "s" : ""}</span>
        </p>
        <p className="flex items-center gap-2 text-[11px] text-zinc-500">
          <span className="inline-block w-4 border-t border-dashed border-emerald-400/60" />
          Moyenne <span className="font-bold text-zinc-300">{avg.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</span> {unit} / jour
        </p>
      </div>

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
          {avg > 0 && <div className="absolute inset-x-0 border-t border-dashed border-emerald-400/50" style={{ bottom: `${(avg / max) * 100}%` }} />}

          <div className="relative flex h-full items-end gap-px">
            {days.map((d, i) => (
              <div
                key={d.key}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className="relative flex h-full min-w-0 flex-1 cursor-default flex-col justify-end"
              >
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-[10px] shadow-xl">
                    <p className="font-bold text-white">
                      {nf.format(values[i])} {unit}
                    </p>
                    <p className="capitalize text-zinc-500">{d.date.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}</p>
                  </div>
                )}
                <div
                  className={`w-full rounded-t-sm transition-all duration-150 ${
                    hover === i ? "bg-gradient-to-t from-purple-500 to-indigo-400" : "bg-gradient-to-t from-purple-600/70 to-indigo-500/70"
                  }`}
                  style={{ height: `${Math.max(values[i] ? 4 : 1, (values[i] / max) * 100)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 flex gap-px pl-11">
        {days.map((d, i) => (
          <span key={d.key} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-[9px] text-zinc-600">
            {i % step === 0 ? d.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }).replace(".", "") : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Carte de chaleur                                                    */
/* ------------------------------------------------------------------ */

function Heatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(1, ...grid.flat());

  return (
    <div className="twichify-scroll overflow-x-auto">
      <div className="min-w-[34rem]">
        <div className="mb-1.5 flex gap-1 pl-10">
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="flex-1 text-center text-[9px] text-zinc-600">
              {h % 3 === 0 ? `${h}h` : ""}
            </span>
          ))}
        </div>
        {grid.map((row, d) => (
          <div key={d} className="mb-1 flex items-center gap-1">
            <span className="w-9 shrink-0 text-[10px] font-bold uppercase tracking-wider text-zinc-600">{WEEKDAYS[d]}</span>
            {row.map((plays, h) => (
              <div
                key={h}
                title={`${WEEKDAYS_LONG[d]} ${h}h : ${plays} morceau${plays > 1 ? "x" : ""}`}
                className="aspect-square flex-1 rounded-[4px] transition hover:ring-1 hover:ring-purple-300/60"
                style={{ background: plays === 0 ? "rgba(255,255,255,0.03)" : `rgba(168, 85, 247, ${0.15 + (plays / max) * 0.85})` }}
              />
            ))}
          </div>
        ))}
        <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-zinc-600">
          Moins
          {[0.15, 0.4, 0.65, 1].map((a) => (
            <span key={a} className="h-3 w-3 rounded-[3px]" style={{ background: `rgba(168, 85, 247, ${a})` }} />
          ))}
          Plus
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function DashboardStats() {
  const { data: session } = useSession();
  const { toast, showToast } = useToast();

  const [listeningStats, setListeningStats] = useState<ListeningStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [resettingStats, setResettingStats] = useState(false);
  const [dateFormat, setDateFormat] = useState<"relative" | "absolute">("relative");

  const [history, setHistory] = useState<HistoryData | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [period, setPeriod] = useState("30d");
  const [tab, setTab] = useState<Tab>("overview");

  const [metric, setMetric] = useState<"minutes" | "plays">("minutes");
  const [recentLimit, setRecentLimit] = useState(20);
  const [hideSkips, setHideSkips] = useState(false);

  const tz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris";
    } catch {
      return "Europe/Paris";
    }
  }, []);

  const loadListeningStats = useCallback(async () => {
    try {
      const res = await fetch("/api/user/listening-stats");
      if (res.ok) setListeningStats(await res.json());
    } catch (e) {
      console.error("Erreur chargement statistiques:", e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadHistory = useCallback(
    async (p: string, limit: number) => {
      try {
        const res = await fetch(`/api/user/listening-history?period=${p}&limit=${limit}&tz=${encodeURIComponent(tz)}`);
        if (!res.ok) throw new Error(String(res.status));
        setHistory(await res.json());
        setHistoryError(false);
      } catch (e) {
        console.error("Erreur chargement historique:", e);
        setHistoryError(true);
      } finally {
        setHistoryLoading(false);
      }
    },
    [tz]
  );

  useEffect(() => {
    if (session) loadListeningStats();
  }, [session, loadListeningStats]);

  useEffect(() => {
    if (session) loadHistory(period, recentLimit);
  }, [session, period, recentLimit, loadHistory]);

  useEffect(() => {
    const interval = setInterval(loadListeningStats, 10000);
    return () => clearInterval(interval);
  }, [loadListeningStats]);

  // L'historique change lentement : un rafraîchissement toutes les 30 s suffit.
  useEffect(() => {
    const interval = setInterval(() => loadHistory(period, recentLimit), 30000);
    return () => clearInterval(interval);
  }, [period, recentLimit, loadHistory]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("twichify-date-format");
    if (saved === "relative" || saved === "absolute") setDateFormat(saved);

    const hash = window.location.hash.replace("#", "");
    if (TABS.some((t) => t.id === hash)) setTab(hash as Tab);
  }, []);

  const changeTab = (next: Tab) => {
    setTab(next);
    if (typeof window !== "undefined") window.history.replaceState(null, "", `#${next}`);
  };

  const changePeriod = (next: string) => {
    setPeriod(next);
    setRecentLimit(20);
  };

  const resetListeningStats = async () => {
    if (!confirm("Réinitialiser toutes tes statistiques et ton historique d'écoute ? Cette action est irréversible.")) return;
    setResettingStats(true);
    try {
      const res = await fetch("/api/user/listening-stats", { method: "DELETE" });
      if (res.ok) {
        showToast("Statistiques et historique réinitialisés.");
        loadListeningStats();
        loadHistory(period, recentLimit);
      } else {
        showToast("Erreur lors de la réinitialisation.", "error");
      }
    } catch (e) {
      showToast("Erreur lors de la réinitialisation.", "error");
    } finally {
      setResettingStats(false);
    }
  };

  const formatPlayedAt = (dateStr: string | null | undefined, full = false) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (dateFormat === "absolute") {
      return full
        ? date.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
        : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    }
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH}h`;
    return `il y a ${Math.floor(diffH / 24)}j`;
  };

  const days = useMemo(() => (history ? buildDays(period, history.daily) : []), [history, period]);

  if (!session) return null;

  const last = listeningStats?.lastTrack;
  const h = history;
  const periodLabel = PERIODS.find((p) => p.value === period)?.label.toLowerCase() ?? "";

  // Habitudes : moments de la journée et jours de la semaine, dérivés de la carte de chaleur.
  const weekdayTotals = h ? h.heatmap.map((row) => row.reduce((s, v) => s + v, 0)) : [];
  const dayParts = h
    ? [
        { label: "Nuit", range: "0h – 6h", icon: <Moon size={14} className="text-indigo-300" />, plays: h.activityByHour.slice(0, 6).reduce((s, x) => s + x.plays, 0) },
        { label: "Matin", range: "6h – 12h", icon: <Sunrise size={14} className="text-amber-300" />, plays: h.activityByHour.slice(6, 12).reduce((s, x) => s + x.plays, 0) },
        { label: "Après-midi", range: "12h – 18h", icon: <Sun size={14} className="text-orange-300" />, plays: h.activityByHour.slice(12, 18).reduce((s, x) => s + x.plays, 0) },
        { label: "Soir", range: "18h – 24h", icon: <Sunset size={14} className="text-rose-300" />, plays: h.activityByHour.slice(18, 24).reduce((s, x) => s + x.plays, 0) },
      ]
    : [];
  const dayPartTotal = dayParts.reduce((s, p) => s + p.plays, 0) || 1;
  const peakHour = h ? h.activityByHour.reduce((a, b) => (b.plays > a.plays ? b : a), { hour: 0, plays: 0 }) : null;
  const peakWeekday = weekdayTotals.length ? weekdayTotals.indexOf(Math.max(...weekdayTotals)) : -1;
  const maxHour = Math.max(1, ...(h?.activityByHour.map((x) => x.plays) ?? [1]));
  const maxWeekday = Math.max(1, ...weekdayTotals);

  const activeDays = days.filter((d) => d.plays > 0).length;
  const avgPerDayMs = h && days.length ? h.totals.msPlayed / days.length : 0;
  const sparkMinutes = days.map((d) => Math.round(d.msPlayed / 60000));
  const empty = !!h && h.totals.plays === 0;

  const recentShown = h ? (hideSkips ? h.recent.filter((r) => r.msPlayed >= MIN_LISTEN_MS) : h.recent) : [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Analyse"
        title="Statistiques"
        action={
          <button
            onClick={resetListeningStats}
            disabled={resettingStats || statsLoading}
            className="flex cursor-pointer items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
          >
            <RotateCcw size={14} />
            {resettingStats ? "Réinitialisation..." : "Réinitialiser"}
          </button>
        }
      />

      {/* ── Dernier morceau + totaux ── */}
      {statsLoading && !listeningStats ? (
        <div className="twichify-skeleton h-56 rounded-[32px] border border-zinc-800/60" aria-busy="true" />
      ) : (
        <div className="twichify-rise relative overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950/60 shadow-2xl shadow-black/30">
          {last?.albumImageUrl && (
            <img
              src={last.albumImageUrl}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full scale-150 object-cover opacity-30 blur-3xl saturate-150"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-950/50 to-zinc-950/80" />

          <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
            {last ? (
              <>
                <Cover src={last.albumImageUrl} size={112} className="!rounded-2xl shadow-2xl shadow-black/60" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-purple-300">Dernier morceau joué</p>
                  <p className="mt-1.5 truncate text-2xl font-black tracking-tight text-white">{last.title}</p>
                  <p className="truncate text-sm text-zinc-400">{last.artist}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">{formatPlayedAt(last.playedAt, true)}</p>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
                  <Disc3 size={30} className="text-zinc-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-300">Aucune écoute enregistrée pour l'instant</p>
                  <p className="mt-1 text-xs text-zinc-600">Lance une musique sur Spotify avec le widget actif pour commencer à suivre tes statistiques.</p>
                </div>
              </div>
            )}

            <div className="grid shrink-0 grid-cols-2 gap-3 sm:w-72">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
                <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  <TimerReset size={12} className="text-purple-400" /> Écoute totale
                </p>
                <p className="mt-1 text-lg font-black tracking-tight text-white">{formatListeningTime(listeningStats?.totalMsListened || 0)}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
                <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  <ListMusic size={12} className="text-emerald-400" /> Morceaux
                </p>
                <p className="mt-1 text-lg font-black tracking-tight text-white">{nf.format(listeningStats?.totalTracksPlayed || 0)}</p>
              </div>
              {h?.trackingSince && (
                <p className="col-span-2 text-[10px] leading-snug text-zinc-600">
                  Suivi depuis le {shortDate(h.trackingSince)} · historique détaillé conservé 180 jours
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Onglets et période ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="twichify-scroll sticky top-2 z-20 flex w-full gap-1.5 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/80 p-1.5 shadow-xl shadow-black/40 backdrop-blur-xl sm:w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => changeTab(t.id)}
              className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition ${
                tab === t.id
                  ? "border border-purple-500/40 bg-gradient-to-r from-purple-600/30 to-indigo-600/20 text-white shadow-inner shadow-purple-500/10"
                  : "border border-transparent text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex w-fit gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => changePeriod(p.value)}
              className={`cursor-pointer rounded-xl px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                period === p.value ? "border border-purple-500/40 bg-purple-600/20 text-purple-300" : "border border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {historyLoading && !h ? (
        <div className="space-y-6" aria-busy="true">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="twichify-skeleton h-36 rounded-[24px] border border-zinc-800/60" />
            ))}
          </div>
          <div className="twichify-skeleton h-72 rounded-[28px] border border-zinc-800/60" />
        </div>
      ) : historyError && !h ? (
        <p className="py-8 text-center text-sm text-zinc-500">Impossible de charger l'historique pour le moment.</p>
      ) : empty ? (
        <EmptyState
          icon={<History size={28} />}
          text="Pas encore assez d'écoutes sur cette période."
          hint="L'historique se remplit au fil de tes streams avec le widget actif."
        />
      ) : (
        h && (
          <>
            {/* ═════════════ VUE D'ENSEMBLE ═════════════ */}
            {tab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <KpiCard
                    icon={<Headphones className="text-purple-400" />}
                    label="Temps d'écoute"
                    value={formatListeningTime(h.totals.msPlayed)}
                    sub={<DeltaBadge value={pct(h.totals.msPlayed, h.previous?.msPlayed)} suffix="vs période précédente" />}
                    spark={sparkMinutes}
                    tone="purple"
                  />
                  <KpiCard
                    icon={<ListMusic className="text-emerald-400" />}
                    label="Morceaux joués"
                    value={nf.format(h.totals.plays)}
                    sub={<DeltaBadge value={pct(h.totals.plays, h.previous?.plays)} suffix="vs période précédente" />}
                    tone="emerald"
                  />
                  <KpiCard
                    icon={<Music2 className="text-sky-400" />}
                    label="Titres distincts"
                    value={nf.format(h.totals.distinctTracks)}
                    sub={`${nf.format(h.totals.distinctArtists)} artiste${h.totals.distinctArtists > 1 ? "s" : ""} · ${(h.totals.plays / Math.max(1, h.totals.distinctTracks)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} écoutes par titre`}
                    tone="sky"
                  />
                  <KpiCard
                    icon={<Gauge className="text-amber-400" />}
                    label="Moyenne par jour"
                    value={formatListeningTime(avgPerDayMs)}
                    sub={`${activeDays} jour${activeDays > 1 ? "s" : ""} actif${activeDays > 1 ? "s" : ""} sur ${days.length}`}
                    tone="amber"
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <KpiCard
                    icon={<Flame className="text-rose-400" />}
                    label="Série en cours"
                    value={`${h.streak.current} jour${h.streak.current > 1 ? "s" : ""}`}
                    sub={`Record : ${h.streak.longest} jour${h.streak.longest > 1 ? "s" : ""} d'affilée`}
                    tone="rose"
                  />
                  <KpiCard
                    icon={<CalendarClock className="text-purple-400" />}
                    label="Sessions d'écoute"
                    value={nf.format(h.sessions.count)}
                    sub={h.sessions.count ? `${formatListeningTime(h.sessions.avgMs)} en moyenne${h.sessions.capped ? " (échantillon)" : ""}` : undefined}
                    tone="purple"
                  />
                  <KpiCard
                    icon={<Hourglass className="text-emerald-400" />}
                    label="Plus longue session"
                    value={h.sessions.longest ? formatListeningTime(h.sessions.longest.ms) : "—"}
                    sub={h.sessions.longest ? `le ${shortDate(h.sessions.longest.startedAt)}` : undefined}
                    tone="emerald"
                  />
                  <KpiCard
                    icon={<SkipForward className="text-sky-400" />}
                    label="Morceaux ignorés"
                    value={`${h.totals.skipRate} %`}
                    sub={`${nf.format(h.totals.skipped)} écoute${h.totals.skipped > 1 ? "s" : ""} de moins de 15 s`}
                    tone="sky"
                  />
                </div>

                <Panel
                  title="Écoute par jour"
                  icon={<Flame size={14} className="text-amber-400" />}
                  right={
                    <div className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-950/60 p-1">
                      {(["minutes", "plays"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setMetric(m)}
                          className={`cursor-pointer rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                            metric === m ? "bg-purple-600/20 text-purple-300" : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {m === "minutes" ? "Minutes" : "Titres"}
                        </button>
                      ))}
                    </div>
                  }
                >
                  <DailyChart days={days} metric={metric} />
                </Panel>

                <Panel title="Découvertes" icon={<Sparkles size={14} className="text-amber-400" />}>
                  {h.discoveries ? (
                    h.discoveries.count === 0 ? (
                      <p className="py-2 text-sm text-zinc-600">Aucun nouvel artiste sur {periodLabel} : tu es resté sur tes valeurs sûres.</p>
                    ) : (
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                        <div className="shrink-0">
                          <p className="text-4xl font-black tracking-tighter text-white">{nf.format(h.discoveries.count)}</p>
                          <p className="text-[11px] text-zinc-500">
                            nouvel{h.discoveries.count > 1 ? "s" : ""} artiste{h.discoveries.count > 1 ? "s" : ""} jamais écouté{h.discoveries.count > 1 ? "s" : ""} avant
                          </p>
                        </div>
                        <ul className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {h.discoveries.top.map((a) => (
                            <li key={a.artist} className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
                              <Cover src={a.albumImageUrl} size={44} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-white">{a.artist}</p>
                                <p className="text-[11px] text-zinc-500">
                                  {a.plays} écoute{a.plays > 1 ? "s" : ""}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  ) : (
                    <p className="py-2 text-sm text-zinc-600">
                      {period === "all"
                        ? "Choisis une période (7, 30 ou 90 jours) pour voir les artistes découverts."
                        : "Pas encore assez d'historique avant cette période pour savoir ce qui est nouveau."}
                    </p>
                  )}
                </Panel>
              </div>
            )}

            {/* ═════════════ CLASSEMENTS ═════════════ */}
            {tab === "rankings" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <Panel title="Titres les plus joués" icon={<Music2 size={14} className="text-purple-400" />}>
                    {h.topTracks.length === 0 ? (
                      <p className="py-4 text-sm text-zinc-600">Rien à afficher pour l'instant.</p>
                    ) : (
                      <ul className="space-y-1">
                        {h.topTracks.map((t, i) => {
                          const max = h.topTracks[0]?.plays || 1;
                          return (
                            <li key={`${t.title}|${t.artist}`} className="rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.03]">
                              <div className="flex items-center gap-3">
                                <span className={`w-5 shrink-0 text-center text-[11px] font-black ${RANK_COLORS[i + 1] ?? "text-zinc-600"}`}>{i + 1}</span>
                                <Cover src={t.albumImageUrl} size={48} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-bold text-white">{t.title}</p>
                                  <p className="truncate text-[11px] text-zinc-500">{t.artist}</p>
                                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
                                    <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400" style={{ width: `${(t.plays / max) * 100}%` }} />
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-xs font-black text-white">{t.plays}×</p>
                                  <p className="text-[10px] text-zinc-600">{formatListeningTime(t.msPlayed)}</p>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </Panel>

                  <Panel title="Artistes les plus joués" icon={<Mic2 size={14} className="text-emerald-400" />}>
                    {h.topArtists.length === 0 ? (
                      <p className="py-4 text-sm text-zinc-600">Rien à afficher pour l'instant.</p>
                    ) : (
                      <ul className="space-y-1">
                        {h.topArtists.map((a, i) => {
                          const max = h.topArtists[0]?.plays || 1;
                          return (
                            <li key={a.artist} className="rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.03]">
                              <div className="flex items-center gap-3">
                                <span className={`w-5 shrink-0 text-center text-[11px] font-black ${RANK_COLORS[i + 1] ?? "text-zinc-600"}`}>{i + 1}</span>
                                <Cover src={a.albumImageUrl} size={48} className="!rounded-full" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-bold text-white">{a.artist}</p>
                                  <p className="truncate text-[11px] text-zinc-500">
                                    {a.distinctTracks} titre{a.distinctTracks > 1 ? "s" : ""} différent{a.distinctTracks > 1 ? "s" : ""}
                                  </p>
                                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
                                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${(a.plays / max) * 100}%` }} />
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-xs font-black text-white">{a.plays}×</p>
                                  <p className="text-[10px] text-zinc-600">{formatListeningTime(a.msPlayed)}</p>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </Panel>
                </div>
              </div>
            )}

            {/* ═════════════ HABITUDES ═════════════ */}
            {tab === "habits" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <KpiCard
                    icon={<Clock className="text-amber-400" />}
                    label="Heure de pointe"
                    value={peakHour && peakHour.plays > 0 ? `${String(peakHour.hour).padStart(2, "0")}h` : "—"}
                    sub={peakHour && peakHour.plays > 0 ? `${nf.format(peakHour.plays)} morceaux à cette heure` : undefined}
                    tone="amber"
                  />
                  <KpiCard
                    icon={<CalendarClock className="text-purple-400" />}
                    label="Jour favori"
                    value={peakWeekday >= 0 && weekdayTotals[peakWeekday] > 0 ? WEEKDAYS_LONG[peakWeekday].replace(/^./, (c) => c.toUpperCase()) : "—"}
                    sub={peakWeekday >= 0 && weekdayTotals[peakWeekday] > 0 ? `${nf.format(weekdayTotals[peakWeekday])} morceaux` : undefined}
                    tone="purple"
                  />
                  <KpiCard
                    icon={dayParts.length ? dayParts.reduce((a, b) => (b.plays > a.plays ? b : a)).icon : <Sun className="text-orange-300" />}
                    label="Moment préféré"
                    value={dayParts.length ? dayParts.reduce((a, b) => (b.plays > a.plays ? b : a)).label : "—"}
                    sub={dayParts.length ? dayParts.reduce((a, b) => (b.plays > a.plays ? b : a)).range : undefined}
                    tone="rose"
                  />
                </div>

                <Panel title="Carte de chaleur" icon={<Flame size={14} className="text-purple-400" />}>
                  <Heatmap grid={h.heatmap} />
                  <p className="mt-3 text-[11px] text-zinc-600">Nombre de morceaux écoutés selon le jour de la semaine et l'heure (fuseau de ton navigateur : {h.tz}).</p>
                </Panel>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                  <Panel title="Moments de la journée" icon={<Sun size={14} className="text-amber-400" />}>
                    <ul className="space-y-4">
                      {dayParts.map((p) => (
                        <li key={p.label}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2 text-zinc-300">
                              {p.icon} {p.label} <span className="text-[10px] text-zinc-600">{p.range}</span>
                            </span>
                            <span className="font-bold text-zinc-400">{Math.round((p.plays / dayPartTotal) * 100)} %</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400" style={{ width: `${(p.plays / dayPartTotal) * 100}%` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Panel>

                  <Panel title="Par heure" icon={<Clock size={14} className="text-sky-400" />}>
                    <div className="flex h-28 items-end gap-1">
                      {h.activityByHour.map((x) => (
                        <div key={x.hour} className="group flex flex-1 flex-col items-center gap-1.5">
                          <div
                            className="w-full rounded-t-sm bg-gradient-to-t from-purple-600/70 to-indigo-500/70 transition-all group-hover:from-purple-500 group-hover:to-indigo-400"
                            style={{ height: `${Math.max(4, (x.plays / maxHour) * 100)}%` }}
                            title={`${x.hour}h : ${x.plays} morceau${x.plays > 1 ? "x" : ""}`}
                          />
                          {x.hour % 6 === 0 && <span className="text-[9px] text-zinc-600">{x.hour}h</span>}
                        </div>
                      ))}
                    </div>
                  </Panel>

                  <Panel title="Par jour de la semaine" icon={<CalendarClock size={14} className="text-emerald-400" />}>
                    <div className="flex h-28 items-end gap-2">
                      {weekdayTotals.map((plays, d) => (
                        <div key={d} className="group flex flex-1 flex-col items-center gap-1.5">
                          <div
                            className="w-full rounded-t-md bg-gradient-to-t from-emerald-600/70 to-teal-400/70 transition-all group-hover:from-emerald-500 group-hover:to-teal-300"
                            style={{ height: `${Math.max(4, (plays / maxWeekday) * 100)}%` }}
                            title={`${WEEKDAYS_LONG[d]} : ${plays} morceau${plays > 1 ? "x" : ""}`}
                          />
                          <span className="text-[9px] text-zinc-600">{WEEKDAYS[d]}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>
            )}

            {/* ═════════════ HISTORIQUE ═════════════ */}
            {tab === "history" && (
              <Panel
                title="Écoutes récentes"
                icon={<History size={14} className="text-sky-400" />}
                right={
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] text-zinc-400">
                    <input type="checkbox" checked={hideSkips} onChange={(e) => setHideSkips(e.target.checked)} className="accent-purple-500" />
                    Masquer les morceaux ignorés
                  </label>
                }
              >
                {recentShown.length === 0 ? (
                  <p className="py-4 text-sm text-zinc-600">Rien à afficher pour l'instant.</p>
                ) : (
                  <ul className="divide-y divide-zinc-900">
                    {recentShown.map((r, i) => {
                      const skipped = r.msPlayed < MIN_LISTEN_MS;
                      return (
                        <li key={`${r.playedAt}-${i}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.03]">
                          <Cover src={r.albumImageUrl} size={40} />
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-sm ${skipped ? "text-zinc-500" : "text-zinc-200"}`}>
                              <span className="font-semibold">{r.title}</span> <span className="text-zinc-500">— {r.artist}</span>
                            </p>
                          </div>
                          {skipped ? (
                            <span className="shrink-0 rounded-full border border-zinc-700 px-2 py-px text-[9px] font-bold uppercase tracking-wider text-zinc-500">Ignoré</span>
                          ) : (
                            <span className="hidden shrink-0 text-[11px] text-zinc-600 sm:block">{formatClock(r.msPlayed)}</span>
                          )}
                          <span className="w-24 shrink-0 text-right text-[11px] text-zinc-600">{formatPlayedAt(r.playedAt)}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {h.recent.length >= recentLimit && recentLimit < 100 && (
                  <div className="mt-5 flex justify-center">
                    <button
                      onClick={() => setRecentLimit((l) => Math.min(100, l === 20 ? 50 : 100))}
                      className="cursor-pointer rounded-xl border border-zinc-800 bg-zinc-950/60 px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-300 transition hover:text-white"
                    >
                      Afficher plus
                    </button>
                  </div>
                )}
              </Panel>
            )}
          </>
        )
      )}

      <ToastDisplay toast={toast} />
    </div>
  );
}
