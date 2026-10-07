"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Download,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  FileJson,
  RotateCcw,
  Music,
  Ticket,
  Lightbulb,
  CalendarCheck,
  Link2,
  Link2Off,
  MessageSquare,
  X,
  ExternalLink,
  LogOut,
  RefreshCcw,
  ShieldAlert,
  Copy,
  Check,
  RotateCw,
  Monitor,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardUI";
import { useToast, ToastDisplay } from "@/components/dashboard/useToast";
import { ROLE_LABELS } from "@/lib/roles";
import { describeUserAgent } from "@/lib/user-agent";

const CONFIRM_WORD = "SUPPRIMER";

interface Summary {
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  acceptedTermsAt: string | null;
  spotifyConnected: boolean;
  tickets: number;
  ideas: number;
  upvoted: number;
  downvoted: number;
  listening: {
    totalMs: number;
    totalTracks: number;
    lastTrack: { title: string; artist: string } | null;
  };
}

interface SessionRow {
  id: string;
  isCurrent: boolean;
  expires: string;
  userAgent: string | null;
  lastSeenAt: string | null;
}

interface DiagnosticCheck {
  id: string;
  label: string;
  status: "ok" | "warning" | "error";
  detail: string;
}

function formatDuration(ms: number) {
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${m.toString().padStart(2, "0")}`;
}

function formatLastSeen(iso: string | null) {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 5) return "Active à l'instant";
  if (diffMin < 60) return `Active il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Active il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  return `Active il y a ${diffD} j`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  tone = "zinc",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "emerald" | "purple" | "sky" | "amber" | "zinc";
}) {
  const toneMap = {
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    purple: "border-purple-500/20 bg-purple-500/10 text-purple-300",
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    zinc: "border-zinc-800 bg-zinc-950/70 text-zinc-400",
  };

  return (
    <div className="group rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4 transition-colors duration-200 hover:border-zinc-700">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105 ${toneMap[tone]}`}>
        {icon}
      </div>
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-lg font-black text-white">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-zinc-500">{sub}</p>}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4">
          <div className="mb-3 h-9 w-9 rounded-xl bg-zinc-800/60" />
          <div className="h-2.5 w-16 rounded bg-zinc-800/60" />
          <div className="mt-2 h-5 w-20 rounded bg-zinc-800/60" />
        </div>
      ))}
    </div>
  );
}

const ROLE_TONE: Record<string, string> = {
  creator: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  co_creator: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  admin: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  moderator: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  helper: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  user: "border-purple-500/30 bg-purple-500/10 text-purple-300",
};

const ROLE_GLOW: Record<string, string> = {
  creator: "from-amber-500/70 to-orange-600/40",
  co_creator: "from-amber-500/70 to-orange-600/40",
  admin: "from-rose-500/70 to-red-600/40",
  moderator: "from-sky-500/70 to-blue-600/40",
  helper: "from-sky-500/70 to-blue-600/40",
  user: "from-purple-500/70 to-indigo-600/40",
};

/** Verrouille le scroll du fond, ferme sur Échap, et rend le focus au bouton donné à l'ouverture. */
function useModalBehavior(open: boolean, onClose: () => void, focusRef: React.RefObject<HTMLButtonElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => focusRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

export default function DashboardAccount() {
  const { data: session } = useSession();
  const { toast, showToast } = useToast();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [exporting, setExporting] = useState(false);
  const [resettingStats, setResettingStats] = useState(false);
  const [resettingWidgets, setResettingWidgets] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [showResetWidgetsModal, setShowResetWidgetsModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  const [diagChecks, setDiagChecks] = useState<DiagnosticCheck[] | null>(null);
  const [runningDiag, setRunningDiag] = useState(false);
  const [diagRanAt, setDiagRanAt] = useState<string | null>(null);

  const deleteConfirmRef = useRef<HTMLButtonElement>(null);
  const deleteCancelRef = useRef<HTMLButtonElement>(null);
  const resetConfirmRef = useRef<HTMLButtonElement>(null);

  const loadSummary = () => {
    setLoadingSummary(true);
    setLoadError(false);
    fetch("/api/user/data-summary")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => setSummary(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoadingSummary(false));
  };

  useEffect(() => {
    if (!session) return;
    loadSummary();
    fetch("/api/user/sessions")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setSessions(data.sessions))
      .catch(() => {})
      .finally(() => setLoadingSessions(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);


  useModalBehavior(showDeleteModal, () => !deleting && setShowDeleteModal(false), deleteCancelRef);
  useModalBehavior(showResetWidgetsModal, () => !resettingWidgets && setShowResetWidgetsModal(false), resetConfirmRef);

  const handleCopyId = async () => {
    const id = (session?.user as any)?.id;
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (e) {
      showToast("Impossible de copier l'identifiant.", "error");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/user/export");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `twichify-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      showToast("Export téléchargé !");
    } catch (error) {
      console.error("Erreur export:", error);
      showToast("Impossible de générer l'export.", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleResetStats = async () => {
    setResettingStats(true);
    try {
      const res = await fetch("/api/user/listening-stats", { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setSummary((prev) =>
        prev ? { ...prev, listening: { totalMs: 0, totalTracks: 0, lastTrack: null } } : prev
      );
      showToast("Statistiques d'écoute réinitialisées.");
    } catch (error) {
      console.error("Erreur réinitialisation stats:", error);
      showToast("La réinitialisation a échoué.", "error");
    } finally {
      setResettingStats(false);
    }
  };

  const handleResetWidgets = async () => {
    setResettingWidgets(true);
    try {
      const res = await fetch("/api/user/reset-widgets", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setShowResetWidgetsModal(false);
      showToast("Réglages des widgets réinitialisés.");
    } catch (error) {
      console.error("Erreur réinitialisation widgets:", error);
      showToast("La réinitialisation a échoué.", "error");
    } finally {
      setResettingWidgets(false);
    }
  };

  const handleRevokeSessions = async () => {
    setRevokingSessions(true);
    try {
      const res = await fetch("/api/user/sessions/revoke-others", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      showToast(
        data.revoked > 0
          ? `Déconnecté de ${data.revoked} autre${data.revoked > 1 ? "s" : ""} appareil${data.revoked > 1 ? "s" : ""}.`
          : "Aucune autre session active."
      );
      // On retire localement toutes les sessions autres que la nôtre, sans re-fetcher
      setSessions((prev) => (prev ? prev.filter((s) => s.isCurrent) : prev));
    } catch (error) {
      console.error("Erreur révocation sessions:", error);
      showToast("L'opération a échoué.", "error");
    } finally {
      setRevokingSessions(false);
    }
  };

  const handleRevokeOneSession = async (id: string) => {
    setRevokingSessionId(id);
    try {
      const res = await fetch(`/api/user/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSessions((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
      showToast("Session déconnectée.");
    } catch (error) {
      console.error("Erreur révocation session:", error);
      showToast("L'opération a échoué.", "error");
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRunDiagnostics = async () => {
    setRunningDiag(true);
    try {
      const res = await fetch("/api/user/diagnostics", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDiagChecks(data.checks);
      setDiagRanAt(data.ranAt);
    } catch (error) {
      console.error("Erreur diagnostic:", error);
      showToast("Le diagnostic a échoué. Réessaie.", "error");
    } finally {
      setRunningDiag(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText.trim() !== CONFIRM_WORD) return;
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: CONFIRM_WORD }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Le compte et les sessions n'existent plus : on nettoie le cookie et on retourne à l'accueil
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Erreur suppression:", error);
      showToast("La suppression a échoué. Réessaie ou contacte le support.", "error");
      setDeleting(false);
    }
  };

  if (!session) return null;

  const canDelete = confirmText.trim() === CONFIRM_WORD && !deleting;
  const avatarFallback = (summary?.name || session.user?.name || "?").charAt(0).toUpperCase();

  return (
    <div className="relative space-y-8">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 top-0 -z-10 h-[320px] w-[700px] -translate-x-1/2 rounded-full bg-purple-600/10 blur-[130px]"
      />
      <style>{`
        @keyframes acc-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .acc-fade { animation: acc-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) { .acc-fade { animation: none; } }
      `}</style>

      <PageHeader eyebrow="Vie privée" title="Compte & données" />

      {/* IDENTITÉ */}
      <section className="acc-fade flex flex-col items-start gap-5 rounded-[28px] border border-zinc-800/80 bg-zinc-950/40 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {summary?.image || session.user?.image ? (
            <div className={`relative shrink-0 rounded-2xl bg-gradient-to-br p-[2px] ${ROLE_GLOW[summary?.role || "user"] || ROLE_GLOW.user}`}>
              <img
                src={summary?.image || session.user?.image || ""}
                alt=""
                className="h-[52px] w-[52px] rounded-[14px] border border-zinc-950 object-cover"
              />
            </div>
          ) : (
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br p-[2px] ${ROLE_GLOW[summary?.role || "user"] || ROLE_GLOW.user}`}>
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-zinc-950 text-lg font-black text-zinc-300">
                {avatarFallback}
              </div>
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-white">{summary?.name || session.user?.name || "—"}</p>
            <p className="truncate text-xs text-zinc-500">{summary?.email || session.user?.email || "—"}</p>
            {(session.user as any)?.id && (
              <button
                onClick={handleCopyId}
                className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-zinc-600 transition hover:text-zinc-400"
                title="Copier mon identifiant (utile pour un ticket de support)"
              >
                {copiedId ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                {copiedId ? "Copié" : "Copier mon ID"}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${ROLE_TONE[summary?.role || "user"] || ROLE_TONE.user}`}>
            {ROLE_LABELS[summary?.role || "user"] || "Utilisateur"}
          </span>
          {summary && (
            <>
              <span
                title={summary.spotifyConnected ? undefined : "Connecte Spotify pour que ce widget affiche ta musique."}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                  summary.spotifyConnected
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-500"
                }`}
              >
                <Music size={11} /> {summary.spotifyConnected ? "Widget musique actif" : "Widget musique inactif"}
              </span>
              <span
                title={summary.name ? undefined : "Aucun pseudo Twitch associé : reconnecte-toi via Twitch."}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                  summary.name
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-500"
                }`}
              >
                <MessageSquare size={11} /> {summary.name ? "Widget chat actif" : "Widget chat inactif"}
              </span>
            </>
          )}
        </div>
      </section>

      {/* RÉSUMÉ */}
      <section className="acc-fade space-y-4" style={{ animationDelay: "60ms" }}>
        <h2 className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-zinc-500">
          Ce que Twichify conserve sur toi
        </h2>

        {loadingSummary ? (
          <SummarySkeleton />
        ) : loadError ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">Impossible de charger ce résumé pour le moment.</p>
            <button
              onClick={loadSummary}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-[11px] font-bold text-zinc-300 transition hover:bg-zinc-800"
            >
              <RotateCw size={12} /> Réessayer
            </button>
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryCard
              icon={<Link2 size={15} />}
              label="Spotify"
              value={summary.spotifyConnected ? "Connecté" : "Non connecté"}
              tone={summary.spotifyConnected ? "emerald" : "zinc"}
            />
            <SummaryCard
              icon={<Music size={15} />}
              label="Écoute cumulée"
              value={formatDuration(summary.listening.totalMs)}
              tone="purple"
              sub={
                summary.listening.lastTrack
                  ? `${summary.listening.totalTracks} morceau${summary.listening.totalTracks > 1 ? "x" : ""} · ${summary.listening.lastTrack.title} — ${summary.listening.lastTrack.artist}`
                  : `${summary.listening.totalTracks} morceau${summary.listening.totalTracks > 1 ? "x" : ""} suivi${summary.listening.totalTracks > 1 ? "s" : ""}`
              }
            />
            <SummaryCard
              icon={<Ticket size={15} />}
              label="Tickets de support"
              value={String(summary.tickets)}
              tone="sky"
            />
            <SummaryCard
              icon={<Lightbulb size={15} />}
              label="Idées publiées"
              value={String(summary.ideas)}
              tone="amber"
              sub={`${summary.upvoted + summary.downvoted} vote${summary.upvoted + summary.downvoted > 1 ? "s" : ""} donné${summary.upvoted + summary.downvoted > 1 ? "s" : ""}`}
            />
            <SummaryCard
              icon={<CalendarCheck size={15} />}
              label="CGU acceptées"
              value={formatDate(summary.acceptedTermsAt)}
            />
            <div className="group flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4 transition-colors duration-200 hover:border-zinc-700">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/70 text-zinc-400 transition-transform duration-200 group-hover:scale-105">
                <RotateCcw size={15} />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Stats d'écoute</p>
                <button
                  onClick={handleResetStats}
                  disabled={resettingStats || summary.listening.totalTracks === 0}
                  className="mt-1.5 text-[13px] font-bold text-purple-400 transition hover:text-purple-300 disabled:cursor-not-allowed disabled:text-zinc-600"
                >
                  {resettingStats ? "Réinitialisation..." : "Réinitialiser"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">Résumé indisponible pour le moment.</p>
        )}
      </section>

      {/* SÉCURITÉ & RÉGLAGES */}
      <section className="acc-fade space-y-4" style={{ animationDelay: "120ms" }}>
        <h2 className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-zinc-500">Sécurité & réglages</h2>

        {/* Sessions actives */}
        <div className="rounded-[28px] border border-zinc-800/80 bg-zinc-950/40 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-300">
                <Monitor size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Sessions actives</h3>
                <p className="text-xs text-zinc-500">Les appareils actuellement connectés à ton compte.</p>
              </div>
            </div>
            {sessions && sessions.filter((s) => !s.isCurrent).length > 0 && (
              <button
                onClick={handleRevokeSessions}
                disabled={revokingSessions}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
              >
                <LogOut size={12} />
                {revokingSessions ? "Déconnexion..." : "Déconnecter les autres"}
              </button>
            )}
          </div>

          {loadingSessions ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-zinc-900/60" />
              ))}
            </div>
          ) : sessions && sessions.length > 0 ? (
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-xs ${
                    s.isCurrent ? "border-emerald-500/20 bg-emerald-500/5" : "border-zinc-800/80 bg-zinc-900/30"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Monitor size={14} className={s.isCurrent ? "text-emerald-400" : "text-zinc-500"} />
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-200">
                        {describeUserAgent(s.userAgent)}
                        {s.isCurrent && <span className="ml-1.5 font-normal text-zinc-500">(cet appareil)</span>}
                      </p>
                      <p className="truncate text-[10px] text-zinc-500">
                        {formatLastSeen(s.lastSeenAt) ??
                          `Expire le ${new Date(s.expires).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`}
                      </p>
                    </div>
                  </div>

                  {s.isCurrent ? (
                    <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                      Actuelle
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRevokeOneSession(s.id)}
                      disabled={revokingSessionId === s.id}
                      className="shrink-0 text-[10px] font-bold text-zinc-500 transition hover:text-rose-400 disabled:opacity-50"
                    >
                      {revokingSessionId === s.id ? "..." : "Déconnecter"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-500">Aucune session active trouvée.</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col justify-between gap-4 rounded-[28px] border border-zinc-800/80 bg-zinc-950/40 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300">
              <RefreshCcw size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Réglages des widgets</h3>
              <p className="text-xs text-zinc-500">Remet musique, chat et bot à leurs valeurs par défaut.</p>
            </div>
          </div>
          <button
            onClick={() => setShowResetWidgetsModal(true)}
            className="self-start rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-amber-300 transition hover:bg-amber-500/20"
          >
            Réinitialiser
          </button>
        </div>

        {/* Diagnostic de configuration */}
        <div className="flex flex-col gap-4 rounded-[28px] border border-zinc-800/80 bg-zinc-950/40 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
              <Activity size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Diagnostic de configuration</h3>
              <p className="text-xs text-zinc-500">Vérifie Twitch, Spotify et tes widgets en direct.</p>
            </div>
          </div>

          {!diagChecks ? (
            <button
              onClick={handleRunDiagnostics}
              disabled={runningDiag}
              className="self-start rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {runningDiag ? "Vérification..." : "Lancer le diagnostic"}
            </button>
          ) : (
            <div className="space-y-3">
              <ul className="space-y-1.5">
                {diagChecks.map((c) => {
                  const Icon = c.status === "ok" ? CheckCircle2 : c.status === "warning" ? AlertCircle : XCircle;
                  const color =
                    c.status === "ok" ? "text-emerald-400" : c.status === "warning" ? "text-amber-400" : "text-rose-400";
                  return (
                    <li key={c.id} className="flex items-start gap-2 text-xs">
                      <Icon size={14} className={`mt-0.5 shrink-0 ${color}`} />
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-200">{c.label}</p>
                        <p className="text-[11px] leading-snug text-zinc-500">{c.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between gap-3 border-t border-zinc-800/80 pt-3">
                <p className="text-[10px] text-zinc-600">
                  {diagRanAt &&
                    `Vérifié à ${new Date(diagRanAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
                </p>
                <button
                  onClick={handleRunDiagnostics}
                  disabled={runningDiag}
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 transition hover:text-emerald-400 disabled:opacity-50"
                >
                  <RotateCw size={11} className={runningDiag ? "animate-spin" : ""} />
                  {runningDiag ? "Vérification..." : "Relancer"}
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </section>

      <div className="acc-fade grid grid-cols-1 xl:grid-cols-2 gap-8 items-start" style={{ animationDelay: "180ms" }}>
        {/* EXPORT */}
        <section className="rounded-[32px] border border-zinc-800 bg-zinc-950/60 p-8 shadow-2xl shadow-black/30 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-300">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400">Droit d'accès</p>
              <h2 className="text-xl font-black tracking-tight text-white">Exporter mes données</h2>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-zinc-400">
            Télécharge une copie de tout ce que Twichify conserve sur toi, dans un fichier JSON lisible et réutilisable.
          </p>

          <ul className="space-y-2 text-xs text-zinc-400">
            {[
              "Ton profil Twitch : pseudo, email, avatar, rôle, date d'acceptation des CGU",
              "Les réglages de tes widgets (musique, chat, bot, canvas)",
              "Tes statistiques d'écoute",
              "L'état de ton suivi des départs de followers (décomptes et dates uniquement, jamais la liste de tes followers)",
              "L'état de tes statistiques de chat (activation, nombre de sessions), sans les classements de chatteurs",
              "Tes tickets de support et leurs messages",
              "Tes idées et le nombre de votes que tu as donnés",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <FileJson size={14} className="mt-0.5 shrink-0 text-purple-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <p className="rounded-2xl border border-zinc-800 bg-black/30 p-4 text-[11px] leading-relaxed text-zinc-500">
            Les secrets ne sont jamais exportés : ton Client Secret Spotify, ton refresh token et tes jetons Twitch restent chiffrés côté serveur et ne quittent pas la base.
          </p>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-[11px] font-black uppercase tracking-[0.25em] text-white transition hover:brightness-110 disabled:opacity-60"
          >
            <Download size={16} />
            {exporting ? "Génération..." : "Télécharger mes données"}
          </button>

          <p className="text-center text-[10px] text-zinc-600">
            Consulte aussi notre{" "}
            <Link href="/privacy" className="text-zinc-400 underline hover:text-purple-400">
              politique de confidentialité
            </Link>
            .
          </p>
        </section>

        {/* SUPPRESSION */}
        <section className="rounded-[32px] border border-rose-500/30 bg-rose-950/10 p-8 shadow-2xl shadow-black/30 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300">
              <Trash2 size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-rose-400">Droit à l'effacement</p>
              <h2 className="text-xl font-black tracking-tight text-white">Supprimer mon compte</h2>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs leading-relaxed text-rose-200">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-400" />
            <span>Cette action est immédiate et définitive. Elle ne peut pas être annulée.</span>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-zinc-400">
            <p className="font-bold uppercase tracking-[0.15em] text-zinc-500">Ce qui est supprimé</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Ton compte, ta connexion Twitch (jeton révoqué) et toutes tes sessions</li>
              <li>Tes clés et jetons Spotify, tes réglages de widgets et tes statistiques d'écoute</li>
              <li>Ton suivi des départs de followers (liste enregistrée et historique), si tu l'avais activé</li>
              <li>Tes statistiques de chat (sessions enregistrées), si tu les avais activées</li>
              <li>Tes tickets de support</li>
            </ul>
            <p className="pt-2 font-bold uppercase tracking-[0.15em] text-zinc-500">Ce qui est conservé</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Tes idées de la boîte à idées, anonymisées (« Utilisateur supprimé »), sans tes votes</li>
            </ul>
            <p className="pt-2 flex items-start gap-2.5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-3">
              <Link2Off size={14} className="mt-0.5 shrink-0 text-zinc-500" />
              <span className="text-[11px] leading-relaxed text-zinc-500">
                Pense aussi à retirer l'accès de ton application Spotify si tu ne l'utilises plus, sur{" "}
                <a
                  href="https://www.spotify.com/account/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-zinc-300 underline decoration-zinc-700 underline-offset-2 hover:text-rose-300"
                >
                  spotify.com/account/apps
                  <ExternalLink size={10} />
                </a>
                .
              </span>
            </p>
          </div>

          <div className="space-y-3 border-t border-rose-500/20 pt-6">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Tape <span className="font-mono text-rose-300">{CONFIRM_WORD}</span> pour confirmer
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950/80 p-4 font-mono text-xs tracking-widest text-white outline-none placeholder-zinc-700 focus:border-rose-500/60"
            />
            <button
              onClick={handleDelete}
              disabled={!canDelete}
              className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-rose-600 px-6 py-4 text-[11px] font-black uppercase tracking-[0.25em] text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 size={16} />
              Supprimer définitivement mon compte
            </button>
          </div>
        </section>
      </div>

      <ToastDisplay toast={toast} />

      {/* MODALE DE CONFIRMATION FINALE */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-[28px] border border-rose-500/30 bg-zinc-950 p-7 shadow-2xl shadow-rose-950/30"
          >
            <button
              onClick={() => !deleting && setShowDeleteModal(false)}
              aria-label="Annuler"
              className="absolute top-5 right-5 text-zinc-500 transition hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
              <AlertTriangle size={22} />
            </div>

            <h2 id="delete-modal-title" className="text-lg font-black text-white">
              Dernière confirmation
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              Ton compte, tes widgets, tes statistiques et tes tickets vont être supprimés définitivement. Cette action est irréversible.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                ref={deleteCancelRef}
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-900/80 py-3 text-[11px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                ref={deleteConfirmRef}
                onClick={confirmDelete}
                disabled={deleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-rose-500 disabled:opacity-60"
              >
                {deleting ? "Suppression..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE RÉINITIALISATION DES WIDGETS */}
      {showResetWidgetsModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => !resettingWidgets && setShowResetWidgetsModal(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-widgets-title"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-[28px] border border-amber-500/30 bg-zinc-950 p-7 shadow-2xl shadow-amber-950/20"
          >
            <button
              onClick={() => !resettingWidgets && setShowResetWidgetsModal(false)}
              aria-label="Annuler"
              className="absolute top-5 right-5 text-zinc-500 transition hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <ShieldAlert size={22} />
            </div>

            <h2 id="reset-widgets-title" className="text-lg font-black text-white">
              Réinitialiser les widgets ?
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              Les couleurs, la mise en page, les filtres du chat et le message du bot reviennent à leurs valeurs par défaut. Tes statistiques d'écoute et ton compte ne sont pas touchés.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowResetWidgetsModal(false)}
                disabled={resettingWidgets}
                className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-900/80 py-3 text-[11px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                ref={resetConfirmRef}
                onClick={handleResetWidgets}
                disabled={resettingWidgets}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-[11px] font-black uppercase tracking-widest text-black transition hover:bg-amber-400 disabled:opacity-60"
              >
                {resettingWidgets ? "Réinitialisation..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
