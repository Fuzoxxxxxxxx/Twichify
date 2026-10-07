"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect, useCallback, useMemo, useRef, useId } from "react";
import {
  Users, UserPlus, UserMinus, Radio, Eye, Video, Film, RefreshCw, ExternalLink, Tv, TrendingUp, AlertTriangle,
  Shield, Gem, Pencil, LayoutDashboard, Clock, CalendarDays, ChevronLeft, ChevronRight, Search,
  Trophy, Timer, Languages, BadgeCheck, Hourglass, Copy, Check, Heart, Zap, Star, Info, MessageSquare,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardUI";
import type { TwitchStats, FollowersPage, SectionStatus } from "@/lib/twitch-user";
import type { TeamData, TeamSection, TeamMember, CommunityData } from "@/lib/twitch-community";
import type { UnfollowState } from "@/lib/twitch-unfollows";
import ChatStatsTab from "@/components/dashboard/ChatStatsTab";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const nf = new Intl.NumberFormat("fr-FR");
const SCAN_COOLDOWN_MS = 5 * 60_000;
const AUTO_SCAN_AFTER_MS = 30 * 60_000;

const TONES = {
  purple: "border-purple-500/20 bg-purple-500/5",
  emerald: "border-emerald-500/20 bg-emerald-500/5",
  amber: "border-amber-500/20 bg-amber-500/5",
  sky: "border-sky-500/20 bg-sky-500/5",
  rose: "border-rose-500/20 bg-rose-500/5",
} as const;
type Tone = keyof typeof TONES;

// Halo coloré dans le coin des cartes de chiffres, et couleur de la courbe associée.
const GLOWS: Record<Tone, string> = {
  purple: "bg-purple-500/25",
  emerald: "bg-emerald-500/25",
  amber: "bg-amber-500/25",
  sky: "bg-sky-500/25",
  rose: "bg-rose-500/25",
};
const SPARK_COLORS: Record<Tone, string> = {
  purple: "#a855f7",
  emerald: "#10b981",
  amber: "#f59e0b",
  sky: "#0ea5e9",
  rose: "#f43f5e",
};

// Podium : or, argent, bronze.
const RANK_COLORS: Record<number, string> = { 1: "text-amber-300", 2: "text-zinc-300", 3: "text-orange-400" };

// Un follower de moins de 24 h est mis en avant (« nouveau »).
const isRecent = (d: string) => Date.now() - new Date(d).getTime() < 24 * 3600 * 1000;

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`;
  return `${m} min`;
}

function formatAge(dateStr: string | null) {
  if (!dateStr) return null;
  const months = Math.floor((Date.now() - new Date(dateStr).getTime()) / (30.44 * 24 * 3600 * 1000));
  if (months < 1) return "moins d'un mois";
  if (months < 12) return `${months} mois`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} an${years > 1 ? "s" : ""} et ${rest} mois` : `${years} an${years > 1 ? "s" : ""}`;
}

const shortDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

function languageName(code: string | null) {
  if (!code || code === "other") return null;
  try {
    return new Intl.DisplayNames(["fr"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

const BROADCASTER_LABEL: Record<string, string> = { partner: "Partenaire", affiliate: "Affilié" };

type Tab = "overview" | "followers" | "team" | "community" | "chat" | "content";
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Vue d'ensemble", icon: <LayoutDashboard size={14} /> },
  { id: "followers", label: "Followers", icon: <Users size={14} /> },
  { id: "team", label: "Équipe", icon: <Shield size={14} /> },
  { id: "community", label: "Communauté", icon: <Heart size={14} /> },
  { id: "chat", label: "Chat", icon: <MessageSquare size={14} /> },
  { id: "content", label: "Contenu", icon: <Video size={14} /> },
];

const PAGE_SIZES = [10, 25, 50, 100];

const TIER_STYLES: Record<1 | 2 | 3, { label: string; badge: string; bar: string }> = {
  1: { label: "Tier 1", badge: "border-purple-500/30 bg-purple-500/10 text-purple-300", bar: "bg-purple-500" },
  2: { label: "Tier 2", badge: "border-sky-500/30 bg-sky-500/10 text-sky-300", bar: "bg-sky-500" },
  3: { label: "Tier 3", badge: "border-amber-500/30 bg-amber-500/10 text-amber-300", bar: "bg-amber-500" },
};

/* ------------------------------------------------------------------ */
/* Composants                                                          */
/* ------------------------------------------------------------------ */

function Avatar({ src, name, size = 32, className = "" }: { src: string | null; name: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const base = `shrink-0 rounded-full border border-zinc-800 bg-zinc-900 ${className}`;

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

// Mini-courbe d'une série de valeurs (ex. nouveaux followers par jour), sans axe ni légende.
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const gradientId = `spark-${useId().replace(/:/g, "")}`;
  if (values.length < 2) return null;

  const w = 100;
  const h = 28;
  const max = Math.max(1, ...values);
  const points = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - (v / max) * (h - 8)] as const);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-3 h-8 w-full" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill={`url(#${gradientId})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  tone,
  spark,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone: Tone;
  spark?: number[];
}) {
  return (
    <div
      className={`twichify-rise group relative overflow-hidden rounded-[24px] border ${TONES[tone]} p-5 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl`}
    >
      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-100 ${GLOWS[tone]} opacity-60`} />
      <div className="relative">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/70">{icon}</div>
        <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">{label}</p>
        <p className="mt-2 text-2xl font-black tracking-tighter text-white">{value}</p>
        {sub && <p className="mt-1 text-[11px] leading-snug text-zinc-500">{sub}</p>}
        {spark && <Sparkline values={spark} color={SPARK_COLORS[tone]} />}
      </div>
    </div>
  );
}

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

function ReconnectBanner({ expired, onReconnect, compact }: { expired: boolean; onReconnect: () => void; compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-amber-500/20 bg-amber-500/5 ${compact ? "p-4" : "p-5"}`}>
      {!compact && <p className="text-sm font-bold text-amber-200">{expired ? "Ta connexion Twitch a expiré" : "Autorisation Twitch requise"}</p>}
      <p className={`${compact ? "" : "mt-1"} text-xs leading-relaxed text-zinc-400`}>
        {expired
          ? "Reconnecte-toi pour retrouver ces données."
          : "Twichify a besoin d'une permission Twitch en lecture seule pour afficher ces données. Reconnecte-toi avec Twitch pour l'accorder."}
      </p>
      <button
        onClick={onReconnect}
        className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-purple-500"
      >
        <Tv size={13} /> Se reconnecter avec Twitch
      </button>
    </div>
  );
}

function SectionNotice({
  status,
  onReconnect,
  unavailableText,
  compact,
}: {
  status: SectionStatus;
  onReconnect: () => void;
  unavailableText?: string;
  compact?: boolean;
}) {
  if (status === "missing_scope" || status === "expired") {
    return <ReconnectBanner expired={status === "expired"} onReconnect={onReconnect} compact={compact} />;
  }
  if (status === "unavailable") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-500">
        <Info size={16} className="mt-0.5 shrink-0 text-zinc-600" />
        <span>{unavailableText ?? "Indisponible pour cette chaîne."}</span>
      </div>
    );
  }
  return <p className="py-4 text-sm text-zinc-500">Impossible de récupérer ces données pour le moment.</p>;
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center">
      <div className="mx-auto mb-3 flex w-fit text-zinc-700">{icon}</div>
      <p className="text-sm text-zinc-600">{text}</p>
    </div>
  );
}

// Squelette affiché pendant le premier chargement : même silhouette que la page, sans saut de mise en page.
function PageSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Chargement des statistiques Twitch">
      <div className="twichify-skeleton h-80 rounded-[32px] border border-zinc-800/60" />
      <div className="twichify-skeleton h-12 w-full rounded-2xl border border-zinc-800/60 sm:w-[34rem]" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="twichify-skeleton h-36 rounded-[24px] border border-zinc-800/60" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="twichify-skeleton h-72 rounded-[28px] border border-zinc-800/60 lg:col-span-2" />
        <div className="twichify-skeleton h-72 rounded-[28px] border border-zinc-800/60" />
      </div>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex items-center justify-center py-14">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-48 rounded-xl border border-zinc-800 bg-zinc-950/60 py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600"
      />
    </div>
  );
}

// Ligne « personne » : avatar, pseudo (lien vers la chaîne) et texte à droite.
function PersonRow({
  avatar,
  name,
  login,
  right,
  sub,
  rank,
  linked = true,
  highlight = false,
  podium = false,
}: {
  avatar: string | null;
  name: string;
  login: string;
  right?: React.ReactNode;
  sub?: React.ReactNode;
  rank?: number;
  linked?: boolean;
  highlight?: boolean; // pastille verte « nouveau »
  podium?: boolean; // couleurs or / argent / bronze pour les 3 premiers rangs (classements)
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.03]">
      {rank != null && (
        <span className={`w-9 shrink-0 text-right text-[11px] font-black ${(podium ? RANK_COLORS[rank] : undefined) ?? "text-zinc-600"}`}>{nf.format(rank)}</span>
      )}
      <div className="relative shrink-0">
        <Avatar src={avatar} name={name} size={36} />
        {highlight && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 bg-emerald-400" title="Nouveau (moins de 24 h)" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {linked ? (
          <a
            href={`https://twitch.tv/${login}`}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-sm font-semibold text-zinc-200 transition-colors hover:text-purple-300"
          >
            {name}
          </a>
        ) : (
          <span className="block truncate text-sm font-semibold text-zinc-400">{name}</span>
        )}
        {sub && <div className="truncate text-[11px] text-zinc-600">{sub}</div>}
      </div>
      {right}
    </li>
  );
}

// Regroupe les dates de suivi par jour (fuseau du navigateur) sur les `days` derniers jours.
function bucketByDay(sample: string[], capped: boolean, days: number) {
  const times = sample.map((s) => new Date(s).getTime());
  const oldest = times.length ? Math.min(...times) : Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const buckets: { start: Date; count: number; incomplete: boolean }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const start = new Date(today);
    start.setDate(today.getDate() - i);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    const count = times.filter((t) => t >= start.getTime() && t < end.getTime()).length;
    // Si l'échantillon est tronqué, tout jour qui commence avant le plus ancien follower connu est incomplet.
    buckets.push({ start, count, incomplete: capped && start.getTime() < oldest });
  }
  return buckets;
}

const dailyCounts = (sample: string[], days: number) => bucketByDay(sample, false, days).map((b) => b.count);

// Histogramme des nouveaux followers par jour : grille, moyenne et info-bulle au survol.
function FollowerChart({ sample, capped, days }: { sample: string[]; capped: boolean; days: number }) {
  const [hover, setHover] = useState<number | null>(null);

  const { buckets, max, hasIncomplete, total, avg } = useMemo(() => {
    const list = bucketByDay(sample, capped, days);
    const complete = list.filter((b) => !b.incomplete);
    return {
      buckets: list,
      max: Math.max(1, ...list.map((b) => b.count)),
      hasIncomplete: list.some((b) => b.incomplete),
      total: list.reduce((sum, b) => sum + b.count, 0),
      // La moyenne ne tient compte que des jours complets, sinon elle serait tirée vers le bas.
      avg: complete.length ? complete.reduce((sum, b) => sum + b.count, 0) / complete.length : 0,
    };
  }, [sample, capped, days]);

  const step = days > 14 ? 5 : days > 7 ? 2 : 1;
  const avgPct = (avg / max) * 100;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <p className="text-[11px] text-zinc-500">
          <span className="mr-2 text-3xl font-black tracking-tighter text-white">{nf.format(total)}</span>
          nouveau{total > 1 ? "x" : ""} follower{total > 1 ? "s" : ""} sur {days} jours
          {hasIncomplete ? " (au moins)" : ""}
        </p>
        <p className="flex items-center gap-2 text-[11px] text-zinc-500">
          <span className="inline-block w-4 border-t border-dashed border-emerald-400/60" />
          Moyenne <span className="font-bold text-zinc-300">{avg.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</span> / jour
        </p>
      </div>

      <div className="flex gap-3">
        <div className="flex h-44 w-6 shrink-0 flex-col justify-between text-right text-[9px] font-bold text-zinc-600">
          <span>{max}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>

        <div className="relative h-44 flex-1">
          {[0, 50, 100].map((p) => (
            <div key={p} className="absolute inset-x-0 border-t border-dashed border-white/5" style={{ bottom: `${p}%` }} />
          ))}
          {avg > 0 && <div className="absolute inset-x-0 border-t border-dashed border-emerald-400/50" style={{ bottom: `${avgPct}%` }} />}

          <div className="relative flex h-full items-end gap-1">
            {buckets.map((b, i) => (
              <div
                key={b.start.toISOString()}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className="relative flex h-full flex-1 cursor-default flex-col justify-end"
              >
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-[10px] shadow-xl">
                    <p className="font-bold text-white">
                      {b.count} follower{b.count > 1 ? "s" : ""}
                    </p>
                    <p className="capitalize text-zinc-500">
                      {b.start.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
                      {b.incomplete ? " · incomplet" : ""}
                    </p>
                  </div>
                )}
                <div
                  className={`w-full rounded-t-md transition-all duration-200 ${
                    b.incomplete
                      ? "bg-zinc-700/40"
                      : hover === i
                        ? "bg-gradient-to-t from-purple-500 to-indigo-400"
                        : "bg-gradient-to-t from-purple-600/70 to-indigo-500/70"
                  }`}
                  style={{ height: `${Math.max(b.count ? 6 : 2, (b.count / max) * 100)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 flex gap-1 pl-9">
        {buckets.map((b, i) => (
          <span key={b.start.toISOString()} className="flex-1 text-center text-[9px] text-zinc-600">
            {i % step === 0 ? b.start.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }).replace(".", "") : ""}
          </span>
        ))}
      </div>
      {hasIncomplete && (
        <p className="mt-3 text-[10px] text-zinc-600">
          Les barres grisées sont incomplètes : Twichify analyse les 300 derniers followers, et ta chaîne en a gagné davantage sur cette période.
        </p>
      )}
    </div>
  );
}

// Grille de membres (staff ou VIPs) avec avatar, pseudo et une ligne de contexte.
function MemberGrid({
  section,
  emptyText,
  filter,
  roleLabel,
  roleClass,
  subline,
  onReconnect,
}: {
  section: TeamSection;
  emptyText: string;
  filter: string;
  roleLabel: string;
  roleClass: string;
  subline: (m: TeamMember) => string | null;
  onReconnect: () => void;
}) {
  if (section.status !== "ok") return <SectionNotice status={section.status} onReconnect={onReconnect} compact />;

  const q = filter.trim().toLowerCase();
  const members = q ? section.members.filter((m) => m.name.toLowerCase().includes(q) || m.login.includes(q)) : section.members;

  if (section.members.length === 0) return <p className="py-4 text-sm text-zinc-600">{emptyText}</p>;
  if (members.length === 0) return <p className="py-4 text-sm text-zinc-600">Aucun résultat pour « {filter} ».</p>;

  return (
    <ul className="twichify-scroll grid max-h-[28rem] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
      {members.map((m) => (
        <li key={m.id}>
          <a
            href={`https://twitch.tv/${m.login}`}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 transition hover:border-purple-500/40"
          >
            <Avatar src={m.avatar} name={m.name} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white transition-colors group-hover:text-purple-300">{m.name}</p>
              <span className={`mt-1 inline-block rounded-full border px-2 py-px text-[9px] font-black uppercase tracking-wider ${roleClass}`}>
                {roleLabel}
              </span>
              {/* Pas de truncate ici : la ligne de contexte passe à la ligne plutôt que d'être coupée. */}
              {subline(m) && <p className="mt-1 text-[11px] leading-snug text-zinc-500">{subline(m)}</p>}
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}

// Chargement à la demande d'un onglet (équipe, communauté) : on n'appelle Twitch que si l'onglet est ouvert.
function useLazy<T>(url: string, active: boolean) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setError(false);
    } catch (e) {
      console.error(`Erreur chargement ${url}:`, e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (active && !data && !loading && !error) load();
  }, [active, data, loading, error, load]);

  return { data, loading, error, reload: load };
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function DashboardTwitch() {
  const { data: session } = useSession();

  const [stats, setStats] = useState<TwitchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFormat, setDateFormat] = useState<"relative" | "absolute">("relative");
  const [tick, setTick] = useState(0);

  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useState(14);
  const [copied, setCopied] = useState(false);
  const [bioOpen, setBioOpen] = useState(false);

  // Liste complète des followers : pagination par curseurs (Twitch ne pagine que vers l'avant).
  const [pageSize, setPageSize] = useState(25);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageData, setPageData] = useState<FollowersPage | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState(false);
  const [filter, setFilter] = useState("");

  // Suivi des départs (opt-in)
  const [unf, setUnf] = useState<UnfollowState | null>(null);
  const [unfLoading, setUnfLoading] = useState(false);
  const [unfError, setUnfError] = useState(false);
  const [unfBusy, setUnfBusy] = useState<"enable" | "scan" | "disable" | null>(null);
  const autoScanned = useRef(false);

  // Filtres des onglets Équipe et Communauté
  const [teamFilter, setTeamFilter] = useState("");
  const [subFilter, setSubFilter] = useState("");

  const team = useLazy<TeamData>("/api/user/twitch-team", !!session && tab === "team");
  const community = useLazy<CommunityData>("/api/user/twitch-community", !!session && tab === "community");

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch("/api/user/twitch-stats");
      if (!res.ok) throw new Error(String(res.status));
      setStats(await res.json());
      setError(false);
    } catch (e) {
      console.error("Erreur chargement statistiques Twitch:", e);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadFollowersPage = useCallback(async (index: number, stack: (string | null)[], size: number) => {
    setPageLoading(true);
    try {
      const params = new URLSearchParams({ first: String(size) });
      const after = stack[index];
      if (after) params.set("after", after);

      const res = await fetch(`/api/user/twitch-followers?${params}`);
      if (!res.ok) throw new Error(String(res.status));
      const data: FollowersPage = await res.json();

      setPageData(data);
      setPageError(false);
      // Mémorise le curseur de la page suivante pour pouvoir y aller (et revenir) sans recharger depuis le début.
      setCursors((prev) => {
        const next = prev.slice(0, index + 1);
        if (data.cursor) next[index + 1] = data.cursor;
        return next;
      });
    } catch (e) {
      console.error("Erreur chargement liste followers:", e);
      setPageError(true);
    } finally {
      setPageLoading(false);
    }
  }, []);

  const loadUnfollows = useCallback(async () => {
    setUnfLoading(true);
    try {
      const res = await fetch("/api/user/twitch-unfollows");
      if (!res.ok) throw new Error(String(res.status));
      setUnf(await res.json());
      setUnfError(false);
    } catch (e) {
      console.error("Erreur chargement du suivi des départs:", e);
      setUnfError(true);
    } finally {
      setUnfLoading(false);
    }
  }, []);

  const unfollowAction = useCallback(async (action: "enable" | "scan" | "disable") => {
    setUnfBusy(action);
    try {
      const res =
        action === "disable"
          ? await fetch("/api/user/twitch-unfollows", { method: "DELETE" })
          : await fetch("/api/user/twitch-unfollows", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action }),
            });
      if (!res.ok) throw new Error(String(res.status));
      setUnf(await res.json());
      setUnfError(false);
    } catch (e) {
      console.error("Erreur du suivi des départs:", e);
      setUnfError(true);
    } finally {
      setUnfBusy(null);
    }
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  // Les données Twitch bougent lentement et l'API est limitée : une actualisation par minute suffit.
  useEffect(() => {
    const interval = setInterval(() => load(), 60000);
    return () => clearInterval(interval);
  }, [load]);

  // Rafraîchit les durées relatives ("il y a 3 min", durée du live) sans rappeler l'API.
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("twichify-date-format");
    if (saved === "relative" || saved === "absolute") setDateFormat(saved);

    const hash = window.location.hash.replace("#", "");
    if (TABS.some((t) => t.id === hash)) setTab(hash as Tab);
  }, []);

  // Onglet Followers : première page de la liste et état du suivi des départs.
  const followersOk = stats?.followers.status === "ok";
  useEffect(() => {
    if (tab === "followers" && followersOk && !pageData && !pageLoading && !pageError) {
      loadFollowersPage(0, [null], pageSize);
    }
  }, [tab, followersOk, pageData, pageLoading, pageError, pageSize, loadFollowersPage]);

  useEffect(() => {
    if (tab === "followers" && followersOk && !unf && !unfLoading && !unfError) loadUnfollows();
  }, [tab, followersOk, unf, unfLoading, unfError, loadUnfollows]);

  // Si le suivi est actif et que la dernière analyse date, on en lance une (une seule fois par visite).
  useEffect(() => {
    if (!unf || autoScanned.current || unfBusy) return;
    if (!unf.enabled || unf.status !== "ok" || unf.note) return;
    const last = unf.scannedAt ? new Date(unf.scannedAt).getTime() : 0;
    if (Date.now() - last > AUTO_SCAN_AFTER_MS) {
      autoScanned.current = true;
      unfollowAction("scan");
    }
  }, [unf, unfBusy, unfollowAction]);

  const changeTab = (next: Tab) => {
    setTab(next);
    if (typeof window !== "undefined") window.history.replaceState(null, "", `#${next}`);
  };

  const goToPage = (index: number) => {
    setPageIndex(index);
    setFilter("");
    loadFollowersPage(index, cursors, pageSize);
  };

  const changePageSize = (size: number) => {
    setPageSize(size);
    setCursors([null]);
    setPageIndex(0);
    setFilter("");
    loadFollowersPage(0, [null], size);
  };

  const refreshAll = () => {
    load(true);
    if (tab === "followers" && followersOk) {
      loadFollowersPage(pageIndex, cursors, pageSize);
      loadUnfollows();
    }
    if (tab === "team") team.reload();
    if (tab === "community") community.reload();
  };

  const reconnect = () => signIn("twitch", { callbackUrl: "/dashboard/twitch" }, { force_verify: "true" });

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (dateFormat === "absolute") {
      return date.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    }
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 30) return `il y a ${diffD}j`;
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const fullDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const visibleFollowers = useMemo(() => {
    const list = pageData?.followers ?? [];
    const q = filter.trim().toLowerCase();
    return q ? list.filter((f) => f.name.toLowerCase().includes(q) || f.login.includes(q)) : list;
  }, [pageData, filter]);

  const visibleSubs = useMemo(() => {
    const list = community.data?.subscribers.members ?? [];
    const q = subFilter.trim().toLowerCase();
    return q ? list.filter((m) => m.name.toLowerCase().includes(q) || m.login.includes(q)) : list;
  }, [community.data, subFilter]);

  if (!session) return null;

  const gain = (n: number, capped: boolean) => `+${nf.format(n)}${capped ? "+" : ""}`;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Analyse"
        title="Twitch"
        action={
          <button
            onClick={refreshAll}
            disabled={refreshing || loading}
            className="flex cursor-pointer items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-zinc-300 transition hover:border-purple-500/40 hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Actualiser
          </button>
        }
      />

      {loading && !stats ? (
        <PageSkeleton />
      ) : error && !stats ? (
        <EmptyState
          icon={<AlertTriangle size={28} />}
          text="Impossible de récupérer tes statistiques Twitch pour le moment. Réessaie avec « Actualiser »."
        />
      ) : (
        stats &&
        (() => {
          const f = stats.followers;
          const subs = stats.subscribers;
          const vs = stats.videoStats;
          const cs = stats.clipStats;
          const badge = BROADCASTER_LABEL[stats.channel.broadcasterType];
          const age = formatAge(stats.channel.createdAt);
          const lang = languageName(stats.channel.language);
          const avg7 = f.status === "ok" ? Math.round((f.gained7d / 7) * 10) / 10 : null;
          const lastLive = stats.videos[0]?.createdAt;
          const live = stats.live;
          const channelUrl = `https://twitch.tv/${stats.channel.login}`;
          const bio = stats.channel.description.trim();

          const subsValue = subs.status === "ok" && subs.total != null ? nf.format(subs.total) : "—";
          const subsSub =
            subs.status === "ok"
              ? subs.points != null
                ? `${nf.format(subs.points)} points d'abonnement`
                : undefined
              : subs.status === "unavailable"
                ? "Réservé aux affiliés et partenaires"
                : subs.status === "missing_scope" || subs.status === "expired"
                  ? "Permission Twitch requise"
                  : undefined;

          // État de la liste de suivi des départs (affiché dans l'onglet Followers)
          const sinceScan = unf?.scannedAt ? Date.now() - new Date(unf.scannedAt).getTime() : Infinity;
          const canScan = sinceScan >= SCAN_COOLDOWN_MS;
          void tick;

          return (
            <>
              {/* ── Carte du streamer ── */}
              <div className="relative overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950/60 shadow-2xl shadow-black/30">
                {/* Bannière : image « hors ligne » de la chaîne (la bannière de profil n'est pas dans l'API officielle) */}
                <div className="relative h-44 overflow-hidden bg-gradient-to-r from-purple-800/50 via-indigo-700/30 to-emerald-600/20 sm:h-60">
                  {stats.channel.banner ? (
                    <img src={stats.channel.banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <>
                      {/* Sans image hors ligne : l'avatar, flouté et agrandi, donne sa couleur à la bannière. */}
                      {stats.channel.avatar && (
                        <img
                          src={stats.channel.avatar}
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 h-full w-full scale-150 object-cover opacity-40 blur-3xl saturate-150"
                        />
                      )}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:1.5rem_1.5rem]" />
                    </>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />

                  <div className="absolute right-4 top-4 flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(channelUrl);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        } catch (e) {
                          console.error("Copie impossible:", e);
                        }
                      }}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-200 backdrop-blur transition hover:bg-black/70"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {copied ? "Copié" : "Copier le lien"}
                    </button>
                    <a
                      href={channelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-200 backdrop-blur transition hover:bg-black/70"
                    >
                      Ouvrir <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                <div className="relative px-6 pb-6">
                  <div className="-mt-14 flex flex-col gap-6 lg:flex-row lg:items-end">
                    <div className="relative shrink-0">
                      {stats.channel.avatar ? (
                        <img
                          src={stats.channel.avatar}
                          alt=""
                          className={`h-28 w-28 rounded-3xl bg-zinc-900 object-cover shadow-2xl ${
                            live.isLive ? "ring-4 ring-red-500/80 shadow-red-500/30" : "border-4 border-zinc-950 shadow-black/60"
                          }`}
                        />
                      ) : (
                        <div className="flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-zinc-950 bg-zinc-900">
                          <Tv size={30} className="text-purple-300" />
                        </div>
                      )}
                      {live.isLive && (
                        <span className="absolute -bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 lg:pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-2xl font-black tracking-tight text-white">{stats.channel.name}</h2>
                        {badge && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-purple-300">
                            <BadgeCheck size={11} /> {badge}
                          </span>
                        )}
                        {!live.isLive && (
                          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            Hors ligne
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-600">@{stats.channel.login}</p>

                      {bio && (
                        <div className="mt-3 max-w-2xl">
                          <p className={`text-sm leading-relaxed text-zinc-400 ${bioOpen ? "" : "line-clamp-2"}`}>{bio}</p>
                          {bio.length > 120 && (
                            <button
                              onClick={() => setBioOpen((v) => !v)}
                              className="mt-1 cursor-pointer text-[10px] font-bold uppercase tracking-widest text-purple-300 hover:text-purple-200"
                            >
                              {bioOpen ? "Réduire" : "Lire la suite"}
                            </button>
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                        {age && (
                          <span className="inline-flex items-center gap-1.5">
                            <Hourglass size={11} /> Sur Twitch depuis {age}
                          </span>
                        )}
                        {lang && (
                          <span className="inline-flex items-center gap-1.5">
                            <Languages size={11} /> {lang}
                          </span>
                        )}
                        {!live.isLive && lastLive && (
                          <span className="inline-flex items-center gap-1.5">
                            <Clock size={11} /> Dernier live {formatDate(lastLive)}
                          </span>
                        )}
                      </div>

                      {!live.isLive && stats.channel.title && (
                        <p className="mt-3 truncate text-sm text-zinc-300">
                          {stats.channel.title}
                          {stats.channel.game && <span className="text-zinc-600"> — {stats.channel.game}</span>}
                        </p>
                      )}

                      {stats.channel.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {stats.channel.tags.map((t) => (
                            <span key={t} className="rounded-full border border-zinc-800 bg-zinc-900/70 px-2.5 py-0.5 text-[10px] text-zinc-400">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {live.isLive && (
                      <a
                        href={channelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group block w-full shrink-0 overflow-hidden rounded-2xl border border-red-500/30 bg-zinc-900/60 transition hover:border-red-500/60 lg:w-72"
                      >
                        <div className="relative aspect-video bg-zinc-900">
                          {live.thumbnail && <img src={live.thumbnail} alt="" className="h-full w-full object-cover" />}
                          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-red-600 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
                            En direct
                          </span>
                          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            <Eye size={10} /> {nf.format(live.viewers)}
                          </span>
                        </div>
                        <div className="p-3">
                          <p className="truncate text-sm font-semibold text-white">{live.title}</p>
                          <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                            {live.game ?? "Sans catégorie"}
                            {live.startedAt && (
                              <> · {formatDuration(Math.floor((Date.now() - new Date(live.startedAt).getTime()) / 1000))}</>
                            )}
                          </p>
                        </div>
                      </a>
                    )}
                  </div>

                  {/* Chiffres rapides */}
                  <div className="mt-6 grid grid-cols-2 gap-3 border-t border-zinc-900 pt-5 sm:grid-cols-4">
                    {[
                      { icon: <Users size={13} className="text-purple-400" />, label: "Followers", value: f.total != null ? nf.format(f.total) : "—" },
                      { icon: <Star size={13} className="text-amber-400" />, label: "Abonnés", value: subsValue },
                      {
                        icon: <UserPlus size={13} className="text-emerald-400" />,
                        label: "Cette semaine",
                        value: f.status === "ok" ? gain(f.gained7d, f.gained7dCapped) : "—",
                      },
                      {
                        icon: <Eye size={13} className="text-sky-400" />,
                        label: live.isLive ? "Spectateurs" : "Vues / diffusion",
                        value: live.isLive ? nf.format(live.viewers) : vs.count ? nf.format(vs.avgViews) : "—",
                      },
                    ].map((s) => (
                      <div key={s.label} className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/70 to-zinc-950/40 px-4 py-3 transition hover:border-zinc-700">
                        <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                          {s.icon} {s.label}
                        </p>
                        <p className="mt-1 text-lg font-black tracking-tight text-white">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Onglets ── */}
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

              {/* ═════════════ VUE D'ENSEMBLE ═════════════ */}
              {tab === "overview" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                      icon={<Users className="text-purple-400" />}
                      label="Followers"
                      value={f.total != null ? nf.format(f.total) : "—"}
                      sub={f.status === "ok" ? `${gain(f.gained7d, f.gained7dCapped)} sur 7 jours` : undefined}
                      tone="purple"
                    />
                    <KpiCard
                      icon={<UserPlus className="text-emerald-400" />}
                      label="Nouveaux (24 h)"
                      value={f.status === "ok" ? gain(f.gained24h, f.gained24hCapped) : "—"}
                      sub={avg7 != null ? `≈ ${nf.format(avg7)} par jour cette semaine` : undefined}
                      spark={f.status === "ok" ? dailyCounts(f.sample, 14) : undefined}
                      tone="emerald"
                    />
                    <KpiCard
                      icon={<Star className="text-amber-400" />}
                      label="Abonnés"
                      value={subsValue}
                      sub={subsSub}
                      tone="amber"
                    />
                    <KpiCard
                      icon={<Eye className="text-sky-400" />}
                      label="Spectateurs"
                      value={live.isLive ? nf.format(live.viewers) : "Hors ligne"}
                      sub={live.isLive ? "en ce moment" : lastLive ? `Dernier live ${formatDate(lastLive)}` : undefined}
                      tone="sky"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <Panel
                        title="Nouveaux followers (14 jours)"
                        icon={<TrendingUp size={14} className="text-purple-400" />}
                        right={
                          <button onClick={() => changeTab("followers")} className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-purple-300 hover:text-purple-200">
                            Détails
                          </button>
                        }
                      >
                        {f.status === "ok" ? (
                          <FollowerChart sample={f.sample} capped={f.sampleCapped} days={14} />
                        ) : (
                          <SectionNotice status={f.status} onReconnect={reconnect} />
                        )}
                      </Panel>
                    </div>

                    <Panel title="10 derniers followers" icon={<UserPlus size={14} className="text-emerald-400" />}>
                      {f.status === "ok" ? (
                        f.recent.length === 0 ? (
                          <p className="py-4 text-sm text-zinc-600">Aucun follower pour l'instant.</p>
                        ) : (
                          <ul className="divide-y divide-zinc-900">
                            {f.recent.map((r) => (
                              <PersonRow
                                key={`${r.id}-${r.followedAt}`}
                                avatar={r.avatar}
                                name={r.name}
                                login={r.login}
                                highlight={isRecent(r.followedAt)}
                                right={
                                  <span className="shrink-0 text-[11px] text-zinc-600" title={fullDate(r.followedAt)}>
                                    {formatDate(r.followedAt)}
                                  </span>
                                }
                              />
                            ))}
                          </ul>
                        )
                      ) : (
                        <SectionNotice status={f.status} onReconnect={reconnect} compact />
                      )}
                    </Panel>
                  </div>

                  {stats.schedule.length > 0 && (
                    <Panel title="Prochains streams" icon={<CalendarDays size={14} className="text-sky-400" />}>
                      <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {stats.schedule.map((s) => (
                          <li key={s.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                            <p className="text-[11px] font-bold capitalize text-purple-300">
                              {new Date(s.start).toLocaleString("fr-FR", { weekday: "long", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                            <p className="mt-1 truncate text-sm font-semibold text-white">{s.title}</p>
                            {s.category && <p className="mt-0.5 truncate text-[11px] text-zinc-500">{s.category}</p>}
                          </li>
                        ))}
                      </ul>
                    </Panel>
                  )}
                </div>
              )}

              {/* ═════════════ FOLLOWERS ═════════════ */}
              {tab === "followers" && (
                <div className="space-y-6">
                  {f.status !== "ok" ? (
                    <SectionNotice status={f.status} onReconnect={reconnect} />
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
                        <KpiCard icon={<Users className="text-purple-400" />} label="Total" value={f.total != null ? nf.format(f.total) : "—"} tone="purple" />
                        <KpiCard icon={<UserPlus className="text-emerald-400" />} label="24 heures" value={gain(f.gained24h, f.gained24hCapped)} tone="emerald" />
                        <KpiCard icon={<TrendingUp className="text-emerald-400" />} label="7 jours" value={gain(f.gained7d, f.gained7dCapped)} sub={avg7 != null ? `≈ ${nf.format(avg7)} par jour` : undefined} tone="emerald" />
                        <KpiCard icon={<CalendarDays className="text-amber-400" />} label="30 jours" value={gain(f.gained30d, f.gained30dCapped)} sub={f.gained30dCapped ? "au moins" : undefined} tone="amber" />
                      </div>

                      <Panel
                        title="Évolution des followers"
                        icon={<TrendingUp size={14} className="text-purple-400" />}
                        right={
                          <div className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-950/60 p-1">
                            {[7, 14, 30].map((d) => (
                              <button
                                key={d}
                                onClick={() => setRange(d)}
                                className={`cursor-pointer rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                                  range === d ? "bg-purple-600/20 text-purple-300" : "text-zinc-500 hover:text-zinc-300"
                                }`}
                              >
                                {d} j
                              </button>
                            ))}
                          </div>
                        }
                      >
                        <FollowerChart sample={f.sample} capped={f.sampleCapped} days={range} />
                      </Panel>

                      {/* ── Départs ── */}
                      <Panel
                        title="Départs (unfollows)"
                        icon={<UserMinus size={14} className="text-rose-400" />}
                        right={
                          unf?.enabled ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => unfollowAction("scan")}
                                disabled={!!unfBusy || !canScan}
                                title={canScan ? "Compare ta liste de followers avec la dernière analyse" : "Une analyse a eu lieu il y a moins de 5 minutes"}
                                className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition hover:text-white disabled:cursor-default disabled:opacity-40"
                              >
                                <RefreshCw size={11} className={unfBusy === "scan" ? "animate-spin" : ""} />
                                {unfBusy === "scan" ? "Analyse…" : "Analyser maintenant"}
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm("Désactiver le suivi ? La liste enregistrée et l'historique des départs seront supprimés immédiatement.")) {
                                    unfollowAction("disable");
                                  }
                                }}
                                disabled={!!unfBusy}
                                className="cursor-pointer rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 transition hover:text-rose-300 disabled:cursor-default disabled:opacity-40"
                              >
                                Désactiver
                              </button>
                            </div>
                          ) : undefined
                        }
                      >
                        {unfError && !unf ? (
                          <p className="py-4 text-sm text-zinc-500">Impossible de charger le suivi des départs pour le moment.</p>
                        ) : !unf ? (
                          <Loader />
                        ) : unf.status !== "ok" ? (
                          <SectionNotice status={unf.status} onReconnect={reconnect} compact />
                        ) : unf.tooLarge ? (
                          <div className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-500">
                            <Info size={16} className="mt-0.5 shrink-0 text-zinc-600" />
                            <span>
                              Le suivi des départs est limité aux chaînes de {nf.format(unf.limit)} followers maximum
                              {unf.total != null ? ` (la tienne en compte ${nf.format(unf.total)})` : ""}.
                            </span>
                          </div>
                        ) : !unf.enabled ? (
                          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
                            <p className="text-sm font-bold text-rose-200">Savoir qui te quitte</p>
                            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                              Twitch ne fournit aucun historique de désabonnements. Pour les repérer, Twichify enregistre la liste de tes followers (pseudos
                              publics) et la compare à chaque analyse : ceux qui ont disparu sont des départs. Un départ n'est donc détecté qu'à l'analyse
                              suivante, pas en temps réel. Tu peux désactiver le suivi à tout moment : la liste et l'historique sont alors supprimés.
                            </p>
                            <button
                              onClick={() => unfollowAction("enable")}
                              disabled={!!unfBusy}
                              className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-rose-500 disabled:opacity-60"
                            >
                              <UserMinus size={13} className={unfBusy === "enable" ? "animate-pulse" : ""} />
                              {unfBusy === "enable" ? "Première analyse en cours…" : "Activer le suivi"}
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="mb-4 text-[11px] leading-relaxed text-zinc-500">
                              Suivi actif depuis le <span className="text-zinc-300">{unf.baselineAt ? shortDate(unf.baselineAt) : "—"}</span> ·{" "}
                              {nf.format(unf.tracked)} followers surveillés · dernière analyse {unf.scannedAt ? formatDate(unf.scannedAt) : "—"}
                            </p>

                            {unf.note === "cooldown" && (
                              <p className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-xs text-zinc-500">
                                La dernière analyse est très récente. Prochaine possible dans {Math.max(1, Math.ceil((unf.retryInSeconds ?? 0) / 60))} min.
                              </p>
                            )}
                            {unf.note === "incomplete" && (
                              <p className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-200/80">
                                L'analyse n'a pas pu lire tous tes followers : rien n'a été modifié pour éviter de faux départs. Réessaie dans un instant.
                              </p>
                            )}
                            {unf.note === "error" && (
                              <p className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-200/80">
                                Twitch n'a pas répondu pendant l'analyse. Réessaie dans un instant.
                              </p>
                            )}
                            {unf.note === "busy" && (
                              <p className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-xs text-zinc-500">
                                Une analyse est déjà en cours.
                              </p>
                            )}

                            {unf.departures.length === 0 ? (
                              <EmptyState
                                icon={<UserMinus size={24} />}
                                text="Aucun départ détecté pour l'instant. Reviens après quelques analyses : les départs apparaissent ici."
                              />
                            ) : (
                              <ul className="twichify-scroll max-h-[26rem] divide-y divide-zinc-900 overflow-y-auto pr-1">
                                {unf.departures.map((d) => (
                                  <PersonRow
                                    key={`${d.id}-${d.followedAt}`}
                                    avatar={d.avatar}
                                    name={d.name}
                                    login={d.login}
                                    linked={!d.accountGone}
                                    sub={
                                      <>
                                        Te suivait depuis le {shortDate(d.followedAt)}
                                        {d.accountGone && <span className="ml-2 rounded-full border border-zinc-700 px-2 py-px text-[9px] font-bold uppercase tracking-wider text-zinc-500">Compte supprimé ou banni</span>}
                                      </>
                                    }
                                    right={
                                      <span className="shrink-0 text-[11px] text-rose-300/80" title={fullDate(d.detectedAt)}>
                                        parti {formatDate(d.detectedAt)}
                                      </span>
                                    }
                                  />
                                ))}
                              </ul>
                            )}
                          </>
                        )}
                      </Panel>

                      <Panel
                        title="Tous les followers"
                        icon={<Users size={14} className="text-sky-400" />}
                        right={
                          <div className="flex flex-wrap items-center gap-2">
                            <SearchInput value={filter} onChange={setFilter} placeholder="Filtrer cette page" />
                            <select
                              value={pageSize}
                              onChange={(e) => changePageSize(Number(e.target.value))}
                              className="cursor-pointer rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-300"
                              aria-label="Followers par page"
                            >
                              {PAGE_SIZES.map((s) => (
                                <option key={s} value={s}>
                                  {s} / page
                                </option>
                              ))}
                            </select>
                          </div>
                        }
                      >
                        {pageError ? (
                          <p className="py-6 text-center text-sm text-zinc-500">Impossible de charger cette page. Réessaie avec « Actualiser ».</p>
                        ) : pageData && pageData.status !== "ok" ? (
                          <SectionNotice status={pageData.status} onReconnect={reconnect} compact />
                        ) : !pageData ? (
                          <Loader />
                        ) : (
                          <>
                            <div className={`transition-opacity ${pageLoading ? "opacity-50" : ""}`}>
                              {visibleFollowers.length === 0 ? (
                                <p className="py-6 text-center text-sm text-zinc-600">
                                  {filter ? "Aucun follower de cette page ne correspond." : "Aucun follower pour l'instant."}
                                </p>
                              ) : (
                                <ul className="divide-y divide-zinc-900">
                                  {visibleFollowers.map((r) => (
                                    <PersonRow
                                      key={`${r.id}-${r.followedAt}`}
                                      rank={pageIndex * pageSize + (pageData.followers.indexOf(r) + 1)}
                                      avatar={r.avatar}
                                      name={r.name}
                                      login={r.login}
                                      highlight={isRecent(r.followedAt)}
                                      right={
                                        <>
                                          <span className="hidden shrink-0 text-[11px] text-zinc-600 md:block">{fullDate(r.followedAt)}</span>
                                          <span className="shrink-0 text-[11px] text-zinc-500 sm:w-24 sm:text-right">{formatDate(r.followedAt)}</span>
                                        </>
                                      }
                                    />
                                  ))}
                                </ul>
                              )}
                            </div>

                            <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-zinc-900 pt-4 sm:flex-row">
                              <p className="text-[11px] text-zinc-500">
                                {pageData.followers.length > 0 ? (
                                  <>
                                    {nf.format(pageIndex * pageSize + 1)}–{nf.format(pageIndex * pageSize + pageData.followers.length)}
                                    {pageData.total != null && ` sur ${nf.format(pageData.total)}`}
                                    {pageData.total != null && ` · page ${nf.format(pageIndex + 1)} / ${nf.format(Math.max(1, Math.ceil(pageData.total / pageSize)))}`}
                                  </>
                                ) : (
                                  "—"
                                )}
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => goToPage(0)}
                                  disabled={pageIndex === 0 || pageLoading}
                                  className="cursor-pointer rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition hover:text-white disabled:cursor-default disabled:opacity-40"
                                >
                                  Début
                                </button>
                                <button
                                  onClick={() => goToPage(pageIndex - 1)}
                                  disabled={pageIndex === 0 || pageLoading}
                                  className="flex cursor-pointer items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition hover:text-white disabled:cursor-default disabled:opacity-40"
                                >
                                  <ChevronLeft size={12} /> Précédent
                                </button>
                                <button
                                  onClick={() => goToPage(pageIndex + 1)}
                                  disabled={!pageData.cursor || pageLoading}
                                  className="flex cursor-pointer items-center gap-1 rounded-xl border border-purple-500/30 bg-purple-600/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-200 transition hover:bg-purple-600/20 disabled:cursor-default disabled:opacity-40"
                                >
                                  Suivant <ChevronRight size={12} />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </Panel>
                    </>
                  )}
                </div>
              )}

              {/* ═════════════ ÉQUIPE (staff) ═════════════ */}
              {tab === "team" && (
                <div className="space-y-6">
                  {team.error && !team.data ? (
                    <EmptyState icon={<AlertTriangle size={26} />} text="Impossible de charger l'équipe pour le moment." />
                  ) : !team.data ? (
                    <Loader />
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                        <KpiCard
                          icon={<Shield className="text-emerald-400" />}
                          label="Modérateurs"
                          value={team.data.moderators.status === "ok" ? `${team.data.moderators.total}${team.data.moderators.capped ? "+" : ""}` : "—"}
                          sub="gèrent le chat"
                          tone="emerald"
                        />
                        <KpiCard
                          icon={<Pencil className="text-sky-400" />}
                          label="Éditeurs"
                          value={team.data.editors.status === "ok" ? String(team.data.editors.total) : "—"}
                          sub="gèrent la chaîne"
                          tone="sky"
                        />
                        <KpiCard
                          icon={<Users className="text-purple-400" />}
                          label="Staff total"
                          value={
                            team.data.moderators.status === "ok" && team.data.editors.status === "ok"
                              ? String(team.data.moderators.total + team.data.editors.total)
                              : "—"
                          }
                          sub="modérateurs + éditeurs"
                          tone="purple"
                        />
                      </div>

                      <div className="flex justify-end">
                        <SearchInput value={teamFilter} onChange={setTeamFilter} placeholder="Chercher dans l'équipe" />
                      </div>

                      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <Panel
                          title="Modérateurs"
                          icon={<Shield size={14} className="text-emerald-400" />}
                          right={<span className="text-[10px] text-zinc-600">Bannissent, suppriment des messages, gèrent le chat</span>}
                        >
                          <MemberGrid
                            section={team.data.moderators}
                            emptyText="Aucun modérateur pour l'instant."
                            filter={teamFilter}
                            roleLabel="Modérateur"
                            roleClass="border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            subline={() => null}
                            onReconnect={reconnect}
                          />
                        </Panel>

                        <Panel
                          title="Éditeurs"
                          icon={<Pencil size={14} className="text-sky-400" />}
                          right={<span className="text-[10px] text-zinc-600">Titre, catégorie, clips, planning, tableau de bord</span>}
                        >
                          <MemberGrid
                            section={team.data.editors}
                            emptyText="Aucun éditeur pour l'instant."
                            filter={teamFilter}
                            roleLabel="Éditeur"
                            roleClass="border-sky-500/30 bg-sky-500/10 text-sky-300"
                            subline={(m) => (m.since ? `Depuis le ${shortDate(m.since)} (${formatAge(m.since)})` : null)}
                            onReconnect={reconnect}
                          />
                        </Panel>
                      </div>

                      <p className="text-[11px] leading-relaxed text-zinc-600">
                        Twitch ne communique la date d'ajout que pour les éditeurs : pour les modérateurs, elle n'est pas disponible. Les VIPs ne font pas partie du staff
                        (simple badge de mise en avant, sans droit sur la chaîne) : ils sont dans l'onglet Communauté.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* ═════════════ COMMUNAUTÉ ═════════════ */}
              {tab === "community" && (
                <div className="space-y-6">
                  {community.error && !community.data ? (
                    <EmptyState icon={<AlertTriangle size={26} />} text="Impossible de charger la communauté pour le moment." />
                  ) : !community.data ? (
                    <Loader />
                  ) : (
                    (() => {
                      const cs2 = community.data.subscribers;
                      const vips = community.data.vips;
                      const bits = community.data.bits;
                      const tierTotal = cs2.tiers.tier1 + cs2.tiers.tier2 + cs2.tiers.tier3 || 1;

                      return (
                        <>
                          <Panel
                            title="Abonnés"
                            icon={<Star size={14} className="text-amber-400" />}
                            right={cs2.status === "ok" ? <SearchInput value={subFilter} onChange={setSubFilter} placeholder="Chercher un abonné" /> : undefined}
                          >
                            {cs2.status !== "ok" ? (
                              <SectionNotice
                                status={cs2.status}
                                onReconnect={reconnect}
                                unavailableText="Les abonnements sont réservés aux chaînes affiliées ou partenaires Twitch."
                              />
                            ) : (
                              <>
                                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">Abonnés</p>
                                    <p className="mt-1 text-2xl font-black text-white">{cs2.total != null ? nf.format(cs2.total) : "—"}</p>
                                  </div>
                                  <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">Points d'abonnement</p>
                                    <p className="mt-1 text-2xl font-black text-white">{cs2.points != null ? nf.format(cs2.points) : "—"}</p>
                                  </div>
                                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">Offerts</p>
                                    <p className="mt-1 text-2xl font-black text-white">
                                      {cs2.sampled ? `${Math.round((cs2.gifted / cs2.sampled) * 100)} %` : "—"}
                                    </p>
                                    <p className="text-[10px] text-zinc-600">{cs2.gifted} sur {cs2.sampled} analysés</p>
                                  </div>
                                </div>

                                {cs2.sampled > 0 && (
                                  <div className="mb-6">
                                    <div className="mb-2 flex h-2.5 overflow-hidden rounded-full bg-white/5">
                                      {([1, 2, 3] as const).map((t) => {
                                        const n = cs2.tiers[`tier${t}` as "tier1" | "tier2" | "tier3"];
                                        return n > 0 ? <div key={t} className={`${TIER_STYLES[t].bar} h-full`} style={{ width: `${(n / tierTotal) * 100}%` }} /> : null;
                                      })}
                                    </div>
                                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-zinc-500">
                                      {([1, 2, 3] as const).map((t) => (
                                        <span key={t} className="inline-flex items-center gap-1.5">
                                          <span className={`h-2 w-2 rounded-full ${TIER_STYLES[t].bar}`} />
                                          {TIER_STYLES[t].label} : {cs2.tiers[`tier${t}` as "tier1" | "tier2" | "tier3"]}
                                        </span>
                                      ))}
                                      {cs2.capped && <span className="text-zinc-600">(répartition sur les {cs2.sampled} premiers abonnés)</span>}
                                    </div>
                                  </div>
                                )}

                                {visibleSubs.length === 0 ? (
                                  <p className="py-4 text-sm text-zinc-600">
                                    {subFilter ? "Aucun abonné ne correspond." : "Aucun abonné pour l'instant."}
                                  </p>
                                ) : (
                                  <ul className="twichify-scroll max-h-[26rem] divide-y divide-zinc-900 overflow-y-auto pr-1">
                                    {visibleSubs.map((m) => (
                                      <PersonRow
                                        key={m.id}
                                        avatar={m.avatar}
                                        name={m.name}
                                        login={m.login}
                                        sub={m.isGift ? `Offert${m.gifter ? ` par ${m.gifter}` : ""}` : undefined}
                                        right={
                                          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${TIER_STYLES[m.tier].badge}`}>
                                            {TIER_STYLES[m.tier].label}
                                          </span>
                                        }
                                      />
                                    ))}
                                  </ul>
                                )}
                              </>
                            )}
                          </Panel>

                          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                            <Panel
                              title="VIPs"
                              icon={<Gem size={14} className="text-purple-400" />}
                              right={
                                vips.status === "ok" ? (
                                  <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 text-[10px] font-black text-zinc-400">
                                    {vips.total}
                                    {vips.capped ? "+" : ""}
                                  </span>
                                ) : undefined
                              }
                            >
                              <MemberGrid
                                section={vips}
                                emptyText="Aucun VIP pour l'instant."
                                filter=""
                                roleLabel="VIP"
                                roleClass="border-purple-500/30 bg-purple-500/10 text-purple-300"
                                subline={() => null}
                                onReconnect={reconnect}
                              />
                              <p className="mt-4 text-[10px] text-zinc-600">Un VIP reçoit un badge de mise en avant. Ce n'est pas un rôle de staff, et Twitch n'indique pas depuis quand.</p>
                            </Panel>

                            <Panel title="Top bits (ce mois-ci)" icon={<Zap size={14} className="text-amber-400" />}>
                              {bits.status !== "ok" ? (
                                <SectionNotice
                                  status={bits.status}
                                  onReconnect={reconnect}
                                  unavailableText="Le classement des bits est réservé aux chaînes affiliées ou partenaires."
                                  compact
                                />
                              ) : bits.entries.length === 0 ? (
                                <p className="py-4 text-sm text-zinc-600">Aucun cheer ce mois-ci.</p>
                              ) : (
                                <ul className="divide-y divide-zinc-900">
                                  {bits.entries.map((e) => (
                                    <PersonRow
                                      key={e.id}
                                      rank={e.rank}
                                      podium
                                      avatar={e.avatar}
                                      name={e.name}
                                      login={e.login}
                                      right={<span className="shrink-0 text-xs font-black text-amber-300">{nf.format(e.score)} bits</span>}
                                    />
                                  ))}
                                </ul>
                              )}
                            </Panel>
                          </div>
                        </>
                      );
                    })()
                  )}
                </div>
              )}

              {/* ═════════════ CHAT (statistiques collectées par le widget, optionnelles) ═════════════ */}
              {tab === "chat" && <ChatStatsTab />}

              {/* ═════════════ CONTENU ═════════════ */}
              {tab === "content" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                      icon={<Video className="text-sky-400" />}
                      label="Diffusions (30 j)"
                      value={`${vs.last30dCount}${vs.last30dCapped ? "+" : ""}`}
                      sub={`${formatDuration(vs.last30dSeconds)} en live`}
                      tone="sky"
                    />
                    <KpiCard
                      icon={<Eye className="text-purple-400" />}
                      label="Vues / diffusion"
                      value={nf.format(vs.avgViews)}
                      sub={`${nf.format(vs.totalViews)} vues sur les ${vs.count} dernières`}
                      tone="purple"
                    />
                    <KpiCard
                      icon={<Timer className="text-amber-400" />}
                      label="Durée moyenne"
                      value={vs.count ? formatDuration(vs.avgSeconds) : "—"}
                      sub={vs.count ? `sur les ${vs.count} dernières diffusions` : undefined}
                      tone="amber"
                    />
                    <KpiCard
                      icon={<Film className="text-emerald-400" />}
                      label="Clips (30 j)"
                      value={`${cs.count}${cs.capped ? "+" : ""}`}
                      sub={`${nf.format(cs.totalViews)} vues au total`}
                      tone="emerald"
                    />
                  </div>

                  {vs.best && (
                    <a
                      href={vs.best.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center gap-4 rounded-[24px] border border-amber-500/20 bg-amber-500/5 p-5 transition hover:border-amber-500/40"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/70">
                        <Trophy size={18} className="text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-amber-300/80">Meilleure diffusion récente</p>
                        <p className="truncate text-sm font-bold text-white transition-colors group-hover:text-amber-200">{vs.best.title}</p>
                      </div>
                      <span className="shrink-0 text-sm font-black text-amber-200">{nf.format(vs.best.views)} vues</span>
                    </a>
                  )}

                  <Panel title="Dernières diffusions" icon={<Video size={14} className="text-sky-400" />}>
                    {stats.videos.length === 0 ? (
                      <EmptyState icon={<Video size={24} />} text="Aucune rediffusion disponible." />
                    ) : (
                      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {stats.videos.map((v) => (
                          <li key={v.id}>
                            <a
                              href={v.url}
                              target="_blank"
                              rel="noreferrer"
                              className="group block overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 transition hover:border-purple-500/40"
                            >
                              <div className="relative aspect-video bg-zinc-900">
                                {v.thumbnail && <img src={v.thumbnail} alt="" className="h-full w-full object-cover" />}
                                <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  {formatDuration(v.durationSeconds)}
                                </span>
                              </div>
                              <div className="p-3">
                                <p className="truncate text-sm font-semibold text-white transition-colors group-hover:text-purple-300">{v.title}</p>
                                <p className="mt-0.5 text-[11px] text-zinc-500">
                                  {nf.format(v.views)} vue{v.views > 1 ? "s" : ""} · {formatDate(v.createdAt)}
                                </p>
                              </div>
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <Panel title="Clips les plus vus (30 jours)" icon={<Film size={14} className="text-emerald-400" />}>
                        {stats.clips.length === 0 ? (
                          <EmptyState icon={<Film size={24} />} text="Aucun clip sur les 30 derniers jours." />
                        ) : (
                          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {stats.clips.map((c) => (
                              <li key={c.id}>
                                <a
                                  href={c.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="group block overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 transition hover:border-emerald-500/40"
                                >
                                  <div className="relative aspect-video bg-zinc-900">
                                    {c.thumbnail && <img src={c.thumbnail} alt="" className="h-full w-full object-cover" />}
                                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                      <Eye size={10} /> {nf.format(c.views)}
                                    </span>
                                  </div>
                                  <div className="p-3">
                                    <p className="truncate text-sm font-semibold text-white transition-colors group-hover:text-emerald-300">{c.title}</p>
                                    <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                                      {c.creator ? `par ${c.creator} · ` : ""}
                                      {formatDate(c.createdAt)}
                                    </p>
                                  </div>
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </Panel>
                    </div>

                    <Panel title="Qui clippe le plus" icon={<Trophy size={14} className="text-amber-400" />}>
                      {cs.topCreators.length === 0 ? (
                        <p className="py-4 text-sm text-zinc-600">Pas encore de clips sur la période.</p>
                      ) : (
                        <ul className="space-y-4">
                          {cs.topCreators.map((c, i) => {
                            const max = cs.topCreators[0]?.clips || 1;
                            return (
                              <li key={c.name}>
                                <div className="mb-1 flex items-center justify-between text-xs">
                                  <span className="truncate text-zinc-300">
                                    <span className="mr-1.5 font-black text-zinc-600">{i + 1}</span>
                                    {c.name}
                                  </span>
                                  <span className="shrink-0 font-bold text-zinc-500">
                                    {c.clips} clip{c.clips > 1 ? "s" : ""}
                                  </span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                                    style={{ width: `${(c.clips / max) * 100}%` }}
                                  />
                                </div>
                                <p className="mt-1 text-[10px] text-zinc-600">{nf.format(c.views)} vues cumulées</p>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </Panel>
                  </div>

                  {stats.schedule.length > 0 && (
                    <Panel title="Prochains streams" icon={<CalendarDays size={14} className="text-sky-400" />}>
                      <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {stats.schedule.map((s) => (
                          <li key={s.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                            <p className="text-[11px] font-bold capitalize text-purple-300">
                              {new Date(s.start).toLocaleString("fr-FR", { weekday: "long", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                            <p className="mt-1 truncate text-sm font-semibold text-white">{s.title}</p>
                            {s.category && <p className="mt-0.5 truncate text-[11px] text-zinc-500">{s.category}</p>}
                          </li>
                        ))}
                      </ul>
                    </Panel>
                  )}
                </div>
              )}

              <p className="flex items-center gap-2 text-[11px] text-zinc-600">
                <Radio size={11} /> Données lues en direct sur Twitch, actualisées chaque minute. Seul le suivi des départs (si tu l'actives) enregistre une liste de tes followers.
              </p>
            </>
          );
        })()
      )}
    </div>
  );
}
