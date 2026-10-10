"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Plus, 
  Trash2, 
  Save, 
  X, 
  HelpCircle, 
  Edit2, 
  Filter, 
  AlertTriangle, 
  Loader2, 
  Search 
} from "lucide-react";
import { hasPermission, PERMISSIONS } from "@/lib/roles";
import { useDialog } from "@/components/DialogProvider";
import {
  FAQ_CATEGORY_KEYS,
  faqCategoryDescription,
  faqCategoryLabel,
  faqCategoryOrder,
} from "@/lib/faq-categories";

interface FaqArticle {
  _id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
}

// Liste partagée (lib/faq-categories.ts) : mêmes catégories et même ordre que la page d'aide.
const categories = ["tous", ...FAQ_CATEGORY_KEYS];

export default function AdminFaqPage() {
  const { confirm } = useDialog();
  const [articles, setArticles] = useState<FaqArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("tous");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({ question: "", answer: "", category: "autre", order: 0 });

  const [myRole, setMyRole] = useState<string | null>(null);
  const canManageFaq = myRole !== null && hasPermission(myRole, PERMISSIONS.MANAGE_FAQ);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => setMyRole(data.role || "user"))
      .catch(() => setMyRole("user"));
  }, []);

  const fetchArticles = () => {
    fetch("/api/faq")
      .then((r) => {
        if (r.status === 403) {
          setError(true);
          return { articles: [] };
        }
        return r.json();
      })
      .then((data) => setArticles(data.articles || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const resetForm = () => {
    setForm({ question: "", answer: "", category: "autre", order: 0 });
    setEditingId(null);
    setCreating(false);
  };

  const startEdit = (article: FaqArticle) => {
    setForm({ question: article.question, answer: article.answer, category: article.category, order: article.order });
    setEditingId(article._id);
    setCreating(false);
  };

  const startCreate = () => {
    resetForm();
    setCreating(true);
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim() || saving) return;
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/faq/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.status === 403) return setError(true);
      } else {
        const res = await fetch("/api/admin/faq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.status === 403) return setError(true);
      }
      resetForm();
      fetchArticles();
    } catch (e) {
      console.error("Erreur sauvegarde FAQ:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Supprimer cet article ?",
      description: "L'article sera supprimé de la FAQ pour tous les utilisateurs.",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/faq/${id}`, { method: "DELETE" });
      if (res.status === 403) return setError(true);
      fetchArticles();
    } catch (e) {
      console.error("Erreur suppression FAQ:", e);
    }
  };

  const filtered = useMemo(() => {
    let result = filter === "tous" ? articles : articles.filter((a) => a.category === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (a) => a.question.toLowerCase().includes(q) || a.answer.toLowerCase().includes(q)
      );
    }
    // Regroupé par catégorie dans l'ordre d'affichage (tri stable : l'ordre propre à chaque catégorie est conservé).
    return [...result].sort(
      (a, b) => faqCategoryOrder(a.category) - faqCategoryOrder(b.category) || a.order - b.order
    );
  }, [articles, filter, search]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { tous: articles.length };
    for (const a of articles) {
      map[a.category] = (map[a.category] || 0) + 1;
    }
    return map;
  }, [articles]);

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

  // Le rôle n'est pas encore chargé : on ne décide rien tant qu'on ne sait pas.
  if (myRole === null) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="w-5 h-5 text-purple-500 animate-spin mx-auto" />
      </div>
    );
  }

  // GET /api/faq est public (utilisée par la page d'aide) donc elle ne renvoie jamais
  // de 403 : la permission doit être vérifiée ici pour ne pas exposer l'édition de la FAQ.
  if (!canManageFaq) {
    return (
      <div className="max-w-md mx-auto text-center rounded-2xl border border-red-500/20 bg-zinc-950/80 p-8 backdrop-blur-xl mt-10">
        <AlertTriangle className="mx-auto text-red-400 mb-3" size={32} />
        <h2 className="text-lg font-bold mb-2">Accès Refusé</h2>
        <p className="text-zinc-400 text-xs">
          Ton rôle ne dispose pas de la permission de gestion de la FAQ.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ENTÊTE */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400 mb-2">
            Support
          </p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white">
            FAQ
          </h1>
        </div>

        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-xs font-bold text-white transition-all shrink-0"
        >
          <Plus size={15} />
          <span>Nouvel article</span>
        </button>
      </div>

      {/* RECHERCHE */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une question ou réponse..."
          className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 backdrop-blur-xl transition-colors"
        />
      </div>

      {/* FILTRES PAR CATÉGORIE */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Filter size={13} className="text-zinc-600 mr-1" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-widest border transition-all ${
              filter === cat
                ? "border-purple-500 bg-purple-500/15 text-purple-300"
                : "border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {cat === "tous" ? "Tous" : faqCategoryLabel(cat)}{" "}
            {counts[cat] !== undefined && <span className="opacity-60">({counts[cat] || 0})</span>}
          </button>
        ))}
      </div>

      {/* FORMULAIRE CRÉATION / ÉDITION */}
      {(creating || editingId) && (
        <div className="rounded-2xl border border-purple-500/30 bg-zinc-950/80 p-5 sm:p-6 backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">
              {editingId ? "Modifier l'article" : "Créer un nouvel article"}
            </p>
            <button 
              onClick={resetForm} 
              className="p-1 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Catégorie
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.filter((c) => c !== "tous").map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: cat }))}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                    form.category === cat
                      ? "border-purple-500 bg-purple-500/20 text-purple-300"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-white"
                  }`}
                >
                  {faqCategoryLabel(cat)}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500">{faqCategoryDescription(form.category)}</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Question
            </label>
            <input
              type="text"
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              placeholder="Saisissez la question..."
              className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Réponse
            </label>
            <textarea
              value={form.answer}
              onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
              placeholder="Saisissez la réponse..."
              rows={4}
              className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 transition-colors resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !form.question.trim() || !form.answer.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            <span>Enregistrer l'article</span>
          </button>
        </div>
      )}

      {/* LISTE DES ARTICLES */}
      {loading ? (
        <div className="py-16 text-center border border-zinc-800/80 bg-zinc-950/60 rounded-2xl backdrop-blur-xl">
          <Loader2 className="w-5 h-5 text-purple-500 animate-spin mx-auto mb-2" />
          <p className="text-zinc-500 text-xs">Chargement des articles FAQ...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-[24px] border border-zinc-800/80 bg-zinc-950/40">
          <HelpCircle size={28} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">Aucun article dans cette catégorie.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((article) => (
            <div
              key={article._id}
              className="flex items-start justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 hover:border-purple-500/40 transition-all backdrop-blur-xl"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] text-purple-400/80 font-mono uppercase bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                    {faqCategoryLabel(article.category)}
                  </span>
                </div>
                <p className="text-sm font-bold text-white mb-1">{article.question}</p>
                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                  {article.answer}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                <button
                  onClick={() => startEdit(article)}
                  className="p-2 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                  title="Modifier"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(article._id)}
                  className="p-2 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}