"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft,
  Music,
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
} from "lucide-react";
import IdeaStatusBadge from "@/components/IdeaStatusBadge";
import SiteHeader from "@/components/SiteHeader";
import Pagination, { usePagination } from "@/components/Pagination";
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
  createdAt: string;
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
    <main className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 relative flex flex-col justify-between overflow-x-clip">
      <style jsx global>{`
        @keyframes ideaFloatIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .idea-float-in { animation: ideaFloatIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[520px] bg-gradient-to-tr from-purple-600/25 via-indigo-500/15 to-emerald-500/15 blur-[170px] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e15_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />

      <div>
        <SiteHeader />

        <div className="max-w-5xl mx-auto px-6 pt-8 pb-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-purple-400 transition-colors mb-6 group w-fit"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
            <span>Accueil</span>
          </Link>

          {/* HERO */}
          <div className="relative overflow-hidden rounded-3xl border border-purple-500/25 bg-zinc-950/70 backdrop-blur-xl p-6 sm:p-8 mb-6 shadow-[0_0_60px_rgba(147,51,234,0.08)]">
            <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600/10 blur-[100px] pointer-events-none rounded-full" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-600/10 blur-[100px] pointer-events-none rounded-full" />

            <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 text-purple-400 mb-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
                    <Lightbulb size={15} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">Boîte à idées</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white leading-tight">
                  Proposez, votez, <span className="bg-gradient-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent">suivez.</span>
                </h1>
                <p className="text-zinc-400 text-sm mt-2.5 max-w-lg leading-relaxed">
                  Vos idées façonnent Twichify. Proposez une fonctionnalité et votez pour celles que vous voulez voir arriver en priorité.
                </p>
              </div>

              {session ? (
                <button
                  onClick={() => setShowForm((v) => !v)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] hover:bg-right px-6 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-95 shrink-0"
                >
                  {showForm ? <X size={15} /> : <Plus size={15} />}
                  {showForm ? "Annuler" : "Proposer une idée"}
                </button>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-700/80 bg-zinc-950/60 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-zinc-200 hover:border-purple-500/60 hover:text-white transition-all shrink-0"
                >
                  Se connecter pour proposer
                </Link>
              )}
            </div>

            {/* STATS */}
            <div className="relative grid grid-cols-4 gap-3 sm:gap-6 mt-7 pt-6 border-t border-zinc-800/70">
              <div>
                <p className="font-mono font-black text-white text-lg sm:text-2xl">{stats.total}</p>
                <p className="text-zinc-500 text-[10px] sm:text-xs mt-0.5">Idées</p>
              </div>
              <div>
                <p className="font-mono font-black text-emerald-400 text-lg sm:text-2xl">{stats.totalVotes}</p>
                <p className="text-zinc-500 text-[10px] sm:text-xs mt-0.5">Votes</p>
              </div>
              <div>
                <p className="font-mono font-black text-blue-400 text-lg sm:text-2xl">{stats.enCours}</p>
                <p className="text-zinc-500 text-[10px] sm:text-xs mt-0.5">En cours</p>
              </div>
              <div>
                <p className="font-mono font-black text-purple-400 text-lg sm:text-2xl">{stats.termine}</p>
                <p className="text-zinc-500 text-[10px] sm:text-xs mt-0.5">Terminées</p>
              </div>
            </div>
          </div>

          {/* FORMULAIRE DE SOUMISSION */}
          {showForm && session && (
            <div className="rounded-2xl border border-purple-500/30 bg-zinc-950/80 p-5 sm:p-6 backdrop-blur-xl space-y-4 mb-6 idea-float-in">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Catégorie</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CATEGORY_META).map(([id, meta]) => {
                    const CatIcon = meta.icon;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, category: id }))}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                          form.category === id
                            ? `${meta.border} ${meta.bg} ${meta.text}`
                            : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-white"
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Titre</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Résumez votre idée en une phrase..."
                  maxLength={150}
                  className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Expliquez votre idée, pourquoi elle serait utile..."
                  rows={4}
                  maxLength={2000}
                  className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 transition-colors resize-none"
                />
              </div>

              {formError && <p className="text-xs text-red-400 font-semibold">{formError}</p>}

              <button
                onClick={handleSubmitIdea}
                disabled={submitting || !form.title.trim() || !form.description.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                <span>Soumettre l'idée</span>
              </button>
            </div>
          )}

          {/* BARRE DE RECHERCHE, TRI ET FILTRES */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl p-4 sm:p-5 space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher une idée..."
                  className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/50 pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 transition-all"
                />
              </div>

              <div className="flex items-center rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-1 shrink-0">
                <button
                  onClick={() => setSort("popular")}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-all ${
                    sort === "popular" ? "bg-purple-500/20 text-purple-300" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Flame size={12} />
                  Populaires
                </button>
                <button
                  onClick={() => setSort("recent")}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-all ${
                    sort === "recent" ? "bg-purple-500/20 text-purple-300" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Clock size={12} />
                  Récentes
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-3.5 border-t border-zinc-800/70">
              {STATUS_FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setStatusFilter(id)}
                  className={`rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-all ${
                    statusFilter === id
                      ? "border-purple-500 bg-purple-500/15 text-purple-300"
                      : "border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setCategoryFilter("tous")}
                className={`rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-all ${
                  categoryFilter === "tous"
                    ? "border-cyan-500 bg-cyan-500/15 text-cyan-300"
                    : "border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:text-zinc-300"
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
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-all ${
                      categoryFilter === id
                        ? `${meta.border} ${meta.bg} ${meta.text}`
                        : "border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <CatIcon size={11} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* LISTE DES IDÉES */}
          {loading ? (
            <div className="py-16 text-center border border-zinc-800/80 bg-zinc-950/60 rounded-2xl backdrop-blur-xl">
              <Loader2 className="w-5 h-5 text-purple-500 animate-spin mx-auto mb-2" />
              <p className="text-zinc-500 text-xs">Chargement des idées...</p>
            </div>
          ) : visibleIdeas.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-zinc-800/80 bg-zinc-950/40">
              <Lightbulb size={28} className="mx-auto text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">Aucune idée pour ces filtres.</p>
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
        </div>
      </div>

      <footer className="w-full border-t border-zinc-900/80 bg-black/40 backdrop-blur-md z-20 mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500">
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
    <div className="group relative flex gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 sm:p-5 hover:border-purple-500/30 hover:bg-zinc-950/90 transition-all backdrop-blur-xl overflow-hidden">
      {/* LISERÉ DE CATÉGORIE */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${meta.accent} opacity-70 group-hover:opacity-100 transition-opacity`} />

      {/* COLONNE DE VOTE */}
      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5 pl-1">
        <button
          onClick={() => onVote(idea._id, "up")}
          disabled={!isLoggedIn}
          title={isLoggedIn ? "Voter pour" : "Connecte-toi pour voter"}
          className={`p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 ${
            myVote === "up"
              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
              : "border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/30"
          }`}
        >
          <ChevronUp size={16} />
        </button>
        <span className={`text-sm font-black font-mono tabular-nums ${idea.score > 0 ? "text-emerald-400" : idea.score < 0 ? "text-red-400" : "text-white"}`}>
          {idea.score}
        </span>
        <button
          onClick={() => onVote(idea._id, "down")}
          disabled={!isLoggedIn}
          title={isLoggedIn ? "Voter contre" : "Connecte-toi pour voter"}
          className={`p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 ${
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
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
              <TrendingUp size={10} />
              #{rank}
            </span>
          )}
          <span className={`flex items-center gap-1.5 text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border ${meta.bg} ${meta.border} ${meta.text}`}>
            <CatIcon size={11} />
            {meta.label}
          </span>
          <IdeaStatusBadge status={idea.status} />
        </div>

        <h3 className="text-sm font-bold text-white mb-1">{idea.title}</h3>
        <p className="text-[12px] text-zinc-400 leading-relaxed whitespace-pre-wrap">{idea.description}</p>

        <div className="flex items-center gap-3 mt-2.5">
          <p className="text-[10px] text-zinc-600">
            Proposé par <span className="text-zinc-400 font-semibold">{idea.authorName}</span> ·{" "}
            {new Date(idea.createdAt).toLocaleDateString("fr-FR")}
          </p>
          <span className="flex items-center gap-1 text-[10px] text-zinc-600">
            <Vote size={11} />
            {idea.upvotes.length + idea.downvotes.length} vote{idea.upvotes.length + idea.downvotes.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* RÉPONSE OFFICIELLE */}
        {idea.officialResponse?.content && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-950/30 to-indigo-950/20 p-3.5">
            <MessageSquareQuote size={15} className="text-purple-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-purple-300 mb-1 flex items-center gap-1.5">
                <CheckCircle2 size={11} />
                Réponse de l'équipe
              </p>
              <p className="text-[12px] text-zinc-200 leading-relaxed whitespace-pre-wrap">
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
                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-purple-400 transition-colors"
              >
                <ShieldCheck size={12} />
                Gérer (staff)
              </button>
            ) : (
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 space-y-3 mt-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-purple-400" />
                    Panneau staff
                  </p>
                  <button onClick={() => setEditing(false)} className="text-zinc-500 hover:text-white transition-colors">
                    <X size={13} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {STATUS_FILTERS.filter((s) => s.id !== "tous").map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStatusDraft(s.id)}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-bold border transition-all ${
                        statusDraft === s.id
                          ? "border-purple-500 bg-purple-500/20 text-purple-300"
                          : "border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:text-zinc-300"
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
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-[11px] text-white placeholder-zinc-600 outline-none focus:border-purple-500/50 transition-colors resize-none"
                />

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 px-3 py-1.5 text-[10px] font-bold text-white transition-all disabled:opacity-50 w-full"
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
      </div>
    </div>
  );
}
