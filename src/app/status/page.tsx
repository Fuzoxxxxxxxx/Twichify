"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
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
  Clock,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

type BarState = "green" | "yellow" | "red" | "gray";

interface Service {
  name: string;
  status: string;
  percent: string;
  uptime30d: number | null;
  history: BarState[];
  historyMinutes?: BarState[];
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

const TONE = {
  emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  zinc: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
};

const BAR_COLOR: Record<string, string> = {
  green: "bg-emerald-500 hover:bg-emerald-400",
  yellow: "bg-amber-400 hover:bg-amber-300",
  red: "bg-rose-500 hover:bg-rose-400",
  gray: "bg-zinc-700 hover:bg-zinc-600",
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

const BANNER = {
  loading: {
    title: "Vérification des systèmes...",
    box: "border-zinc-700/40 bg-zinc-900/40 shadow-black/20",
    iconBox: "bg-zinc-700/30 text-zinc-300",
    dot: "bg-zinc-400",
    Icon: RefreshCw,
  },
  ok: {
    title: "Tous les systèmes sont opérationnels",
    box: "border-emerald-500/20 bg-emerald-950/20 shadow-emerald-950/20",
    iconBox: "bg-emerald-500/20 text-emerald-400",
    dot: "bg-emerald-400",
    Icon: CheckCircle2,
  },
  degraded: {
    title: "Certains services rencontrent des perturbations",
    box: "border-amber-500/20 bg-amber-950/20 shadow-amber-950/20",
    iconBox: "bg-amber-500/20 text-amber-400",
    dot: "bg-amber-400",
    Icon: AlertTriangle,
  },
  error: {
    title: "Impossible de charger l'état des systèmes",
    box: "border-rose-500/20 bg-rose-950/20 shadow-rose-950/20",
    iconBox: "bg-rose-500/20 text-rose-400",
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

function StatCard({ label, value, valueClass = "text-white" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4 backdrop-blur-md">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-1.5 font-mono text-xl font-black ${valueClass}`}>{value}</p>
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
      className="st-fade rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5 backdrop-blur-md transition hover:border-zinc-700/80"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-300">
            <Icon size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-white">{service.name}</p>
            <p className={`mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold ${state.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
              {state.label}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className={`inline-block rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold ${uptimeTone(service.percent)}`}>
            {service.percent}
          </span>
          <p className="mt-1 text-[10px] text-zinc-600">disponibilité 24 h</p>
          {service.uptime30d !== null && (
            <p className="mt-0.5 text-[10px] text-zinc-600">
              <span className={uptimeText(service.uptime30d)}>{service.uptime30d.toFixed(2)}%</span> sur 30 j
            </p>
          )}
        </div>
      </div>

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

      <div className="mt-2.5 flex items-center justify-between text-[11px] font-medium text-zinc-500">
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
      className={`st-fade space-y-3 rounded-2xl border p-5 ${
        active ? "border-amber-500/25 bg-amber-950/10" : "border-zinc-800/80 bg-zinc-950/40"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <h4 className="text-sm font-bold text-white">{incident.title}</h4>
        <span className="shrink-0 font-mono text-[11px] text-zinc-500" title={fullDate(incident.createdAt)}>
          {timeAgo(incident.createdAt)}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-zinc-300">{headline}</p>

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className={`rounded-md border px-2 py-0.5 font-semibold ${meta.tone}`}>{meta.label}</span>
        {impact && <span className={`rounded-md border px-2 py-0.5 font-semibold ${impact.tone}`}>{impact.label}</span>}
        <span className="text-zinc-500">
          Service affecté : <strong className="text-zinc-300">{incident.service}</strong>
        </span>
      </div>

      {updates.length > 1 && (
        <div>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 transition hover:text-purple-400"
          >
            <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            {open ? "Masquer" : "Voir"} les {updates.length} mises à jour
          </button>

          {open && (
            <ol className="mt-3 space-y-3 border-l border-zinc-800 pl-4">
              {updates.map((u, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-zinc-600 ring-4 ring-zinc-950" />
                  <p className="text-xs leading-relaxed text-zinc-300">{u.message}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-zinc-600">{fullDate(u.createdAt)}</p>
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
  const router = useRouter();
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

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const total = services.length;
  const okCount = services.filter((s) => s.status === "Operational").length;
  const activeIncidents = incidents.filter((i) => !isResolved(i));
  const resolvedIncidents = incidents.filter(isResolved);
  const uptimes = services.map((s) => parseFloat(s.percent)).filter((v) => !isNaN(v));
  const avgUptime = uptimes.length ? uptimes.reduce((a, b) => a + b, 0) / uptimes.length : null;

  const bannerKey: keyof typeof BANNER = hasError
    ? "error"
    : loading
    ? "loading"
    : isAllOperational && activeIncidents.length === 0
    ? "ok"
    : "degraded";
  const banner = BANNER[bannerKey];
  const BannerIcon = banner.Icon;

  const bannerSub = {
    loading: "Récupération des métriques...",
    ok: `${okCount}/${total} services opérationnels`,
    degraded:
      activeIncidents.length > 0
        ? `${activeIncidents.length} incident${activeIncidents.length > 1 ? "s" : ""} en cours`
        : `${total - okCount} service${total - okCount > 1 ? "s" : ""} dégradé${total - okCount > 1 ? "s" : ""}`,
    error: "Nouvelle tentative automatique dans quelques secondes",
  }[bannerKey];

  return (
    <main className="min-h-screen bg-[#07090e] text-white selection:bg-purple-500/30">
      <style>{`
        @keyframes st-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .st-fade { animation: st-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) { .st-fade { animation: none; } }
      `}</style>

      {/* Halos de fond */}
      <div className="pointer-events-none fixed top-0 left-1/2 -z-10 h-[350px] w-[1000px] -translate-x-1/2 bg-gradient-to-b from-purple-600/10 via-indigo-500/5 to-transparent blur-[140px]" />

      <SiteHeader />

      <div className="mx-auto max-w-4xl px-6 pb-12 pt-10">

        {/* En-tête */}
        <header className="mb-10 flex flex-col justify-between gap-6 border-b border-zinc-800/60 pb-8 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
              <Activity size={14} />
              <span>Surveillance en temps réel</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">État des Services</h1>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500">
              <Clock size={11} />
              Actualisation automatique toutes les {REFRESH_MS / 1000} s
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              onClick={loadStatus}
              disabled={isRefreshing}
              aria-label="Rafraîchir"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 p-2.5 text-zinc-400 shadow-sm transition hover:border-zinc-700 hover:text-white disabled:opacity-50"
              title="Rafraîchir"
            >
              <RefreshCw size={16} className={isRefreshing ? "animate-spin text-purple-400" : ""} />
            </button>
            <button
              onClick={handleGoBack}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-xs font-bold text-zinc-300 shadow-sm transition hover:border-zinc-700 hover:text-white"
            >
              <ArrowLeft size={14} />
              <span>Retour</span>
            </button>
          </div>
        </header>

        {/* Bannière de statut global */}
        <section
          aria-live="polite"
          className={`mb-6 rounded-2xl border p-6 shadow-xl backdrop-blur-xl transition-all duration-300 ${banner.box}`}
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${banner.iconBox}`}>
                <BannerIcon size={22} className={bannerKey === "loading" ? "animate-spin" : ""} />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${banner.dot}`} />
                  <span className={`relative inline-flex h-3 w-3 rounded-full ${banner.dot}`} />
                </span>
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-white">{banner.title}</h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {bannerSub}
                  {lastUpdated !== "--" && ` · Mis à jour à ${lastUpdated}`}
                </p>
              </div>
            </div>

            {hasError && (
              <button
                onClick={loadStatus}
                className="self-start rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20 sm:self-auto"
              >
                Réessayer
              </button>
            )}
          </div>
        </section>

        {/* Chiffres clés */}
        {total === 0 ? (
          <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="mt-3 h-6 w-20" />
              </div>
            ))}
          </section>
        ) : (
          <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Services"
              value={`${okCount}/${total}`}
              valueClass={okCount === total ? "text-emerald-400" : "text-amber-400"}
            />
            <StatCard
              label="Disponibilité 24 h"
              value={avgUptime !== null ? `${avgUptime.toFixed(1)}%` : "--"}
              valueClass={avgUptime !== null ? uptimeText(avgUptime) : "text-zinc-400"}
            />
            <StatCard label="Latence BDD" value={latency} valueClass={latencyText(latency)} />
            <StatCard
              label="Incidents en cours"
              value={String(activeIncidents.length)}
              valueClass={activeIncidents.length > 0 ? "text-amber-400" : "text-emerald-400"}
            />
          </section>
        )}

        {/* Incidents en cours */}
        {activeIncidents.length > 0 && (
          <section className="mb-10">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-400">
              <AlertTriangle size={14} />
              <span>Incidents en cours</span>
            </h3>
            <div className="space-y-4">
              {activeIncidents.map((incident, idx) => (
                <IncidentCard key={incident._id || idx} incident={incident} active />
              ))}
            </div>
          </section>
        )}

        {/* Liste des services */}
        <section className="mb-12">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-zinc-500">
              <Server size={14} />
              <span>Infrastructure</span>
            </h3>
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-zinc-500">
              <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5" role="group" aria-label="Granularité de la frise">
                {(["minutes", "hours"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    aria-pressed={view === v}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                      view === v ? "bg-purple-600/30 text-purple-200" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {v === "minutes" ? "90 min" : "24 h"}
                  </button>
                ))}
              </div>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Opérationnel</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />Dégradé</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />Panne</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-zinc-700" />Aucune donnée</span>
            </div>
          </div>

          <div className="space-y-4">
            {services.length === 0
              ? loading
                ? [0, 1, 2].map((i) => (
                    <div key={i} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5">
                      <div className="mb-4 flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-xl" />
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-2.5 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-7 w-full" />
                    </div>
                  ))
                : (
                    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-8 text-center text-xs text-zinc-500">
                      Aucune métrique disponible pour le moment.
                    </div>
                  )
              : services.map((service, i) => <ServiceCard key={service.name} service={service} index={i} view={view} />)}
          </div>
        </section>

        {/* Historique des incidents */}
        <section className="border-t border-zinc-800/60 pt-10">
          <h3 className="mb-6 text-xs font-extrabold uppercase tracking-wider text-zinc-500">
            Historique des incidents (7 derniers jours)
          </h3>

          {incidents.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-950/30 p-5">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
              <p className="text-xs font-medium text-zinc-400">Aucun incident signalé durant les 7 derniers jours.</p>
            </div>
          ) : resolvedIncidents.length === 0 ? (
            <p className="text-xs text-zinc-500">Aucun incident résolu sur la période.</p>
          ) : (
            <div className="space-y-4">
              {resolvedIncidents.map((incident, idx) => (
                <IncidentCard key={incident._id || idx} incident={incident} />
              ))}
            </div>
          )}
        </section>
      </div>

      <footer className="w-full border-t border-zinc-900/80 bg-black/40 backdrop-blur-md z-20 mt-auto">
        <div className="max-w-4xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-zinc-300">Twichify</span>
            <span>— © 2026 Tous droits réservés.</span>
          </div>

          <div className="flex items-center gap-4 font-medium">
            <Link href="/" className="hover:text-purple-400 transition-colors">Accueil</Link>
            <Link href="/help" className="hover:text-purple-400 transition-colors">Aide</Link>
            <Link href="/privacy" className="hover:text-purple-400 transition-colors">Confidentialité & CGU</Link>
            <Link href="/mentions-legales" className="hover:text-purple-400 transition-colors">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
