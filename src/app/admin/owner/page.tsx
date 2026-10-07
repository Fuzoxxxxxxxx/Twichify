"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Crown, Users, Music, UserPlus, LifeBuoy, Megaphone, Activity, KeyRound, ScrollText, ShieldCheck,
  Check, Minus, Loader2, CircleCheck, CircleX, TriangleAlert, Save, RefreshCw, LayoutDashboard, Trash2,
  Wrench, Sparkles, Siren, CalendarClock, PowerOff,
} from "lucide-react";
import {
  ALL_ROLES, ROLE_LABELS, ROLE_PERMISSIONS, PERMISSION_LABELS, PERMISSIONS, getRoleLevel, type Permission,
} from "@/lib/roles";
import { BannerBar, type BannerLevel } from "@/components/SiteBanner";

/* ───────────── Types ───────────── */

type ServiceStatus = "operational" | "degraded" | "down";

type Overview = {
  users: { total: number; byRole: Record<string, number>; spotifyConnected: number; newLast7Days: number };
  staff: { _id: string; name: string; image: string | null; role: string }[];
  tickets: Record<string, number>;
  ideas: Record<string, number>;
  faqCount: number;
  services: { name: string; status: ServiceStatus; latencyMs: number | null; checkedAt: string }[];
  env: { name: string; required: boolean; ok: boolean; note: string }[];
  runtime: { node: string; environment: string };
};

type AuditEntry = {
  _id: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetName: string | null;
  details: string;
  createdAt: string;
};

type EndMode = "never" | "1h" | "6h" | "24h" | "7d" | "custom";

// Ce que stockent l'API et la base (dates en ISO).
type BannerServer = {
  enabled: boolean;
  message: string;
  level: BannerLevel;
  startsAt: string | null;
  expiresAt: string | null;
};

// Ce que manipule le formulaire (dates au format des champs datetime-local).
type BannerForm = {
  enabled: boolean;
  message: string;
  level: BannerLevel;
  startMode: "now" | "scheduled";
  startLocal: string;
  endMode: EndMode;
  endLocal: string;
};

const DEFAULT_FORM: BannerForm = {
  enabled: false,
  message: "",
  level: "info",
  startMode: "now",
  startLocal: "",
  endMode: "never",
  endLocal: "",
};

const END_PRESETS: Record<Exclude<EndMode, "never" | "custom">, number> = {
  "1h": 3_600_000,
  "6h": 6 * 3_600_000,
  "24h": 24 * 3_600_000,
  "7d": 7 * 24 * 3_600_000,
};

const END_OPTIONS: { value: EndMode; label: string }[] = [
  { value: "never", label: "Jamais (jusqu'à retrait manuel)" },
  { value: "1h", label: "Après 1 heure" },
  { value: "6h", label: "Après 6 heures" },
  { value: "24h", label: "Après 24 heures" },
  { value: "7d", label: "Après 7 jours" },
  { value: "custom", label: "À une date précise" },
];

type BannerState = "off" | "scheduled" | "live" | "expired";

const STATE_PILLS: Record<BannerState, { label: string; cls: string }> = {
  live: { label: "En ligne", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  scheduled: { label: "Programmée", cls: "border-sky-500/30 bg-sky-500/10 text-sky-300" },
  expired: { label: "Expirée", cls: "border-zinc-600/40 bg-zinc-500/10 text-zinc-400" },
  off: { label: "Désactivée", cls: "border-zinc-600/40 bg-zinc-500/10 text-zinc-400" },
};

// Valeur d'un <input type="datetime-local"> (heure locale) à partir d'une date ISO.
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fromServer(b: BannerServer): BannerForm {
  return {
    enabled: b.enabled,
    message: b.message,
    level: b.level,
    startMode: b.startsAt ? "scheduled" : "now",
    startLocal: b.startsAt ? toLocalInput(b.startsAt) : "",
    endMode: b.expiresAt ? "custom" : "never",
    endLocal: b.expiresAt ? toLocalInput(b.expiresAt) : "",
  };
}

// Ignore les champs de date inutilisés pour comparer deux formulaires.
const normalizeForm = (f: BannerForm) => ({
  ...f,
  startLocal: f.startMode === "scheduled" ? f.startLocal : "",
  endLocal: f.endMode === "custom" ? f.endLocal : "",
});

// Convertit le formulaire en données à envoyer (avec validation côté client ; l'API revalide).
function buildPayload(form: BannerForm): { payload: BannerServer } | { error: string } {
  const message = form.message.trim();
  if (form.enabled && !message) return { error: "Écris un message avant d'activer l'annonce." };

  const nowMs = Date.now();

  let startsAt: string | null = null;
  if (form.startMode === "scheduled") {
    const t = new Date(form.startLocal).getTime();
    if (!form.startLocal || Number.isNaN(t)) return { error: "Choisis une date de début valide." };
    startsAt = new Date(t).toISOString();
  }
  const baseMs = startsAt ? new Date(startsAt).getTime() : nowMs;

  let expiresAt: string | null = null;
  if (form.endMode === "custom") {
    const t = new Date(form.endLocal).getTime();
    if (!form.endLocal || Number.isNaN(t)) return { error: "Choisis une date de fin valide." };
    expiresAt = new Date(t).toISOString();
  } else if (form.endMode !== "never") {
    // Les durées se comptent à partir du début (ou de maintenant si l'annonce est publiée tout de suite).
    expiresAt = new Date(baseMs + END_PRESETS[form.endMode]).toISOString();
  }

  if (form.enabled && expiresAt && new Date(expiresAt).getTime() <= Math.max(nowMs, baseMs)) {
    return { error: "La fin doit être postérieure au début et à maintenant." };
  }

  return { payload: { enabled: form.enabled, message, level: form.level, startsAt, expiresAt } };
}

// État réel de l'annonce enregistrée, recalculé avec l'heure courante.
function bannerState(b: BannerServer | null, now: number): BannerState {
  if (!b || !b.enabled || !b.message) return "off";
  if (b.expiresAt && now >= new Date(b.expiresAt).getTime()) return "expired";
  if (b.startsAt && now < new Date(b.startsAt).getTime()) return "scheduled";
  return "live";
}

/* ───────────── Constantes ───────────── */

const MAX_MESSAGE = 200;

const TABS = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "banner", label: "Annonce", icon: Megaphone },
  { id: "team", label: "Équipe", icon: ShieldCheck },
  { id: "audit", label: "Audit", icon: ScrollText },
] as const;
type TabId = (typeof TABS)[number]["id"];

const LEVEL_OPTIONS: { value: BannerLevel; label: string; active: string }[] = [
  { value: "info", label: "Info", active: "border-indigo-500/60 bg-indigo-500/15 text-indigo-200" },
  { value: "warning", label: "Avertissement", active: "border-amber-500/60 bg-amber-500/15 text-amber-200" },
  { value: "critical", label: "Critique", active: "border-rose-500/60 bg-rose-500/15 text-rose-200" },
];

const PRESETS: { label: string; icon: typeof Wrench; level: BannerLevel; message: string }[] = [
  {
    label: "Maintenance",
    icon: Wrench,
    level: "warning",
    message: "Maintenance prévue ce soir : les widgets peuvent être indisponibles quelques minutes.",
  },
  {
    label: "Incident",
    icon: Siren,
    level: "critical",
    message: "Incident en cours : nous travaillons à rétablir le service. Suivez l'avancement sur la page Statut.",
  },
  {
    label: "Nouveauté",
    icon: Sparkles,
    level: "info",
    message: "Nouveau : découvrez les dernières nouveautés dans le changelog !",
  },
];

const ROLE_STYLES: Record<string, { dot: string; badge: string }> = {
  creator: { dot: "bg-amber-400", badge: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
  co_creator: { dot: "bg-orange-400", badge: "border-orange-500/30 bg-orange-500/10 text-orange-300" },
  admin: { dot: "bg-rose-400", badge: "border-rose-500/30 bg-rose-500/10 text-rose-300" },
  moderator: { dot: "bg-purple-400", badge: "border-purple-500/30 bg-purple-500/10 text-purple-300" },
  helper: { dot: "bg-sky-400", badge: "border-sky-500/30 bg-sky-500/10 text-sky-300" },
  user: { dot: "bg-zinc-500", badge: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300" },
};
const roleStyle = (role: string) => ROLE_STYLES[role] ?? ROLE_STYLES.user;

const TICKET_ROWS = [
  { key: "en_attente", label: "En attente", bar: "bg-amber-400" },
  { key: "en_cours", label: "En cours", bar: "bg-sky-400" },
  { key: "resolu", label: "Résolus", bar: "bg-emerald-400" },
  { key: "ferme", label: "Fermés", bar: "bg-zinc-500" },
];

const IDEA_ROWS = [
  { key: "en_etude", label: "En étude", bar: "bg-amber-400" },
  { key: "planifie", label: "Planifiées", bar: "bg-indigo-400" },
  { key: "en_cours", label: "En cours", bar: "bg-sky-400" },
  { key: "termine", label: "Terminées", bar: "bg-emerald-400" },
  { key: "rejete", label: "Rejetées", bar: "bg-rose-400" },
];

const AUDIT_META: Record<string, { label: string; icon: typeof Megaphone; cls: string }> = {
  "banner.update": { label: "Annonce modifiée", icon: Megaphone, cls: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" },
  "role.change": { label: "Rôle modifié", icon: KeyRound, cls: "bg-purple-500/10 text-purple-300 border-purple-500/20" },
  "user.delete": { label: "Compte supprimé", icon: Trash2, cls: "bg-rose-500/10 text-rose-300 border-rose-500/20" },
};

const AUDIT_FILTERS = [
  { id: "all", label: "Tout" },
  { id: "role.change", label: "Rôles" },
  { id: "user.delete", label: "Suppressions" },
  { id: "banner.update", label: "Annonces" },
];

const SERVICE_STYLES: Record<ServiceStatus, { label: string; cls: string }> = {
  operational: { label: "Opérationnel", cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" },
  degraded: { label: "Dégradé", cls: "bg-amber-500/10 border-amber-500/30 text-amber-300" },
  down: { label: "Hors ligne", cls: "bg-rose-500/10 border-rose-500/30 text-rose-300" },
};

/* ───────────── Utilitaires ───────────── */

const fmtDate = (d: string) =>
  new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

function timeAgo(iso: string, now: number): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return d < 30 ? `il y a ${d} j` : fmtDate(iso);
}

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

/* ───────────── Petits composants ───────────── */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-white/5 bg-zinc-950/60 p-6 backdrop-blur-xl ${className}`}>
      {children}
    </section>
  );
}

function SectionTitle({
  icon: Icon, title, subtitle, right,
}: { icon: typeof Crown; title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-300">
          <Icon size={17} />
        </span>
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-[0.15em] text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, hint, accent = "text-purple-400",
}: { icon: typeof Users; label: string; value: number; hint?: string; accent?: string }) {
  return (
    <div className="group rounded-2xl border border-white/5 bg-zinc-950/60 p-5 backdrop-blur-xl transition-colors hover:border-white/10">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
        <Icon size={13} className={accent} />
        {label}
      </div>
      <p className="text-3xl font-black tracking-tight text-white">{value.toLocaleString("fr-FR")}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function Breakdown({ items }: { items: { label: string; value: number; bar: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-zinc-400">{i.label}</span>
            <span className="font-bold text-zinc-200">{i.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <div className={`h-full rounded-full transition-all duration-700 ${i.bar}`} style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${roleStyle(role).badge}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Chargement">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-white/5" />
        <div className="space-y-2">
          <div className="h-5 w-56 rounded bg-white/5" />
          <div className="h-3 w-40 rounded bg-white/5" />
        </div>
      </div>
      <div className="h-11 w-full max-w-md rounded-2xl bg-white/5" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-white/5" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-56 rounded-3xl bg-white/5" />
        <div className="h-56 rounded-3xl bg-white/5" />
      </div>
    </div>
  );
}

/* ───────────── Page ───────────── */

export default function OwnerPage() {
  const [tab, setTab] = useState<TabId>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditFilter, setAuditFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [banner, setBanner] = useState<BannerForm>(DEFAULT_FORM);
  const [savedBanner, setSavedBanner] = useState<BannerServer | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async (initial = false) => {
    setRefreshing(true);
    try {
      const [ov, au, settings] = await Promise.all([
        fetchJson("/api/admin/owner/overview"),
        fetchJson("/api/admin/owner/audit"),
        initial ? fetchJson("/api/admin/owner/settings") : Promise.resolve(null),
      ]);
      setOverview(ov);
      setAudit(au.entries || []);
      if (settings) {
        setBanner(fromServer(settings.banner));
        setSavedBanner(settings.banner);
      }
      setRefreshFailed(false);
      setError(null);
      setUpdatedAt(Date.now());
    } catch {
      if (initial) setError("Impossible de charger l'espace propriétaire.");
      else setRefreshFailed(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  // Met à jour les « il y a X min » sans recharger.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Onglet mémorisé dans l'URL (#annonce…) pour pouvoir partager/rouvrir le bon onglet.
  useEffect(() => {
    const fromHash = window.location.hash.replace("#", "") as TabId;
    if (TABS.some((t) => t.id === fromHash)) setTab(fromHash);
  }, []);

  const selectTab = (id: TabId) => {
    setTab(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  const dirty =
    !!savedBanner &&
    JSON.stringify(normalizeForm(banner)) !== JSON.stringify(normalizeForm(fromServer(savedBanner)));

  const liveState = bannerState(savedBanner, now);
  const stateHint =
    !savedBanner ? null
    : liveState === "live" && savedBanner.expiresAt ? `Fin automatique : ${fmtDate(savedBanner.expiresAt)}`
    : liveState === "scheduled" && savedBanner.startsAt ? `Débute le ${fmtDate(savedBanner.startsAt)}`
    : liveState === "expired" ? "Terminée automatiquement"
    : null;

  const sendBanner = async (payload: BannerServer, successText: string) => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/owner/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'enregistrement");

      setSavedBanner(payload);
      setBanner(fromServer(payload));
      setFeedback({ ok: true, text: successText });
      // Met à jour le bandeau de cet onglet tout de suite ; les autres visiteurs le reçoivent en quelques secondes.
      window.dispatchEvent(new Event("site-banner-updated"));
      load();
    } catch (e) {
      setFeedback({ ok: false, text: e instanceof Error ? e.message : "Erreur inconnue" });
    } finally {
      setSaving(false);
    }
  };

  const saveBanner = () => {
    const result = buildPayload(banner);
    if ("error" in result) {
      setFeedback({ ok: false, text: result.error });
      return;
    }
    const { payload } = result;
    sendBanner(
      payload,
      !payload.enabled
        ? "Annonce désactivée."
        : payload.startsAt
          ? "Annonce programmée."
          : "Annonce publiée : elle s'affiche chez les visiteurs en quelques secondes, sans rechargement."
    );
  };

  // Retire l'annonce en cours sans toucher au reste du formulaire.
  const removeBanner = () => {
    if (!savedBanner) return;
    sendBanner({ ...savedBanner, enabled: false }, "Annonce retirée.");
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => { setError(null); load(true); }}
          className="mt-4 rounded-xl border border-rose-500/40 px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-rose-500/10 cursor-pointer"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!overview) return <Skeleton />;

  /* Données dérivées */
  const staff = [...overview.staff].sort((a, b) => getRoleLevel(b.role) - getRoleLevel(a.role));
  const permissions = Object.keys(PERMISSION_LABELS) as Permission[];
  const matrixRoles = ALL_ROLES.filter((r) => r !== "user");
  const rolesByLevel = [...ALL_ROLES].sort((a, b) => getRoleLevel(b) - getRoleLevel(a));

  const envOk = overview.env.filter((v) => v.ok).length;
  const envMissing = overview.env.filter((v) => !v.ok && v.required);
  const servicesIssues = overview.services.filter((s) => s.status !== "operational");
  const alerts: { tone: "rose" | "amber"; text: string }[] = [];
  if (envMissing.length > 0) {
    alerts.push({ tone: "rose", text: `Configuration incomplète : ${envMissing.map((v) => v.name).join(", ")}.` });
  }
  if (servicesIssues.length > 0) {
    alerts.push({
      tone: "amber",
      text: `Service perturbé : ${servicesIssues.map((s) => `${s.name} (${SERVICE_STYLES[s.status]?.label ?? s.status})`).join(", ")}.`,
    });
  }

  const filteredAudit = auditFilter === "all" ? audit : audit.filter((e) => e.action === auditFilter);
  const roleTotal = Math.max(1, overview.users.total);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-lg shadow-amber-500/20">
            <Crown size={22} />
          </span>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400">Administration</p>
            <h1 className="text-2xl font-black tracking-tight text-white">Propriétaire</h1>
            <p className="text-xs text-zinc-500">Réservé au Créateur et aux Co-créateurs.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {refreshFailed && <span className="text-xs text-rose-400">Actualisation impossible</span>}
          {updatedAt && !refreshFailed && (
            <span className="text-[11px] text-zinc-600">
              Mis à jour {new Date(updatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            type="button"
            onClick={() => load()}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-bold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Actualiser
          </button>
        </div>
      </header>

      {/* Onglets */}
      <div role="tablist" aria-label="Sections" className="flex w-fit max-w-full gap-1.5 overflow-x-auto rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-1.5 backdrop-blur-xl">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              id={`tab-${id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${id}`}
              onClick={() => selectTab(id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${
                active
                  ? "border-purple-500/50 bg-purple-600/20 text-purple-300"
                  : "border-transparent text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              <Icon size={13} />
              {label}
              {id === "audit" && audit.length > 0 && (
                <span className="rounded-full bg-white/10 px-1.5 text-[9px] font-black text-zinc-300">{audit.length}</span>
              )}
              {id === "banner" && bannerState(savedBanner, now) === "live" && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-label="Annonce en ligne" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── VUE D'ENSEMBLE ── */}
      {tab === "overview" && (
        <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" className="space-y-6">
          {alerts.map((a) => (
            <div
              key={a.text}
              role="alert"
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
                a.tone === "rose"
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-200"
              }`}
            >
              <TriangleAlert size={16} className="mt-0.5 shrink-0" />
              {a.text}
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={Users} label="Utilisateurs" value={overview.users.total} />
            <StatCard
              icon={Music}
              label="Spotify connecté"
              value={overview.users.spotifyConnected}
              hint={overview.users.total > 0 ? `${Math.round((overview.users.spotifyConnected / overview.users.total) * 100)} % des comptes` : undefined}
            />
            <StatCard icon={UserPlus} label="Nouveaux (7 j)" value={overview.users.newLast7Days} accent="text-emerald-400" />
            <StatCard icon={LifeBuoy} label="Tickets en attente" value={overview.tickets["en_attente"] || 0} accent="text-amber-400" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <SectionTitle icon={Users} title="Répartition des rôles" subtitle={`${overview.users.total} comptes au total`} />
              <div className="mb-5 flex h-3 overflow-hidden rounded-full bg-white/5" role="img" aria-label="Répartition des rôles">
                {rolesByLevel.map((r) => {
                  const count = overview.users.byRole[r] || 0;
                  return count > 0 ? (
                    <div key={r} className={`${roleStyle(r).dot} h-full`} style={{ width: `${(count / roleTotal) * 100}%` }} title={`${ROLE_LABELS[r]} : ${count}`} />
                  ) : null;
                })}
              </div>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                {rolesByLevel.map((r) => (
                  <li key={r} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-zinc-400">
                      <span className={`h-2 w-2 rounded-full ${roleStyle(r).dot}`} />
                      {ROLE_LABELS[r]}
                    </span>
                    <span className="font-bold text-zinc-200">{overview.users.byRole[r] || 0}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <SectionTitle icon={Activity} title="Activité" subtitle={`${overview.faqCount} article${overview.faqCount > 1 ? "s" : ""} dans la FAQ`} />
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Tickets</p>
                  <Breakdown items={TICKET_ROWS.map((r) => ({ label: r.label, bar: r.bar, value: overview.tickets[r.key] || 0 }))} />
                </div>
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Idées</p>
                  <Breakdown items={IDEA_ROWS.map((r) => ({ label: r.label, bar: r.bar, value: overview.ideas[r.key] || 0 }))} />
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <SectionTitle icon={Activity} title="Services externes" subtitle="Dernière vérification du cron de statut." />
              {overview.services.length === 0 ? (
                <p className="text-sm text-zinc-500">Aucune vérification récente (le cron n'a pas tourné ces dernières 24 h).</p>
              ) : (
                <ul className="space-y-2">
                  {overview.services.map((s) => (
                    <li key={s.name} className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-black/30 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">{s.name}</p>
                        <p className="text-[11px] text-zinc-600">
                          {timeAgo(s.checkedAt, now)}
                          {s.latencyMs !== null && ` · ${s.latencyMs} ms`}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${SERVICE_STYLES[s.status]?.cls}`}>
                        {SERVICE_STYLES[s.status]?.label ?? s.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <SectionTitle
                icon={KeyRound}
                title="Configuration"
                subtitle={`Node ${overview.runtime.node} · ${overview.runtime.environment}`}
                right={
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${
                    envMissing.length === 0
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  }`}>
                    {envOk}/{overview.env.length}
                  </span>
                }
              />
              <ul className="space-y-2">
                {overview.env.map((v) => (
                  <li key={v.name} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/30 px-4 py-2.5">
                    {v.ok ? (
                      <CircleCheck size={16} className="shrink-0 text-emerald-400" />
                    ) : v.required ? (
                      <CircleX size={16} className="shrink-0 text-rose-400" />
                    ) : (
                      <TriangleAlert size={16} className="shrink-0 text-amber-400" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs text-zinc-200">{v.name}</p>
                      <p className="truncate text-[11px] text-zinc-600">{v.note}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      {v.ok ? "OK" : v.required ? "Manquante" : "Optionnelle"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}

      {/* ── ANNONCE ── */}
      {tab === "banner" && (
        <div id="panel-banner" role="tabpanel" aria-labelledby="tab-banner" className="space-y-6">
          <Card>
            <SectionTitle
              icon={Megaphone}
              title="Annonce globale"
              subtitle="Bandeau affiché en haut de tout le site (hors overlays OBS)."
              right={
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${STATE_PILLS[liveState].cls}`}>
                    {STATE_PILLS[liveState].label}
                  </span>
                  {stateHint && <span className="text-[11px] text-zinc-600">{stateHint}</span>}
                </div>
              }
            />

            <div className="space-y-5">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Modèles rapides</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map(({ label, icon: Icon, level, message }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setBanner({ ...banner, level, message })}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white cursor-pointer"
                    >
                      <Icon size={13} className="text-zinc-400" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/30 px-4 py-3">
                <span className="text-sm font-semibold text-zinc-200">Afficher l'annonce</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={banner.enabled}
                  aria-label="Afficher l'annonce"
                  onClick={() => setBanner({ ...banner, enabled: !banner.enabled })}
                  className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${banner.enabled ? "bg-purple-600" : "bg-zinc-700"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${banner.enabled ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Niveau de l'annonce">
                {LEVEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={banner.level === opt.value}
                    onClick={() => setBanner({ ...banner, level: opt.value })}
                    className={`rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      banner.level === opt.value ? opt.active : "border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                  <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    <CalendarClock size={13} className="text-purple-400" /> Début
                  </p>
                  <div className="flex gap-2" role="radiogroup" aria-label="Début de l'annonce">
                    {(["now", "scheduled"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        role="radio"
                        aria-checked={banner.startMode === m}
                        onClick={() => setBanner({ ...banner, startMode: m })}
                        className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                          banner.startMode === m
                            ? "border-purple-500/50 bg-purple-600/20 text-purple-200"
                            : "border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300"
                        }`}
                      >
                        {m === "now" ? "Immédiat" : "Programmé"}
                      </button>
                    ))}
                  </div>
                  {banner.startMode === "scheduled" && (
                    <input
                      type="datetime-local"
                      value={banner.startLocal}
                      onChange={(e) => setBanner({ ...banner, startLocal: e.target.value })}
                      aria-label="Date de début"
                      className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50 [color-scheme:dark]"
                    />
                  )}
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                  <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    <PowerOff size={13} className="text-purple-400" /> Fin automatique
                  </p>
                  <select
                    value={banner.endMode}
                    onChange={(e) => setBanner({ ...banner, endMode: e.target.value as EndMode })}
                    aria-label="Fin automatique"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50 [color-scheme:dark]"
                  >
                    {END_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {banner.endMode === "custom" && (
                    <input
                      type="datetime-local"
                      value={banner.endLocal}
                      onChange={(e) => setBanner({ ...banner, endLocal: e.target.value })}
                      aria-label="Date de fin"
                      className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50 [color-scheme:dark]"
                    />
                  )}
                  {banner.endMode !== "never" && banner.endMode !== "custom" && (
                    <p className="mt-2 text-[11px] text-zinc-600">
                      Comptée {banner.startMode === "scheduled" ? "à partir du début" : "à partir de la publication"}.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <textarea
                  value={banner.message}
                  onChange={(e) => setBanner({ ...banner, message: e.target.value.slice(0, MAX_MESSAGE) })}
                  rows={3}
                  aria-label="Message de l'annonce"
                  placeholder="Écris ton message ou choisis un modèle rapide…"
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-purple-500/50"
                />
                <p className={`mt-1 text-right text-[11px] ${banner.message.length >= MAX_MESSAGE ? "text-amber-400" : "text-zinc-600"}`}>
                  {banner.message.length}/{MAX_MESSAGE}
                </p>
              </div>

              {banner.enabled && !banner.message.trim() && (
                <p className="flex items-center gap-2 text-xs text-amber-400">
                  <TriangleAlert size={14} /> Écris un message avant d'activer l'annonce.
                </p>
              )}

              {banner.message.trim() && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Aperçu</p>
                  <div className="overflow-hidden rounded-2xl border border-white/5">
                    <BannerBar message={banner.message.trim()} level={banner.level} />
                  </div>
                  {banner.level === "critical" && (
                    <p className="mt-2 text-[11px] text-zinc-600">Une annonce critique ne peut pas être fermée par les visiteurs.</p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={saveBanner}
                  disabled={saving || !dirty}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Enregistrer
                </button>
                {(liveState === "live" || liveState === "scheduled") && (
                  <button
                    type="button"
                    onClick={removeBanner}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-2xl border border-rose-500/30 px-5 py-3 text-sm font-bold text-rose-300 transition-colors hover:bg-rose-500/10 disabled:opacity-40 cursor-pointer"
                  >
                    <PowerOff size={16} />
                    Retirer
                  </button>
                )}
                {dirty && !saving && <span className="text-xs text-amber-400">Modifications non enregistrées</span>}
                {feedback && !dirty && (
                  <span className={`text-xs font-medium ${feedback.ok ? "text-emerald-400" : "text-rose-400"}`}>{feedback.text}</span>
                )}
                {feedback && !feedback.ok && dirty && <span className="text-xs font-medium text-rose-400">{feedback.text}</span>}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── ÉQUIPE ── */}
      {tab === "team" && (
        <div id="panel-team" role="tabpanel" aria-labelledby="tab-team" className="space-y-6">
          <Card>
            <SectionTitle icon={ShieldCheck} title="Membres du staff" subtitle={`${staff.length} membre${staff.length > 1 ? "s" : ""} avec un rôle staff`} />
            {staff.length === 0 ? (
              <p className="text-sm text-zinc-500">Aucun membre du staff.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {staff.map((m) => (
                  <div key={m._id} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/30 p-3">
                    {m.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.image} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-200">
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-100">{m.name}</p>
                      <RoleBadge role={m.role} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-[11px] text-zinc-600">Les rôles se modifient depuis l'onglet « Utilisateurs » du panneau admin.</p>
          </Card>

          <Card>
            <SectionTitle icon={KeyRound} title="Matrice des permissions" subtitle="Modifiable dans src/lib/roles.ts (ROLE_PERMISSIONS)." />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-zinc-500">
                    <th className="sticky left-0 bg-zinc-950 py-2 pr-4 font-bold">Permission</th>
                    {matrixRoles.map((r) => (
                      <th key={r} className="px-2 py-2 text-center font-bold">
                        {ROLE_LABELS[r]}
                        <span className="block font-medium normal-case text-zinc-600">
                          {overview.users.byRole[r] || 0} membre{(overview.users.byRole[r] || 0) > 1 ? "s" : ""}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((p) => (
                    <tr key={p} className={`border-b border-white/5 last:border-0 ${p === PERMISSIONS.OWNER_ZONE ? "bg-amber-500/5" : ""}`}>
                      <td className="sticky left-0 bg-zinc-950 py-2.5 pr-4 text-zinc-300">
                        {PERMISSION_LABELS[p]}
                        {p === PERMISSIONS.OWNER_ZONE && <Crown size={11} className="ml-1.5 inline text-amber-400" />}
                      </td>
                      {matrixRoles.map((r) => (
                        <td key={r} className="px-2 py-2.5 text-center">
                          {ROLE_PERMISSIONS[r].includes(p) ? (
                            <Check size={15} className="mx-auto text-emerald-400" aria-label="Autorisé" />
                          ) : (
                            <Minus size={15} className="mx-auto text-zinc-700" aria-label="Refusé" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── AUDIT ── */}
      {tab === "audit" && (
        <div id="panel-audit" role="tabpanel" aria-labelledby="tab-audit">
          <Card>
            <SectionTitle
              icon={ScrollText}
              title="Journal d'audit"
              subtitle="50 dernières actions sensibles · conservées 180 jours."
            />

            <div className="mb-4 flex flex-wrap gap-2">
              {AUDIT_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAuditFilter(f.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    auditFilter === f.id
                      ? "border-purple-500/50 bg-purple-600/20 text-purple-200"
                      : "border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filteredAudit.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500">
                {audit.length === 0 ? "Aucune action enregistrée pour le moment." : "Aucune action dans cette catégorie."}
              </p>
            ) : (
              <ul className="divide-y divide-white/5">
                {filteredAudit.map((e) => {
                  const meta = AUDIT_META[e.action];
                  const Icon = meta?.icon ?? ScrollText;
                  return (
                    <li key={e._id} className="flex items-start gap-3 py-3.5">
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${meta?.cls ?? "border-white/10 bg-white/5 text-zinc-300"}`}>
                        <Icon size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-200">
                          <span className="font-semibold text-white">{e.actorName}</span>{" "}
                          <RoleBadge role={e.actorRole} />
                          <span className="text-zinc-500"> · {meta?.label ?? e.action}</span>
                          {e.targetName && <span className="text-zinc-300"> · {e.targetName}</span>}
                        </p>
                        {e.details && <p className="mt-0.5 break-words text-xs text-zinc-500">{e.details}</p>}
                      </div>
                      <time className="shrink-0 text-[11px] text-zinc-600" dateTime={e.createdAt} title={fmtDate(e.createdAt)}>
                        {timeAgo(e.createdAt, now)}
                      </time>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
