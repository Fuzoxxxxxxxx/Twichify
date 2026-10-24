"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Activity,
  Server,
  Music,
  Radio,
  Layers,
  ChevronDown,
  Smile,
} from "lucide-react";
import PublicShell from "@/components/site/PublicShell";
import PageIntro from "@/components/site/PageIntro";

type BarState = "green" | "yellow" | "red" | "gray";

interface Service {
  name: string;
  // « core » : Spotify, Twitch, serveurs ; « emotes » : services tiers d'emotes du widget de chat.
  group?: "core" | "emotes";
  status: string;
  percent: string;
  uptime30d: number | null;
  history: BarState[];
  historyMinutes?: BarState[];
  // Trafic réel des utilisateurs sur les 10 dernières minutes (null = pas assez d'appels pour conclure).
  realTraffic?: { requests: number; errorRate: number; degraded: boolean } | null;
}

type View = "minutes" | "hours";

interface Incident {
  _id: string;
  title: string;
  service: string;
  status: string;
  impact?: string;
  createdAt: string;
  description?: string;
  updates?: { message: string; createdAt: string }[];
}

const REFRESH_MS = 15000;

/* ------------------------------ Styles / maps ------------------------------ */

// Mêmes teintes que le changelog (émeraude / bleu / ambre) pour garder une identité visuelle commune.
const TONE = {
  emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  amber: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  rose: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  blue: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  zinc: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30",
};

const BAR_COLOR: Record<string, string> = {
  green: "bg-emerald-500 hover:bg-emerald-400",
  yellow: "bg-amber-400 hover:bg-amber-300",
  red: "bg-rose-500 hover:bg-rose-400",
  gray: "bg-zinc-800 hover:bg-zinc-700",
};

const STATE_LABEL: Record<string, string> = {
  green: "Opérationnel",
  yellow: "Dégradé",
  red: "Panne",
  gray: "Aucune donnée",
};

const SERVICE_STATE: Record<string, { label: string; text: string; dot: string }> = {
  Operational: { label: "Opérationnel", text: "text-emerald-400", dot: "bg-emerald-400" },
  Degraded: { label: "Dégradé", text: "text-amber-400", dot: "bg-amber-400" },
  Down: { label: "Panne", text: "text-rose-400", dot: "bg-rose-400" },
  Unknown: { label: "Aucune donnée récente", text: "text-zinc-400", dot: "bg-zinc-500" },
};

const INCIDENT_STATUS: Record<string, { label: string; tone: string }> = {
  resolved: { label: "Résolu", tone: TONE.emerald },
  monitoring: { label: "Sous surveillance", tone: TONE.blue },
  identified: { label: "Identifié", tone: TONE.amber },
  investigating: { label: "En analyse", tone: TONE.amber },
};

const IMPACT_META: Record<string, { label: string; tone: string }> = {
  none: { label: "Sans impact", tone: TONE.zinc },
  minor: { label: "Impact mineur", tone: TONE.amber },
  major: { label: "Impact majeur", tone: TONE.rose },
  critical: { label: "Impact critique", tone: TONE.rose },
};

// Carte d'en-tête : même gabarit que le « hero » du changelog, teinté selon l'état global.
const HERO = {
  loading: {
    title: "Vérification des systèmes...",
    border: "border-zinc-700/40",
    glow: "shadow-[0_0_50px_rgba(113,113,122,0.08)]",
    blob: "bg-zinc-500/10",
    chip: "bg-zinc-700/30 border-zinc-600/30 text-zinc-300",
    label: "text-zinc-400",
    dot: "bg-zinc-400",
    Icon: RefreshCw,
  },
  ok: {
    title: "Tous les systèmes sont opérationnels",
    border: "border-emerald-500/25",
    glow: "shadow-[0_0_50px_rgba(16,185,129,0.08)]",
    blob: "bg-emerald-500/10",
    chip: "bg-emerald-500/15 border-emerald-500/25 text-emerald-400",
    label: "text-emerald-400",
    dot: "bg-emerald-400",
    Icon: CheckCircle2,
  },
  degraded: {
    title: "Certains services rencontrent des perturbations",
    border: "border-amber-500/25",
    glow: "shadow-[0_0_50px_rgba(245,158,11,0.08)]",
    blob: "bg-amber-500/10",
    chip: "bg-amber-500/15 border-amber-500/25 text-amber-400",
    label: "text-amber-400",
    dot: "bg-amber-400",
    Icon: AlertTriangle,
  },
  error: {
    title: "Impossible de charger l'état des systèmes",
    border: "border-rose-500/25",
    glow: "shadow-[0_0_50px_rgba(244,63,94,0.08)]",
    blob: "bg-rose-500/10",
    chip: "bg-rose-500/15 border-rose-500/25 text-rose-400",
    label: "text-rose-400",
    dot: "bg-rose-400",
    Icon: XCircle,
  },
};

/* --------------------------------- Helpers --------------------------------- */

const statusMeta = (s?: string) =>
  INCIDENT_STATUS[s?.toLowerCase() ?? ""] ?? { label: s || "En cours", tone: TONE.amber };

const isResolved = (i: Incident) => i.status?.toLowerCase() === "resolved";

const serviceIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("spotify")) return Music;
  if (n.includes("twitch")) return Radio;
  if (n.includes("ttv") || n.includes("frankerfacez")) return Smile;
  if (n.includes("overlay")) return Layers;
  return Server;
};

const uptimeTone = (percent: string) => {
  const v = parseFloat(percent);
  if (isNaN(v)) return TONE.zinc;
  if (v >= 99) return TONE.emerald;
  if (v >= 95) return TONE.amber;
  return TONE.rose;
};

const uptimeText = (v: number) => (v >= 99 ? "text-emerald-400" : v >= 95 ? "text-amber-400" : "text-rose-400");

const latencyText = (latency: string) => {
  const ms = parseInt(latency, 10);
  if (isNaN(ms)) return "text-zinc-400";
  if (ms < 300) return "text-emerald-400";
  if (ms < 800) return "text-amber-400";
  return "text-rose-400";
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return "";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
};

const fullDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/* ------------------------------- Sous-composants ------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-800/60 ${className}`} />;
}

/** Chiffre clé de la bannière d'état. */
function HeroStat({ label, value, valueClass = "text-white" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className={`font-display text-2xl font-extrabold tabular-nums sm:text-3xl ${valueClass}`}>{value}</p>
      <p className="mt-1 text-sm text-zinc-400">{label}</p>
    </div>
  );
}

function ServiceCard({ service, index, view }: { service: Service; index: number; view: View }) {
  const Icon = serviceIcon(service.name);
  const state = SERVICE_STATE[service.status] ?? SERVICE_STATE.Unknown;
  const byMinute = view === "minutes" && !!service.historyMinutes?.length;
  const bars = (byMinute ? service.historyMinutes : service.history) ?? [];
  const points = bars.length;

  return (
    <div
      style={{ animationDelay: `${index * 60}ms` }}
      className="st-fade rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-purple-500/25 bg-purple-500/10 text-purple-300">
            <Icon size={17} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-white">{service.name}</p>
            <p className={`mt-0.5 flex items-center gap-1.5 text-sm font-medium ${state.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
              {state.label}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className={`inline-block rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold ${uptimeTone(service.percent)}`}>
            {service.percent}
          </span>
          <p className="mt-1 text-xs text-zinc-400">disponibilité 24 h</p>
          {service.uptime30d !== null && (
            <p className="mt-0.5 text-xs text-zinc-400">
              <span className={uptimeText(service.uptime30d)}>{service.uptime30d.toFixed(2)}%</span> sur 30 j
            </p>
          )}
        </div>
      </div>

      {service.realTraffic && (
        <p
          className={`mb-3 flex items-center gap-1.5 text-sm ${
            service.realTraffic.degraded ? "text-amber-400" : "text-zinc-400"
          }`}
        >
          <Activity size={11} className="shrink-0" />
          Appels réels : {service.realTraffic.requests.toLocaleString("fr-FR")} sur 10 min ·{" "}
          {service.realTraffic.errorRate.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % d&apos;erreurs
        </p>
      )}

      {/* Frise d'historique */}
      <div
        className={`flex h-7 items-center ${byMinute ? "gap-[2px]" : "gap-1.5"}`}
        role="img"
        aria-label={`Historique de ${service.name} sur ${byMinute ? `${points} minutes` : "24 heures"}`}
      >
        {bars.map((bar, i) => {
          const ago = points - 1 - i;
          const when = byMinute
            ? ago === 0
              ? "Maintenant"
              : `${new Date(Date.now() - ago * 60000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} (il y a ${ago} min)`
            : ago === 0
            ? "Actuel"
            : `Il y a ${ago} h`;
          return (
            <div
              key={`${service.name}-${i}`}
              className={`h-full flex-1 origin-bottom ${byMinute ? "rounded-[2px]" : "rounded-sm"} transition-all duration-150 hover:scale-y-110 ${BAR_COLOR[bar] ?? "bg-zinc-800"}`}
              title={`${when} · ${STATE_LABEL[bar] ?? bar}`}
            />
          );
        })}
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs font-medium text-zinc-400">
        <span>{byMinute ? `Il y a ${points} min` : "Il y a 24h"}</span>
        <span>{byMinute ? "Maintenant" : "Aujourd'hui"}</span>
      </div>
    </div>
  );
}

function IncidentCard({ incident, active }: { incident: Incident; active?: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = statusMeta(incident.status);
  const impact = incident.impact ? IMPACT_META[incident.impact.toLowerCase()] ?? { label: incident.impact, tone: TONE.zinc } : null;

  // Du plus récent au plus ancien : le titre affiche toujours la dernière information.
  const updates = [...(incident.updates ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const headline = updates[0]?.message || incident.description || "Aucun détail fourni.";

  return (
    <div
      className={`st-fade space-y-3 rounded-2xl border p-5 sm:p-6 ${
        active
          ? "border-amber-500/30 bg-amber-500/[0.05]"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <h4 className="text-base font-bold text-white">{incident.title}</h4>
        <span className="shrink-0 text-xs text-zinc-400" title={fullDate(incident.createdAt)}>
          {timeAgo(incident.createdAt)}
        </span>
      </div>

      <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">{headline}</p>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${meta.tone}`}>
          {meta.label}
        </span>
        {impact && (
          <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${impact.tone}`}>
            {impact.label}
          </span>
        )}
        <span className="text-zinc-400">
          Service affecté : <strong className="text-zinc-300">{incident.service}</strong>
        </span>
      </div>

      {updates.length > 1 && (
        <div>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-zinc-400 transition-colors hover:text-purple-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
          >
            <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            {open ? "Masquer" : "Voir"} les {updates.length} mises à jour
          </button>

          {open && (
            <ol className="mt-3 space-y-3 border-l border-zinc-800 pl-4">
              {updates.map((u, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-zinc-600 ring-4 ring-zinc-950" />
                  <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">{u.message}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{fullDate(u.createdAt)}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

export default function StatusPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isAllOperational, setIsAllOperational] = useState(true);
  const [latency, setLatency] = useState("--");
  const [lastUpdated, setLastUpdated] = useState("--");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [view, setView] = useState<View>("minutes");

  const loadStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.services?.length) setServices(data.services);
      setIncidents(data.incidents ?? []);
      if (data.latency) setLatency(data.latency);
      setIsAllOperational(!!data.allSystemsOperational);
      setHasError(false);

      setLastUpdated(
        new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    } catch (error) {
      console.error("Erreur chargement status", error);
      setHasError(true);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Actualisation auto, uniquement quand l'onglet est visible.
  useEffect(() => {
    loadStatus();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") loadStatus();
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") loadStatus();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = services.length;
  const coreServices = services.filter((s) => (s.group ?? "core") === "core");
  const emoteServices = services.filter((s) => s.group === "emotes");
  const okCount = services.filter((s) => s.status === "Operational").length;
  const activeIncidents = incidents.filter((i) => !isResolved(i));
  const resolvedIncidents = incidents.filter(isResolved);
  const uptimes = services.map((s) => parseFloat(s.percent)).filter((v) => !isNaN(v));
  const avgUptime = uptimes.length ? uptimes.reduce((a, b) => a + b, 0) / uptimes.length : null;

  const heroKey: keyof typeof HERO = hasError
    ? "error"
    : loading
    ? "loading"
    : isAllOperational && activeIncidents.length === 0
    ? "ok"
    : "degraded";
  const hero = HERO[heroKey];
  const HeroIcon = hero.Icon;

  const heroSub = {
    loading: "Récupération des métriques...",
    ok: `${okCount}/${total} services opérationnels`,
    degraded:
      activeIncidents.length > 0
        ? `${activeIncidents.length} incident${activeIncidents.length > 1 ? "s" : ""} en cours`
        : `${total - okCount} service${total - okCount > 1 ? "s" : ""} dégradé${total - okCount > 1 ? "s" : ""}`,
    error: "Nouvelle tentative automatique dans quelques secondes",
  }[heroKey];

  const pill = (active: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 ${
      active
        ? "border-purple-500/50 bg-purple-500/15 text-purple-200"
        : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
    }`;

  return (
    <PublicShell>
      <style>{`
        @keyframes st-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .st-fade { animation: st-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) { .st-fade { animation: none; } }
      `}</style>

      <PageIntro
        title="État des services"
        action={
          <button
            onClick={loadStatus}
            disabled={isRefreshing}
            aria-label="Rafraîchir"
            title="Rafraîchir"
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 disabled:opacity-50"
          >
            <RefreshCw size={15} className={isRefreshing ? "animate-spin text-purple-300" : ""} />
            Rafraîchir
          </button>
        }
      >
        Disponibilité en temps réel de Twichify et des services dont il dépend.
      </PageIntro>

      {/* État global + chiffres clés */}
      <section
        aria-live="polite"
        className={`mt-8 mb-10 rounded-2xl border ${hero.border} bg-white/[0.02] p-6 transition-colors duration-300 sm:p-8`}
      >
        <div className="flex items-center gap-4">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${hero.chip}`}>
            <HeroIcon size={18} className={heroKey === "loading" ? "animate-spin" : ""} />
          </span>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">{hero.title}</h2>
        </div>

        <p className="mt-3 text-sm text-zinc-400">
          {heroSub}
          {lastUpdated !== "--" && ` · Mis à jour à ${lastUpdated}`}
        </p>

        {hasError && (
          <button
            onClick={loadStatus}
            className="mt-4 cursor-pointer rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
          >
            Réessayer
          </button>
        )}

        {/* Chiffres clés */}
        {total === 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-6 border-t border-white/10 pt-6 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton className="h-7 w-16" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-6 border-t border-white/10 pt-6 sm:grid-cols-4">
            <HeroStat
              label="Services opérationnels"
              value={`${okCount}/${total}`}
              valueClass={okCount === total ? "text-emerald-400" : "text-amber-400"}
            />
            <HeroStat
              label="Disponibilité 24 h"
              value={avgUptime !== null ? `${avgUptime.toFixed(1)}%` : "--"}
              valueClass={avgUptime !== null ? uptimeText(avgUptime) : "text-zinc-400"}
            />
            <HeroStat label="Latence BDD" value={latency} valueClass={latencyText(latency)} />
            <HeroStat
              label="Incidents en cours"
              value={String(activeIncidents.length)}
              valueClass={activeIncidents.length > 0 ? "text-amber-400" : "text-emerald-400"}
            />
          </div>
        )}
      </section>

          {/* Incidents en cours */}
          {activeIncidents.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-amber-300">
                <AlertTriangle size={18} />
                <span>Incidents en cours</span>
              </h2>
              <div className="space-y-4">
                {activeIncidents.map((incident, idx) => (
                  <IncidentCard key={incident._id || idx} incident={incident} active />
                ))}
              </div>
            </section>
          )}

          {/* Infrastructure */}
          <section className="mb-12">
            <div className="mb-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2.5 font-display text-xl font-bold text-white">
                  <Server size={18} className="text-purple-300" />
                  <span>Infrastructure</span>
                </h2>

                <div className="flex items-center gap-2" role="group" aria-label="Granularité de la frise">
                  {(["minutes", "hours"] as const).map((v) => (
                    <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={pill(view === v)}>
                      {v === "minutes" ? "90 min" : "24 h"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-400">
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-emerald-500" />Opérationnel</span>
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-amber-400" />Dégradé</span>
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-rose-500" />Panne</span>
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-zinc-700" />Aucune donnée</span>
              </div>
            </div>

            <div className="space-y-4">
              {services.length === 0
                ? loading
                  ? [0, 1, 2].map((i) => (
                      <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
                        <div className="mb-4 flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-xl" />
                          <div className="space-y-2">
                            <Skeleton className="h-3 w-28" />
                            <Skeleton className="h-2.5 w-20" />
                          </div>
                        </div>
                        <Skeleton className="h-7 w-full" />
                      </div>
                    ))
                  : (
                      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-12 text-center">
                        <Server size={28} className="mx-auto mb-3 text-zinc-600" />
                        <p className="text-sm text-zinc-300">Aucune métrique disponible pour le moment.</p>
                      </div>
                    )
                : coreServices.map((service, i) => <ServiceCard key={service.name} service={service} index={i} view={view} />)}
            </div>
          </section>

          {/* Émotes du chat (services tiers) */}
          {emoteServices.length > 0 && (
            <section className="mb-12">
              <div className="mb-5">
                <h2 className="flex items-center gap-2.5 font-display text-xl font-bold text-white">
                  <Smile size={18} className="text-purple-300" />
                  <span>Émotes du chat</span>
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Services tiers utilisés par le widget de chat pour afficher les emotes. Une panne n&apos;empêche pas le chat
                  de s&apos;afficher, mais certaines emotes peuvent manquer.
                </p>
              </div>

              <div className="space-y-4">
                {emoteServices.map((service, i) => (
                  <ServiceCard key={service.name} service={service} index={coreServices.length + i} view={view} />
                ))}
              </div>
            </section>
          )}

          {/* Historique des incidents */}
          <section>
            <h2 className="mb-6 font-display text-xl font-bold text-white">
              Historique des incidents, 7 derniers jours
            </h2>

            {incidents.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                <p className="text-sm font-medium text-zinc-300">Aucun incident signalé durant les 7 derniers jours.</p>
              </div>
            ) : resolvedIncidents.length === 0 ? (
              <p className="text-sm text-zinc-400">Aucun incident résolu sur la période.</p>
            ) : (
              <div className="relative pl-8">
                <div aria-hidden="true" className="absolute left-[9px] top-2 bottom-2 w-px bg-white/10" />
                <div className="space-y-6">
                  {resolvedIncidents.map((incident, idx) => (
                    <div key={incident._id || idx} className="relative">
                      <div aria-hidden="true" className="absolute -left-8 top-6 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-zinc-700 bg-black">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </div>
                      <IncidentCard incident={incident} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
    </PublicShell>
  );
}
