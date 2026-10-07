"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Lightbulb,
  Filter,
  AlertTriangle,
  Loader2,
  Search,
  Edit2,
  X,
  Save,
  Check,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Flame,
  Clock,
} from "lucide-react";
import IdeaStatusBadge from "@/components/IdeaStatusBadge";
import { hasPermission, PERMISSIONS } from "@/lib/roles";

interface Idea {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  authorName: string;
  upvotes: string[];
  downvotes: string[];
  score: number;
  officialResponse?: { content: string | null; updatedAt: string | null } | null;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: "Général",
  support: "Support",
  feature: "Fonctionnalité",
  ui_ux: "UI / UX",
};

const statusFilters = [
  { id: "tous", label: "Tous" },
  { id: "en_etude", label: "À l'étude" },
  { id: "planifie", label: "Planifié" },
  { id: "en_cours", label: "En cours" },
  { id: "termine", label: "Terminé" },
  { id: "rejete", label: "Rejeté" },
];

export default function AdminIdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("tous");
  const [categoryFilter, setCategoryFilter] = useState("tous");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "popular">("recent");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState("en_etude");
  const [responseDraft, setResponseDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const [myRole, setMyRole] = useState<string | null>(null);
  const canManageIdeas = myRole !== null && hasPermission(myRole, PERMISSIONS.MANAGE_IDEAS);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => setMyRole(data.role || "user"))
      .catch(() => setMyRole("user"));
  }, []);

  const fetchIdeas = () => {
    fetch(`/api/ideas?sort=${sort}`)
      .then((r) => r.json())
      .then((data) => setIdeas(data.ideas || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchIdeas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  const startEdit = (idea: Idea) => {
    setEditingId(idea._id);
    setStatusDraft(idea.status);
    setResponseDraft(idea.officialResponse?.content || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setStatusDraft("en_etude");
    setResponseDraft("");
  };

  const handleSave = async (ideaId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusDraft, officialResponse: responseDraft }),
      });
      if (res.status === 403) return setError(true);
      if (res.ok) {
        const data = await res.json();
        setIdeas((prev) => prev.map((i) => (i._id === ideaId ? { ...i, ...data.idea, score: i.score } : i)));
        setSavedId(ideaId);
        setTimeout(() => setSavedId(null), 1800);
        setEditingId(null);
      }
    } catch (e) {
      console.error("Erreur sauvegarde idée:", e);
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    let result = filter === "tous" ? ideas : ideas.filter((i) => i.status === filter);
    if (categoryFilter !== "tous") result = result.filter((i) => i.category === categoryFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.authorName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [ideas, filter, categoryFilter, search]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { tous: ideas.length };
    for (const i of ideas) {
      map[i.status] = (map[i.status] || 0) + 1;
    }
    return map;
  }, [ideas]);

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center rounded-2xl border border-red-500/20 bg-zinc-950/80 p-8 backdrop-blur-xl mt-10">
        <AlertTriangle className="mx-auto text-red-400 mb-3" size={32} />
        <h2 className="text-lg font-bold mb-2">Accès Refusé</h2>
        <p className="text-zinc-400 text-xs">
          Cette section est exclusivement réservée au staff.
        </p>
      </div>
    );
  }

  if (myRole === null) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="w-5 h-5 text-purple-500 animate-spin mx-auto" />
      </div>
    );
  }

  // GET /api/ideas est public (utilisée par la boîte à idées) donc elle ne renvoie jamais
  // de 403 : la permission doit être vérifiée ici pour ne pas exposer la modération.
  if (!canManageIdeas) {
    return (
      <div className="max-w-md mx-auto text-center rounded-2xl border border-red-500/20 bg-zinc-950/80 p-8 backdrop-blur-xl mt-10">
        <AlertTriangle className="mx-auto text-red-400 mb-3" size={32} />
        <h2 className="text-lg font-bold mb-2">Accès Refusé</h2>
        <p className="text-zinc-400 text-xs">
          Ton rôle ne dispose pas de la permission de gestion de la boîte à idées.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ENTÊTE */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400 mb-2">
            Communauté
          </p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white">
            Idées
          </h1>
        </div>

        <Link
          href="/ideas"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:text-white hover:border-purple-500/40 transition-all shrink-0"
        >
          <ExternalLink size={13} />
          Voir la page publique
        </Link>
      </div>

      {/* RECHERCHE + TRI */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par titre, description ou auteur..."
            className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 backdrop-blur-xl transition-colors"
          />
        </div>

        <div className="flex items-center rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-1 shrink-0">
          <button
            onClick={() => setSort("recent")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-all ${
              sort === "recent" ? "bg-purple-500/20 text-purple-300" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Clock size={12} />
            Récentes
          </button>
          <button
            onClick={() => setSort("popular")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-all ${
              sort === "popular" ? "bg-purple-500/20 text-purple-300" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Flame size={12} />
            Populaires
          </button>
        </div>
      </div>

      {/* FILTRES STATUT */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Filter size={13} className="text-zinc-600 mr-1" />
        {statusFilters.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-widest border transition-all ${
              filter === id
                ? "border-purple-500 bg-purple-500/15 text-purple-300"
                : "border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label} {counts[id] !== undefined && <span className="opacity-60">({counts[id] || 0})</span>}
          </button>
        ))}
      </div>

      {/* FILTRES CATÉGORIE */}
      <div className="flex items-center gap-1.5 flex-wrap -mt-4">
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
        {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setCategoryFilter(id)}
            className={`rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-all ${
              categoryFilter === id
                ? "border-cyan-500 bg-cyan-500/15 text-cyan-300"
                : "border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* LISTE DES IDÉES */}
      {loading ? (
        <div className="py-16 text-center border border-zinc-800/80 bg-zinc-950/60 rounded-2xl backdrop-blur-xl">
          <Loader2 className="w-5 h-5 text-purple-500 animate-spin mx-auto mb-2" />
          <p className="text-zinc-500 text-xs">Chargement des idées...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-[24px] border border-zinc-800/80 bg-zinc-950/40">
          <Lightbulb size={28} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">Aucune idée pour ces filtres.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((idea) => (
            <div
              key={idea._id}
              className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 hover:border-purple-500/40 transition-all backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] text-purple-400/80 font-mono uppercase bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                      {CATEGORY_LABELS[idea.category] || idea.category}
                    </span>
                    <IdeaStatusBadge status={idea.status} />
                    <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-500">
                      <ArrowUp size={10} className="text-emerald-500" />
                      {idea.upvotes.length}
                      <ArrowDown size={10} className="text-red-500 ml-1" />
                      {idea.downvotes.length}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white mb-1">{idea.title}</p>
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">{idea.description}</p>
                  <p className="text-[10px] text-zinc-600 mt-2">
                    Par <span className="text-zinc-400 font-semibold">{idea.authorName}</span> ·{" "}
                    {new Date(idea.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                  {editingId === idea._id ? (
                    <button
                      onClick={cancelEdit}
                      className="p-2 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                      title="Annuler"
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => startEdit(idea)}
                      className="p-2 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                      title="Gérer"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* PANNEAU D'ÉDITION */}
              {editingId === idea._id && (
                <div className="mt-4 pt-4 border-t border-zinc-800/80 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Statut</label>
                    <div className="flex flex-wrap gap-1.5">
                      {statusFilters.filter((s) => s.id !== "tous").map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setStatusDraft(s.id)}
                          className={`rounded-lg px-3 py-1.5 text-[11px] font-bold border transition-all ${
                            statusDraft === s.id
                              ? "border-purple-500 bg-purple-500/20 text-purple-300"
                              : "border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Réponse officielle
                    </label>
                    <textarea
                      value={responseDraft}
                      onChange={(e) => setResponseDraft(e.target.value)}
                      placeholder="Laisser vide pour ne pas publier de réponse..."
                      rows={3}
                      className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 transition-colors resize-none"
                    />
                  </div>

                  <button
                    onClick={() => handleSave(idea._id)}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50 w-full sm:w-auto"
                  >
                    {saving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : savedId === idea._id ? (
                      <Check size={14} />
                    ) : (
                      <Save size={14} />
                    )}
                    {savedId === idea._id ? "Enregistré" : "Enregistrer"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
