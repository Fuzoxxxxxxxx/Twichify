"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Save, X, HelpCircle, Edit2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardUI";
import {
  AccessDenied,
  BTN_ICON,
  BTN_ICON_DANGER,
  BTN_PRIMARY,
  EmptyPanel,
  FilterPills,
  FOCUS,
  INPUT,
  LoadingPanel,
  SearchField,
} from "@/components/admin/AdminUI";
import FaqAnswer from "@/components/FaqAnswer";
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
const EDITABLE_CATEGORIES = [...FAQ_CATEGORY_KEYS];

const EMPTY_FORM = { question: "", answer: "", category: "autre", order: 0 };

export default function AdminFaqPage() {
  const { confirm } = useDialog();
  const [articles, setArticles] = useState<FaqArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [denied, setDenied] = useState(false);
  const [filter, setFilter] = useState("tous");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);

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
          setDenied(true);
          return { articles: [] };
        }
        return r.json();
      })
      .then((data) => setArticles(data.articles || []))
      .catch(() => setDenied(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
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
      const res = await fetch(editingId ? `/api/admin/faq/${editingId}` : "/api/admin/faq", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.status === 403) return setDenied(true);
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
      if (res.status === 403) return setDenied(true);
      fetchArticles();
    } catch (e) {
      console.error("Erreur suppression FAQ:", e);
    }
  };

  const filtered = useMemo(() => {
    let result = filter === "tous" ? articles : articles.filter((a) => a.category === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((a) => a.question.toLowerCase().includes(q) || a.answer.toLowerCase().includes(q));
    }
    // Regroupé par catégorie dans l'ordre d'affichage (tri stable : l'ordre propre à chaque catégorie est conservé).
    return [...result].sort((a, b) => faqCategoryOrder(a.category) - faqCategoryOrder(b.category) || a.order - b.order);
  }, [articles, filter, search]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { tous: articles.length };
    for (const a of articles) map[a.category] = (map[a.category] || 0) + 1;
    return map;
  }, [articles]);

  const filterOptions = useMemo(
    () => [
      { id: "tous", label: "Tous", count: counts.tous },
      ...FAQ_CATEGORY_KEYS.map((key) => ({ id: key as string, label: faqCategoryLabel(key), count: counts[key] || 0 })),
    ],
    [counts]
  );

  if (denied) return <AccessDenied />;

  // Le rôle n'est pas encore chargé : on ne décide rien tant qu'on ne sait pas.
  if (myRole === null) return <LoadingPanel label="Chargement..." />;

  // GET /api/faq est public (utilisée par la page d'aide) donc elle ne renvoie jamais
  // de 403 : la permission doit être vérifiée ici pour ne pas exposer l'édition de la FAQ.
  if (!canManageFaq) {
    return <AccessDenied>Ton rôle ne dispose pas de la permission de gestion de la FAQ.</AccessDenied>;
  }

  const formOpen = creating || editingId !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Support"
        title="FAQ"
        description="Les articles de la page d'aide. Une ligne de la réponse = un paragraphe."
        action={
          <button type="button" onClick={startCreate} className={`${BTN_PRIMARY} shrink-0 py-3`}>
            <Plus size={16} aria-hidden="true" />
            Nouvel article
          </button>
        }
      />

      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Rechercher une question ou réponse..."
        label="Rechercher dans la FAQ"
      />

      <FilterPills label="Filtrer par catégorie" options={filterOptions} value={filter} onChange={setFilter} />

      {/* FORMULAIRE CRÉATION / ÉDITION */}
      {formOpen && (
        <div className="space-y-5 rounded-2xl border border-purple-500/30 bg-white/[0.02] p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <p className="text-base font-semibold text-white">{editingId ? "Modifier l'article" : "Créer un nouvel article"}</p>
            <button type="button" onClick={resetForm} aria-label="Fermer le formulaire" className={`rounded p-2 text-zinc-400 transition-colors hover:text-white ${FOCUS}`}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-2">
            <p id="faq-category-label" className="text-sm font-medium text-zinc-200">
              Catégorie
            </p>
            <div role="group" aria-labelledby="faq-category-label" className="flex flex-wrap gap-2">
              {EDITABLE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: cat }))}
                  aria-pressed={form.category === cat}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${FOCUS} ${
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

          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_8rem]">
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
                className={INPUT}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="faq-order" className="text-sm font-medium text-zinc-200">
                Ordre
              </label>
              <input
                id="faq-order"
                type="number"
                min={0}
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) || 0 }))}
                className={INPUT}
              />
            </div>
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
              rows={6}
              className={`${INPUT} resize-y`}
            />
            <p className="text-sm text-zinc-400">
              Une ligne = un paragraphe. <code className="rounded bg-white/[0.06] px-1 text-zinc-200">**texte**</code> met en gras, et une
              ligne qui commence par « Note » devient un encadré. Il n'y a ni liste ni lien.
            </p>
          </div>

          {form.answer.trim() && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-200">Aperçu (tel que les utilisateurs le verront)</p>
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-[15px] text-zinc-300">
                <FaqAnswer text={form.answer} />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !form.question.trim() || !form.answer.trim()}
            className={`${BTN_PRIMARY} w-full py-3`}
          >
            {saving ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
            Enregistrer l'article
          </button>
        </div>
      )}

      {/* LISTE DES ARTICLES */}
      {loading ? (
        <LoadingPanel label="Chargement des articles FAQ..." />
      ) : filtered.length === 0 ? (
        <EmptyPanel icon={HelpCircle}>Aucun article dans cette catégorie.</EmptyPanel>
      ) : (
        <ul className="space-y-3">
          {filtered.map((article) => (
            <li
              key={article._id}
              className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-white/20"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-block rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-200">
                    {faqCategoryLabel(article.category)}
                  </span>
                  <span className="text-xs tabular-nums text-zinc-500" title="Ordre dans la catégorie">
                    #{article.order}
                  </span>
                </div>
                <p className="mb-1 text-base font-semibold text-white">{article.question}</p>
                <p className="line-clamp-2 text-sm leading-relaxed text-zinc-400">{article.answer}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => startEdit(article)}
                  className={BTN_ICON}
                  title="Modifier"
                  aria-label={`Modifier : ${article.question}`}
                >
                  <Edit2 size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(article._id)}
                  className={BTN_ICON_DANGER}
                  title="Supprimer"
                  aria-label={`Supprimer : ${article.question}`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
