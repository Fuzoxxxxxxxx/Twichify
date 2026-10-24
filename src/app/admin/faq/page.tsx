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
  AlertTriangle, 
  Loader2, 
  Search 
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardUI";
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
      <div role="alert" className="mx-auto mt-10 max-w-md rounded-2xl border border-red-500/25 bg-white/[0.02] p-8 text-center">
        <AlertTriangle className="mx-auto text-red-400 mb-3" size={32} />
        <h2 className="mb-2 text-lg font-bold">Accès refusé</h2>
        <p className="text-sm text-zinc-400">
          Cette section est réservée au staff.
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
      <div role="alert" className="mx-auto mt-10 max-w-md rounded-2xl border border-red-500/25 bg-white/[0.02] p-8 text-center">
        <AlertTriangle className="mx-auto text-red-400 mb-3" size={32} />
        <h2 className="mb-2 text-lg font-bold">Accès refusé</h2>
        <p className="text-sm text-zinc-400">
          Ton rôle ne dispose pas de la permission de gestion de la FAQ.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Support"
        title="FAQ"
        action={
          <button
            onClick={startCreate}
            className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
          >
            <Plus size={16} />
            <span>Nouvel article</span>
          </button>
        }
      />

      {/* RECHERCHE */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une question ou réponse..."
          aria-label="Rechercher dans la FAQ"
          className="w-full rounded-lg border border-white/10 bg-white/[0.02] py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
        />
      </div>

      {/* FILTRES PAR CATÉGORIE */}
      <div role="group" aria-label="Filtrer par catégorie" className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            aria-pressed={filter === cat}
            className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 ${
              filter === cat
                ? "border-purple-500/50 bg-purple-500/15 text-purple-200"
                : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
            }`}
          >
            {cat === "tous" ? "Tous" : faqCategoryLabel(cat)}{" "}
            {counts[cat] !== undefined && <span className="tabular-nums opacity-70">{counts[cat] || 0}</span>}
          </button>
        ))}
      </div>

      {/* FORMULAIRE CRÉATION / ÉDITION */}
      {(creating || editingId) && (
        <div className="space-y-5 rounded-2xl border border-purple-500/30 bg-white/[0.02] p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <p className="text-base font-semibold text-white">
              {editingId ? "Modifier l'article" : "Créer un nouvel article"}
            </p>
            <button
              onClick={resetForm}
              aria-label="Fermer le formulaire"
              className="cursor-pointer rounded p-2 text-zinc-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-2">
            <p id="faq-category-label" className="text-sm font-medium text-zinc-200">
              Catégorie
            </p>
            <div role="group" aria-labelledby="faq-category-label" className="flex flex-wrap gap-2">
              {categories.filter((c) => c !== "tous").map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: cat }))}
                  aria-pressed={form.category === cat}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 ${
                    form.category === cat
                      ? "border-purple-500/60 bg-purple-500/20 text-purple-100"
                      : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {faqCategoryLabel(cat)}
                </button>
              ))}
            </div>
            <p className="text-sm text-zinc-400">{faqCategoryDescription(form.category)}</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="faq-question" className="text-sm font-medium text-zinc-200">
              Question
            </label>
            <input
              id="faq-question"
              type="text"
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              placeholder="Saisissez la question..."
              className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="faq-answer" className="text-sm font-medium text-zinc-200">
              Réponse
            </label>
            <textarea
              id="faq-answer"
              value={form.answer}
              onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
              placeholder="Saisissez la réponse..."
              rows={4}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !form.question.trim() || !form.answer.trim()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            <span>Enregistrer l'article</span>
          </button>
        </div>
      )}

      {/* LISTE DES ARTICLES */}
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center" aria-busy="true">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin mx-auto mb-2" />
          <p className="text-sm text-zinc-400">Chargement des articles FAQ...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-16 text-center">
          <HelpCircle size={28} className="mx-auto mb-3 text-zinc-600" />
          <p className="text-sm text-zinc-300">Aucun article dans cette catégorie.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((article) => (
            <li
              key={article._id}
              className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-white/20"
            >
              <div className="min-w-0 flex-1">
                <span className="mb-2 inline-block rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-200">
                  {faqCategoryLabel(article.category)}
                </span>
                <p className="mb-1 text-base font-semibold text-white">{article.question}</p>
                <p className="line-clamp-2 text-sm leading-relaxed text-zinc-400">
                  {article.answer}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2 pt-0.5">
                <button
                  onClick={() => startEdit(article)}
                  className="cursor-pointer rounded-lg border border-white/10 p-2.5 text-zinc-400 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
                  title="Modifier"
                  aria-label={`Modifier : ${article.question}`}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(article._id)}
                  className="cursor-pointer rounded-lg border border-red-500/25 bg-red-500/10 p-2.5 text-red-300 transition-colors hover:bg-red-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
                  title="Supprimer"
                  aria-label={`Supprimer : ${article.question}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}