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
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    purple: "border-purple-500/25 bg-purple-500/10 text-purple-300",
    sky: "border-sky-500/25 bg-sky-500/10 text-sky-300",
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-300",
    zinc: "border-white/10 bg-white/[0.04] text-zinc-400",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg border ${toneMap[tone]}`}>
        {icon}
      </div>
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-white">{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-white/5 bg-white/[0.02] p-4">
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
  // Tant que le rôle n'est pas connu : anneau neutre et badge de chargement (pas de rôle "Utilisateur" affiché par défaut à un admin).
  const roleGlow = summary ? ROLE_GLOW[summary.role] || ROLE_GLOW.user : "from-zinc-700/70 to-zinc-800/40";

  return (
    <div className="relative space-y-8">
      <style>{`
        @keyframes acc-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .acc-fade { animation: acc-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) { .acc-fade { animation: none; } }
      `}</style>

      <PageHeader eyebrow="Vie privée" title="Compte & données" />

      {/* IDENTITÉ */}
      <section className="acc-fade flex flex-col items-start gap-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {summary?.image || session.user?.image ? (
            <div className={`relative shrink-0 rounded-2xl bg-gradient-to-br p-[2px] ${roleGlow}`}>
              <img
                src={summary?.image || session.user?.image || ""}
                alt=""
                className="h-[52px] w-[52px] rounded-[14px] border border-zinc-950 object-cover"
              />
            </div>
          ) : (
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br p-[2px] ${roleGlow}`}>
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-zinc-950 text-lg font-black text-zinc-300">
                {avatarFallback}
              </div>
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-white">{summary?.name || session.user?.name || "—"}</p>
            <p className="truncate text-sm text-zinc-400">{summary?.email || session.user?.email || "—"}</p>
            {(session.user as any)?.id && (
              <button
                onClick={handleCopyId}
                className="mt-1 inline-flex cursor-pointer items-center gap-1 rounded text-xs font-medium text-zinc-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
                title="Copier mon identifiant (utile pour un ticket de support)"
              >
                {copiedId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copiedId ? "Copié" : "Copier mon ID"}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {summary ? (
            <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${ROLE_TONE[summary.role] || ROLE_TONE.user}`}>
              {ROLE_LABELS[summary.role] || "Utilisateur"}
            </span>
          ) : loadingSummary ? (
            <span className="twichify-skeleton h-7 w-24 rounded-full" />
          ) : null}
          {summary && (
            <>
              <span
                title={summary.spotifyConnected ? undefined : "Connecte Spotify pour que ce widget affiche ta musique."}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  summary.spotifyConnected
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-white/10 text-zinc-400"
                }`}
              >
                <Music size={11} /> {summary.spotifyConnected ? "Widget musique actif" : "Widget musique inactif"}
              </span>
              <span
                title={summary.name ? undefined : "Aucun pseudo Twitch associé : reconnecte-toi via Twitch."}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  summary.name
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-white/10 text-zinc-400"
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
        <h2 className="font-display text-lg font-bold tracking-tight text-white">
          Ce que Twichify conserve sur toi
        </h2>

        {loadingSummary ? (
          <SummarySkeleton />
        ) : loadError ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-400">Impossible de charger ce résumé pour le moment.</p>
            <button
              onClick={loadSummary}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
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
            <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-400">
                <RotateCcw size={15} />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Stats d'écoute</p>
                <button
                  onClick={handleResetStats}
                  disabled={resettingStats || summary.listening.totalTracks === 0}
                  className="mt-1 cursor-pointer rounded text-base font-semibold text-purple-300 transition-colors hover:text-purple-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 disabled:cursor-not-allowed disabled:text-zinc-500"
                >
                  {resettingStats ? "Réinitialisation..." : "Réinitialiser"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">Résumé indisponible pour le moment.</p>
        )}
      </section>

      {/* SÉCURITÉ & RÉGLAGES */}
      <section className="acc-fade space-y-4" style={{ animationDelay: "120ms" }}>
        <h2 className="font-display text-lg font-bold tracking-tight text-white">Sécurité & réglages</h2>

        {/* Sessions actives */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sky-500/25 bg-sky-500/10 text-sky-300">
                <Monitor size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Sessions actives</h3>
                <p className="text-sm text-zinc-400">Les appareils actuellement connectés à ton compte.</p>
              </div>
            </div>
            {sessions && sessions.filter((s) => !s.isCurrent).length > 0 && (
              <button
                onClick={handleRevokeSessions}
                disabled={revokingSessions}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 transition-colors hover:bg-sky-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:opacity-50"
              >
                <LogOut size={13} />
                {revokingSessions ? "Déconnexion..." : "Déconnecter les autres"}
              </button>
            )}
          </div>

          {loadingSessions ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />
              ))}
            </div>
          ) : sessions && sessions.length > 0 ? (
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 text-sm ${
                    s.isCurrent ? "border-emerald-500/25 bg-emerald-500/[0.06]" : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Monitor size={15} className={s.isCurrent ? "text-emerald-400" : "text-zinc-500"} />
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-200">
                        {describeUserAgent(s.userAgent)}
                        {s.isCurrent && <span className="ml-1.5 font-normal text-zinc-400">(cet appareil)</span>}
                      </p>
                      <p className="truncate text-xs text-zinc-400">
                        {formatLastSeen(s.lastSeenAt) ??
                          `Expire le ${new Date(s.expires).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`}
                      </p>
                    </div>
                  </div>

                  {s.isCurrent ? (
                    <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-200">
                      Actuelle
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRevokeOneSession(s.id)}
                      disabled={revokingSessionId === s.id}
                      className="shrink-0 cursor-pointer rounded px-2 py-1 text-sm font-medium text-zinc-400 transition-colors hover:text-rose-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:opacity-50"
                    >
                      {revokingSessionId === s.id ? "..." : "Déconnecter"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-400">Aucune session active trouvée.</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10 text-amber-300">
              <RefreshCcw size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Réglages des widgets</h3>
              <p className="text-sm text-zinc-400">Remet musique, chat et bot à leurs valeurs par défaut.</p>
            </div>
          </div>
          <button
            onClick={() => setShowResetWidgetsModal(true)}
            className="cursor-pointer self-start rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            Réinitialiser
          </button>
        </div>

        {/* Diagnostic de configuration */}
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
              <Activity size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Diagnostic de configuration</h3>
              <p className="text-sm text-zinc-400">Vérifie Twitch, Spotify et tes widgets en direct.</p>
            </div>
          </div>

          {!diagChecks ? (
            <button
              onClick={handleRunDiagnostics}
              disabled={runningDiag}
              className="cursor-pointer self-start rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:opacity-50"
            >
              {runningDiag ? "Vérification..." : "Lancer le diagnostic"}
            </button>
          ) : (
            <div className="space-y-3">
              <ul className="space-y-2">
                {diagChecks.map((c) => {
                  const Icon = c.status === "ok" ? CheckCircle2 : c.status === "warning" ? AlertCircle : XCircle;
                  const color =
                    c.status === "ok" ? "text-emerald-400" : c.status === "warning" ? "text-amber-400" : "text-rose-400";
                  return (
                    <li key={c.id} className="flex items-start gap-2 text-sm">
                      <Icon size={15} className={`mt-0.5 shrink-0 ${color}`} />
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-200">{c.label}</p>
                        <p className="text-sm leading-snug text-zinc-400">{c.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                <p className="text-xs text-zinc-400">
                  {diagRanAt &&
                    `Vérifié à ${new Date(diagRanAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
                </p>
                <button
                  onClick={handleRunDiagnostics}
                  disabled={runningDiag}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded text-sm font-medium text-zinc-300 transition-colors hover:text-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:opacity-50"
                >
                  <RotateCw size={13} className={runningDiag ? "animate-spin" : ""} />
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
        <section className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-purple-500/25 bg-purple-500/10 text-purple-300">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Droit d'accès</p>
              <h2 className="font-display text-xl font-bold tracking-tight text-white">Exporter mes données</h2>
            </div>
          </div>

          <p className="text-base leading-relaxed text-zinc-400">
            Télécharge une copie de tout ce que Twichify conserve sur toi, dans un fichier JSON lisible et réutilisable.
          </p>

          <ul className="space-y-2.5 text-sm text-zinc-300">
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

          <p className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm leading-relaxed text-zinc-400">
            Les secrets ne sont jamais exportés : ton Client Secret Spotify, ton refresh token et tes jetons Twitch restent chiffrés côté serveur et ne quittent pas la base.
          </p>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 disabled:opacity-60"
          >
            <Download size={16} />
            {exporting ? "Génération..." : "Télécharger mes données"}
          </button>

          <p className="text-center text-sm text-zinc-400">
            Consulte aussi notre{" "}
            <Link href="/privacy" className="text-zinc-200 underline underline-offset-4 hover:text-purple-300">
              politique de confidentialité
            </Link>
            .
          </p>
        </section>

        {/* SUPPRESSION */}
        <section className="space-y-6 rounded-2xl border border-rose-500/30 bg-rose-500/[0.04] p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300">
              <Trash2 size={22} />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Droit à l'effacement</p>
              <h2 className="font-display text-xl font-bold tracking-tight text-white">Supprimer mon compte</h2>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/[0.08] p-4 text-sm leading-relaxed text-rose-100">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-300" />
            <span>Cette action est immédiate et définitive. Elle ne peut pas être annulée.</span>
          </div>

          <div className="space-y-3 text-sm leading-relaxed text-zinc-400">
            <p className="font-semibold text-zinc-200">Ce qui est supprimé</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Ton compte, ta connexion Twitch (jeton révoqué) et toutes tes sessions</li>
              <li>Tes clés et jetons Spotify, tes réglages de widgets et tes statistiques d'écoute</li>
              <li>Ton suivi des départs de followers (liste enregistrée et historique), si tu l'avais activé</li>
              <li>Tes statistiques de chat (sessions enregistrées), si tu les avais activées</li>
              <li>Tes tickets de support</li>
            </ul>
            <p className="pt-2 font-semibold text-zinc-200">Ce qui est conservé</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Tes idées de la boîte à idées, anonymisées (« Utilisateur supprimé »), sans tes votes</li>
            </ul>
            <p className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 pt-3">
              <Link2Off size={14} className="mt-0.5 shrink-0 text-zinc-500" />
              <span className="text-sm leading-relaxed text-zinc-400">
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
            <label htmlFor="delete-confirm" className="text-sm font-medium text-zinc-200">
              Tape <span className="font-mono text-rose-300">{CONFIRM_WORD}</span> pour confirmer
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-white/15 bg-white/[0.02] p-4 font-mono text-sm tracking-widest text-white outline-none placeholder-zinc-600 transition-colors focus:border-rose-500/60"
            />
            <button
              onClick={handleDelete}
              disabled={!canDelete}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-rose-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
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
            className="relative w-full max-w-sm rounded-2xl border border-rose-500/30 bg-zinc-950 p-7 shadow-2xl shadow-black/50"
          >
            <button
              onClick={() => !deleting && setShowDeleteModal(false)}
              aria-label="Annuler"
              className="absolute top-4 right-4 cursor-pointer rounded-lg p-2 text-zinc-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
            >
              <X size={18} />
            </button>

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
              <AlertTriangle size={22} />
            </div>

            <h2 id="delete-modal-title" className="font-display text-xl font-bold text-white">
              Dernière confirmation
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Ton compte, tes widgets, tes statistiques et tes tickets vont être supprimés définitivement. Cette action est irréversible.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                ref={deleteCancelRef}
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 cursor-pointer rounded-xl border border-white/15 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                ref={deleteConfirmRef}
                onClick={confirmDelete}
                disabled={deleting}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:opacity-60"
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
            className="relative w-full max-w-sm rounded-2xl border border-amber-500/30 bg-zinc-950 p-7 shadow-2xl shadow-black/50"
          >
            <button
              onClick={() => !resettingWidgets && setShowResetWidgetsModal(false)}
              aria-label="Annuler"
              className="absolute top-4 right-4 cursor-pointer rounded-lg p-2 text-zinc-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
            >
              <X size={18} />
            </button>

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <ShieldAlert size={22} />
            </div>

            <h2 id="reset-widgets-title" className="font-display text-xl font-bold text-white">
              Réinitialiser les widgets ?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Les couleurs, la mise en page, les filtres du chat et le message du bot reviennent à leurs valeurs par défaut. Tes statistiques d'écoute et ton compte ne sont pas touchés.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowResetWidgetsModal(false)}
                disabled={resettingWidgets}
                className="flex-1 cursor-pointer rounded-xl border border-white/15 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                ref={resetConfirmRef}
                onClick={handleResetWidgets}
                disabled={resettingWidgets}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-black transition-colors hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:opacity-60"
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
