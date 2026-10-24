"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Lightbulb,
  ChevronUp,
  ChevronDown,
  Plus,
  X,
  Loader2,
  Flame,
  Clock,
  MessageSquareQuote,
  ShieldCheck,
  Save,
  Check,
  Sparkles,
  LifeBuoy,
  Rocket,
  Palette,
  Search,
  TrendingUp,
  CheckCircle2,
  Vote,
  MessageCircle,
  Trash2,
  Send,
} from "lucide-react";
import IdeaStatusBadge from "@/components/IdeaStatusBadge";
import PublicShell from "@/components/site/PublicShell";
import PageIntro from "@/components/site/PageIntro";
import Pagination, { usePagination } from "@/components/Pagination";
import { useDialog } from "@/components/DialogProvider";
import { COMMENT_MAX, COMMENTS_SHOWN } from "@/lib/idea-comments";
import { hasPermission, PERMISSIONS } from "@/lib/roles";

interface Idea {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  authorId: string;
  authorName: string;
  upvotes: string[];
  downvotes: string[];
  score: number;
  officialResponse?: { content: string | null; updatedAt: string | null } | null;
  commentCount?: number;
  createdAt: string;
}

interface PublicComment {
  id: string;
  authorName: string;
  isStaff: boolean;
  content: string;
  createdAt: string;
  mine: boolean;
  canDelete: boolean;
}

const CATEGORY_META: Record<string, { label: string; icon: any; text: string; bg: string; border: string; accent: string }> = {
  general: { label: "Général", icon: Sparkles, text: "text-zinc-300", bg: "bg-zinc-800/60", border: "border-zinc-700/60", accent: "bg-zinc-500" },
  support: { label: "Support", icon: LifeBuoy, text: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/30", accent: "bg-blue-400" },
  feature: { label: "Fonctionnalité", icon: Rocket, text: "text-purple-300", bg: "bg-purple-500/10", border: "border-purple-500/30", accent: "bg-purple-400" },
  ui_ux: { label: "UI / UX", icon: Palette, text: "text-pink-300", bg: "bg-pink-500/10", border: "border-pink-500/30", accent: "bg-pink-400" },
};

const STATUS_FILTERS = [
  { id: "tous", label: "Tous" },
  { id: "en_etude", label: "À l'étude" },
  { id: "planifie", label: "Planifié" },
  { id: "en_cours", label: "En cours" },
  { id: "termine", label: "Terminé" },
  { id: "rejete", label: "Rejeté" },
];

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

// Nombre d'idées affichées par page.
const PAGE_SIZE = 10;

export default function IdeasPage() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id as string | undefined;

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"popular" | "recent">("popular");
  const [statusFilter, setStatusFilter] = useState("tous");
  const [categoryFilter, setCategoryFilter] = useState("tous");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "general" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [myRole, setMyRole] = useState<string>("user");
  const canManageIdeas = hasPermission(myRole, PERMISSIONS.MANAGE_IDEAS);

  useEffect(() => {
    if (!session) return;
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => setMyRole(data.role || "user"))
      .catch(() => {});
  }, [session]);

  const fetchIdeas = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ sort });
    if (statusFilter !== "tous") params.set("status", statusFilter);
    if (categoryFilter !== "tous") params.set("category", categoryFilter);

    fetch(`/api/ideas?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setIdeas(data.ideas || []))
      .catch(() => setIdeas([]))
      .finally(() => setLoading(false));
  }, [sort, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const visibleIdeas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ideas;
    return ideas.filter(
      (i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
    );
  }, [ideas, search]);

  const listRef = useRef<HTMLDivElement>(null);
  const { page, setPage, pageCount, pageItems, offset } = usePagination(
    visibleIdeas,
    PAGE_SIZE,
    `${sort}|${statusFilter}|${categoryFilter}|${search}`
  );

  const stats = useMemo(() => {
    const totalVotes = ideas.reduce((sum, i) => sum + i.upvotes.length + i.downvotes.length, 0);
    const enCours = ideas.filter((i) => i.status === "en_cours").length;
    const termine = ideas.filter((i) => i.status === "termine").length;
    return { total: ideas.length, totalVotes, enCours, termine };
  }, [ideas]);

  const handleSubmitIdea = async () => {
    if (!form.title.trim() || !form.description.trim() || submitting) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setForm({ title: "", description: "", category: "general" });
        setShowForm(false);
        fetchIdeas();
      } else {
        setFormError(data.error || "Erreur lors de la soumission.");
      }
    } catch (e) {
      setFormError("Erreur lors de la soumission.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (ideaId: string, type: "up" | "down") => {
    if (!session) return;
    try {
      const res = await fetch(`/api/ideas/${ideaId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) return;
      const data = await res.json();

      setIdeas((prev) =>
        prev.map((idea) => {
          if (idea._id !== ideaId) return idea;
          const upvotes = idea.upvotes.filter((u) => u !== currentUserId);
          const downvotes = idea.downvotes.filter((u) => u !== currentUserId);
          if (data.myVote === "up" && currentUserId) upvotes.push(currentUserId);
          if (data.myVote === "down" && currentUserId) downvotes.push(currentUserId);
          return { ...idea, upvotes, downvotes, score: data.score };
        })
      );
    } catch (e) {
      console.error("Erreur vote:", e);
    }
  };

  const handleStatusSave = async (ideaId: string, status: string, officialResponse: string) => {
    const res = await fetch(`/api/ideas/${ideaId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, officialResponse }),
    });
    if (res.ok) {
      const data = await res.json();
      setIdeas((prev) => prev.map((idea) => (idea._id === ideaId ? { ...idea, ...data.idea, score: idea.score } : idea)));
    }
    return res.ok;
  };

  return (
    <PublicShell width="max-w-5xl">
      <style jsx global>{`
        @keyframes ideaFloatIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .idea-float-in { animation: ideaFloatIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @media (prefers-reduced-motion: reduce) { .idea-float-in { animation: none; } }
      `}</style>

      <PageIntro
        title="Proposez, votez, suivez."
        action={
          session ? (
            <button
              onClick={() => setShowForm((v) => !v)}
              aria-expanded={showForm}
              className={`flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500 ${FOCUS}`}
            >
              {showForm ? <X size={16} /> : <Plus size={16} />}
              {showForm ? "Annuler" : "Proposer une idée"}
            </button>
          ) : (
            <Link
              href="/login"
              className={`flex shrink-0 items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:text-white ${FOCUS}`}
            >
              Se connecter pour proposer
            </Link>
          )
        }
      >
        Vos idées façonnent Twichify. Proposez une fonctionnalité et votez pour celles que vous voulez voir arriver en
        priorité.
      </PageIntro>

      <dl className="mb-8 grid grid-cols-2 gap-6 border-b border-white/10 py-8 sm:grid-cols-4">
        {[
          { label: "Idées", value: stats.total, color: "text-white" },
          { label: "Votes", value: stats.totalVotes, color: "text-emerald-400" },
          { label: "En cours", value: stats.enCours, color: "text-blue-400" },
          { label: "Terminées", value: stats.termine, color: "text-purple-300" },
        ].map((item) => (
          <div key={item.label}>
            <dd className={`font-display text-3xl font-extrabold tabular-nums ${item.color}`}>{item.value}</dd>
            <dt className="mt-1 text-sm text-zinc-400">{item.label}</dt>
          </div>
        ))}
      </dl>

          {/* FORMULAIRE DE SOUMISSION */}
          {showForm && session && (
            <div className="mb-6 space-y-5 rounded-2xl border border-purple-500/30 bg-white/[0.02] p-5 sm:p-6 idea-float-in">
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-200">Catégorie</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CATEGORY_META).map(([id, meta]) => {
                    const CatIcon = meta.icon;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, category: id }))}
                        aria-pressed={form.category === id}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${FOCUS} ${
                          form.category === id
                            ? `${meta.border} ${meta.bg} ${meta.text}`
                            : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <CatIcon size={12} />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="idea-title" className="text-sm font-medium text-zinc-200">Titre</label>
                <input
                  id="idea-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Résumez votre idée en une phrase..."
                  maxLength={150}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="idea-description" className="text-sm font-medium text-zinc-200">Description</label>
                <textarea
                  id="idea-description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Expliquez votre idée, pourquoi elle serait utile..."
                  rows={4}
                  maxLength={2000}
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
                />
              </div>

              {formError && <p role="alert" className="text-sm font-medium text-red-400">{formError}</p>}

              <button
                onClick={handleSubmitIdea}
                disabled={submitting || !form.title.trim() || !form.description.trim()}
                className={`flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-50 ${FOCUS}`}
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                <span>Soumettre l'idée</span>
              </button>
            </div>
          )}

          {/* BARRE DE RECHERCHE, TRI ET FILTRES */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher une idée..."
                  aria-label="Rechercher une idée"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.02] py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
                />
              </div>

              <div role="group" aria-label="Trier les idées" className="flex shrink-0 items-center rounded-lg border border-white/10 p-1">
                <button
                  onClick={() => setSort("popular")}
                  aria-pressed={sort === "popular"}
                  className={`flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${FOCUS} ${
                    sort === "popular" ? "bg-white/[0.08] text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Flame size={14} />
                  Populaires
                </button>
                <button
                  onClick={() => setSort("recent")}
                  aria-pressed={sort === "recent"}
                  className={`flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${FOCUS} ${
                    sort === "recent" ? "bg-white/[0.08] text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Clock size={14} />
                  Récentes
                </button>
              </div>
            </div>

            <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap items-center gap-2">
              {STATUS_FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setStatusFilter(id)}
                  aria-pressed={statusFilter === id}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${FOCUS} ${
                    statusFilter === id
                      ? "border-purple-500/50 bg-purple-500/15 text-purple-200"
                      : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div role="group" aria-label="Filtrer par catégorie" className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCategoryFilter("tous")}
                aria-pressed={categoryFilter === "tous"}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${FOCUS} ${
                  categoryFilter === "tous"
                    ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-200"
                    : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                }`}
              >
                Toutes catégories
              </button>
              {Object.entries(CATEGORY_META).map(([id, meta]) => {
                const CatIcon = meta.icon;
                return (
                  <button
                    key={id}
                    onClick={() => setCategoryFilter(id)}
                    aria-pressed={categoryFilter === id}
                    className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${FOCUS} ${
                      categoryFilter === id
                        ? `${meta.border} ${meta.bg} ${meta.text}`
                        : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <CatIcon size={13} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* LISTE DES IDÉES */}
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center" aria-busy="true">
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin mx-auto mb-2" />
              <p className="text-zinc-400 text-sm">Chargement des idées...</p>
            </div>
          ) : visibleIdeas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-16 text-center">
              <Lightbulb size={28} className="mx-auto text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-300">Aucune idée pour ces filtres.</p>
            </div>
          ) : (
            <div ref={listRef} className="space-y-3 scroll-mt-24">
              {pageItems.map((idea, i) => (
                <div key={idea._id} className="idea-float-in" style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}>
                  <IdeaCard
                    idea={idea}
                    rank={sort === "popular" ? offset + i + 1 : null}
                    currentUserId={currentUserId}
                    isLoggedIn={!!session}
                    canManageIdeas={canManageIdeas}
                    onVote={handleVote}
                    onStatusSave={handleStatusSave}
                  />
                </div>
              ))}
            </div>
          )}

          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} scrollToRef={listRef} className="mt-8" />
    </PublicShell>
  );
}

function IdeaCard({
  idea,
  rank,
  currentUserId,
  isLoggedIn,
  canManageIdeas,
  onVote,
  onStatusSave,
}: {
  idea: Idea;
  rank: number | null;
  currentUserId?: string;
  isLoggedIn: boolean;
  canManageIdeas: boolean;
  onVote: (ideaId: string, type: "up" | "down") => void;
  onStatusSave: (ideaId: string, status: string, officialResponse: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [statusDraft, setStatusDraft] = useState(idea.status);
  const [responseDraft, setResponseDraft] = useState(idea.officialResponse?.content || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const meta = CATEGORY_META[idea.category] || CATEGORY_META.general;
  const CatIcon = meta.icon;

  const myVote = currentUserId
    ? idea.upvotes.includes(currentUserId)
      ? "up"
      : idea.downvotes.includes(currentUserId)
      ? "down"
      : null
    : null;

  const handleSave = async () => {
    setSaving(true);
    const ok = await onStatusSave(idea._id, statusDraft, responseDraft);
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
  };

  return (
    <div className="relative flex gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20 sm:p-5">
      {/* COLONNE DE VOTE */}
      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
        <button
          onClick={() => onVote(idea._id, "up")}
          disabled={!isLoggedIn}
          title={isLoggedIn ? "Voter pour" : "Connecte-toi pour voter"}
          aria-label="Voter pour cette idée"
          aria-pressed={myVote === "up"}
          className={`rounded-lg border p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${FOCUS} ${
            myVote === "up"
              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
              : "border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/30"
          }`}
        >
          <ChevronUp size={16} />
        </button>
        <span className={`text-base font-bold tabular-nums ${idea.score > 0 ? "text-emerald-400" : idea.score < 0 ? "text-red-400" : "text-white"}`}>
          {idea.score}
        </span>
        <button
          onClick={() => onVote(idea._id, "down")}
          disabled={!isLoggedIn}
          title={isLoggedIn ? "Voter contre" : "Connecte-toi pour voter"}
          aria-label="Voter contre cette idée"
          aria-pressed={myVote === "down"}
          className={`rounded-lg border p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${FOCUS} ${
            myVote === "down"
              ? "border-red-500/50 bg-red-500/15 text-red-400"
              : "border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-red-400 hover:border-red-500/30"
          }`}
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {/* CONTENU */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {rank && rank <= 3 && (
            <span className="flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300">
              <TrendingUp size={10} />
              #{rank}
            </span>
          )}
          <span className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.border} ${meta.text}`}>
            <CatIcon size={11} />
            {meta.label}
          </span>
          <IdeaStatusBadge status={idea.status} />
        </div>

        <h3 className="mb-1 text-base font-semibold text-white">{idea.title}</h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{idea.description}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-xs text-zinc-400">
            Proposé par <span className="font-semibold text-zinc-300">{idea.authorName}</span> ·{" "}
            {new Date(idea.createdAt).toLocaleDateString("fr-FR")}
          </p>
          <span className="flex items-center gap-1 text-xs text-zinc-400">
            <Vote size={11} />
            {idea.upvotes.length + idea.downvotes.length} vote{idea.upvotes.length + idea.downvotes.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* RÉPONSE OFFICIELLE */}
        {idea.officialResponse?.content && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-purple-500/30 bg-purple-500/[0.06] p-4">
            <MessageSquareQuote size={16} className="text-purple-300 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-purple-200">
                <CheckCircle2 size={12} />
                Réponse de l'équipe
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                {idea.officialResponse.content}
              </p>
            </div>
          </div>
        )}

        {/* PANNEAU STAFF */}
        {canManageIdeas && (
          <div className="mt-3">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className={`inline-flex items-center gap-1.5 rounded text-sm font-medium text-zinc-400 transition-colors hover:text-purple-300 ${FOCUS}`}
              >
                <ShieldCheck size={12} />
                Gérer (staff)
              </button>
            ) : (
              <div className="mt-1 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-200">
                    <ShieldCheck size={14} className="text-purple-300" />
                    Panneau staff
                  </p>
                  <button onClick={() => setEditing(false)} aria-label="Fermer le panneau staff" className={`rounded p-1 text-zinc-400 transition-colors hover:text-white ${FOCUS}`}>
                    <X size={14} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {STATUS_FILTERS.filter((s) => s.id !== "tous").map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStatusDraft(s.id)}
                      aria-pressed={statusDraft === s.id}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${FOCUS} ${
                        statusDraft === s.id
                          ? "border-purple-500/50 bg-purple-500/20 text-purple-200"
                          : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={responseDraft}
                  onChange={(e) => setResponseDraft(e.target.value)}
                  placeholder="Réponse officielle (laisser vide pour ne pas en publier)..."
                  rows={2}
                  aria-label="Réponse officielle"
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
                />

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`flex w-full items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-50 ${FOCUS}`}
                >
                  {saving ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : saved ? (
                    <Check size={12} />
                  ) : (
                    <Save size={12} />
                  )}
                  {saved ? "Enregistré" : "Enregistrer"}
                </button>
              </div>
            )}
          </div>
        )}

        <IdeaComments ideaId={idea._id} initialCount={idea.commentCount ?? 0} isLoggedIn={isLoggedIn} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Commentaires publics                                                        */
/* -------------------------------------------------------------------------- */

function IdeaComments({
  ideaId,
  initialCount,
  isLoggedIn,
}: {
  ideaId: string;
  initialCount: number;
  isLoggedIn: boolean;
}) {
  const { confirm, notify } = useDialog();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<PublicComment[] | null>(null);
  const [total, setTotal] = useState(initialCount);
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/comments`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setComments(data.comments || []);
      setTotal(data.total ?? (data.comments || []).length);
    } catch {
      setLoadError(true);
      setComments([]);
    }
  }, [ideaId]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && comments === null) load();
  };

  const post = async () => {
    const content = draft.trim();
    if (!content || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify(data.error || "Impossible de publier le commentaire", "error");
        return;
      }
      setComments((prev) => [...(prev ?? []), data.comment]);
      setTotal((t) => t + 1);
      setDraft("");
    } catch {
      notify("Erreur réseau", "error");
    } finally {
      setPosting(false);
    }
  };

  const remove = async (comment: PublicComment) => {
    const ok = await confirm({
      title: "Supprimer ce commentaire ?",
      description: comment.mine
        ? "Il disparaîtra définitivement de l'idée."
        : `Le commentaire de ${comment.authorName} sera supprimé (action de modération, enregistrée dans le journal).`,
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/ideas/${ideaId}/comments/${comment.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        notify(data.error || "Suppression impossible", "error");
        return;
      }
      setComments((prev) => (prev ?? []).filter((c) => c.id !== comment.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch {
      notify("Erreur réseau", "error");
    }
  };

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <button
        onClick={toggle}
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded text-sm font-medium text-zinc-400 transition-colors hover:text-purple-300 ${FOCUS}`}
      >
        <MessageCircle size={14} />
        {total === 0 ? "Commenter" : `${total} commentaire${total > 1 ? "s" : ""}`}
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {comments === null ? (
            <div className="flex justify-center py-3">
              <Loader2 size={15} className="animate-spin text-purple-500" />
            </div>
          ) : loadError ? (
            <p role="alert" className="text-sm text-red-400">
              Impossible de charger les commentaires.{" "}
              <button onClick={load} className="font-bold underline hover:text-red-300">
                Réessayer
              </button>
            </p>
          ) : (
            <>
              {total > COMMENTS_SHOWN && (
                <p className="text-xs text-zinc-400">
                  Les {COMMENTS_SHOWN} commentaires les plus récents sont affichés.
                </p>
              )}

              {comments.length === 0 ? (
                <p className="text-sm text-zinc-400">Aucun commentaire pour le moment. Soyez le premier !</p>
              ) : (
                <ul className="space-y-2">
                  {comments.map((c) => (
                    <li
                      key={c.id}
                      className={`rounded-xl border px-3.5 py-2.5 ${
                        c.isStaff ? "border-purple-500/25 bg-purple-500/5" : "border-white/10 bg-white/[0.02]"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="flex min-w-0 items-center gap-2 text-sm">
                          <span className="truncate font-semibold text-zinc-200">{c.authorName}</span>
                          {c.isStaff && (
                            <span className="shrink-0 rounded-md border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-xs font-semibold text-purple-200">
                              Équipe
                            </span>
                          )}
                          <span className="shrink-0 text-xs text-zinc-400">
                            {new Date(c.createdAt).toLocaleString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </p>
                        {c.canDelete && (
                          <button
                            onClick={() => remove(c)}
                            className="shrink-0 rounded p-2 text-zinc-400 transition-colors hover:text-red-400"
                            aria-label={c.mine ? "Supprimer mon commentaire" : "Supprimer (modération)"}
                            title={c.mine ? "Supprimer mon commentaire" : "Supprimer (modération)"}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      {/* Texte brut : jamais interprété comme du HTML ni transformé en liens */}
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-300">{c.content}</p>
                    </li>
                  ))}
                </ul>
              )}

              {isLoggedIn ? (
                <div className="space-y-1.5">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        post();
                      }
                    }}
                    maxLength={COMMENT_MAX}
                    rows={2}
                    placeholder="Ajouter un commentaire (soyez constructif et respectueux)..."
                    aria-label="Ajouter un commentaire"
                    className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">
                      {draft.trim().length}/{COMMENT_MAX} · Ctrl + Entrée pour publier
                    </span>
                    <button
                      onClick={post}
                      disabled={!draft.trim() || posting}
                      className={`inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-50 ${FOCUS}`}
                    >
                      {posting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      Publier
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-400">
                  <Link href="/login" className="font-semibold text-purple-300 underline-offset-4 hover:underline">
                    Connectez-vous
                  </Link>{" "}
                  pour commenter.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
