"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Lightbulb,
  AlertTriangle,
  Loader2,
  Search,
  Edit2,
  X,
  Save,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Flame,
  Clock,
  Lock,
  StickyNote,
  Trash2,
  History,
  Send,
  MessageSquare,
} from "lucide-react";
import IdeaStatusBadge from "@/components/IdeaStatusBadge";
import { PageHeader } from "@/components/dashboard/DashboardUI";
import ReplyTemplatePicker from "@/components/ReplyTemplatePicker";
import { useDialog } from "@/components/DialogProvider";
import { IDEA_TEMPLATES, type ReplyTemplate } from "@/lib/reply-templates";
import { IDEA_NOTE_MAX, IDEA_RESPONSE_MAX } from "@/lib/idea-admin";

/* --------------------------------- Types --------------------------------- */

interface StaffRef {
  userId: string | null;
  name: string | null;
}

interface HistoryEvent {
  type: "status" | "response" | "response_removed";
  from?: string | null;
  to?: string | null;
  by?: StaffRef;
  at: string;
}

interface InternalNote {
  _id: string;
  text: string;
  by?: StaffRef;
  createdAt: string;
}

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
  officialResponse?: { content: string | null; updatedAt: string | null; by?: StaffRef } | null;
  internalNotes?: InternalNote[];
  history?: HistoryEvent[];
  createdAt: string;
}

type Queue = "all" | "todo" | "noreply" | "replied";
type Sort = "recent" | "oldest" | "popular";

/* -------------------------------- Constantes -------------------------------- */

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

const STATUS_LABELS: Record<string, string> = Object.fromEntries(statusFilters.map((s) => [s.id, s.label]));

const QUEUES: { id: Queue; label: string; hint: string }[] = [
  { id: "todo", label: "À traiter", hint: "À l'étude, sans réponse" },
  { id: "noreply", label: "Sans réponse", hint: "Aucune réponse officielle" },
  { id: "replied", label: "Avec réponse", hint: "Réponse publiée" },
  { id: "all", label: "Total", hint: "Toutes les idées" },
];

const hasReply = (i: Idea) => !!i.officialResponse?.content;
const isTodo = (i: Idea) => i.status === "en_etude" && !hasReply(i);

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

const statusLabel = (id?: string | null) => STATUS_LABELS[id ?? ""] ?? id ?? "";

const describeEvent = (e: HistoryEvent) =>
  e.type === "status"
    ? `Statut : ${statusLabel(e.from)} → ${statusLabel(e.to)}`
    : e.type === "response"
    ? "Réponse publiée ou modifiée"
    : "Réponse retirée";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60";

/* --------------------------------- Carte --------------------------------- */

function IdeaCard({
  idea,
  editing,
  onEdit,
  onClose,
  onUpdated,
  onDirtyChange,
}: {
  idea: Idea;
  editing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onUpdated: (updated: Idea) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { confirm, notify } = useDialog();
  const currentResponse = idea.officialResponse?.content ?? "";

  const [statusDraft, setStatusDraft] = useState(idea.status);
  const [responseDraft, setResponseDraft] = useState(currentResponse);
  const [saving, setSaving] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Le brouillon repart de l'état enregistré à chaque ouverture de l'éditeur.
  useEffect(() => {
    if (editing) {
      setStatusDraft(idea.status);
      setResponseDraft(idea.officialResponse?.content ?? "");
      setNoteDraft("");
      setShowHistory(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const dirty = editing && (statusDraft !== idea.status || responseDraft.trim() !== currentResponse);

  useEffect(() => {
    onDirtyChange(dirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  const applyTemplate = (template: ReplyTemplate) => {
    if (template.status) setStatusDraft(template.status);
    setResponseDraft((current) =>
      current.trim() ? `${current.replace(/\s+$/, "")}\n\n${template.text}` : template.text
    );
  };

  const patch = async (payload: { status?: string; officialResponse?: string }, success: string): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await fetch(`/api/ideas/${idea._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify(data.error || "Échec de l'enregistrement", "error");
        return false;
      }
      onUpdated({ ...idea, ...data.idea });
      notify(success, "success");
      return true;
    } catch {
      notify("Erreur réseau", "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!dirty || saving) return;
    if (await patch({ status: statusDraft, officialResponse: responseDraft }, "Modifications enregistrées")) onClose();
  };

  const removeResponse = async () => {
    const ok = await confirm({
      title: "Retirer la réponse officielle ?",
      description: "Elle ne sera plus visible sur la page publique des idées. Le statut de l'idée n'est pas modifié.",
      confirmLabel: "Retirer",
    });
    if (!ok) return;
    if (await patch({ officialResponse: "" }, "Réponse retirée")) onClose();
  };

  const cancel = async () => {
    if (dirty) {
      const ok = await confirm({
        title: "Abandonner les modifications ?",
        description: "Le statut et la réponse en cours de rédaction ne seront pas enregistrés.",
        confirmLabel: "Abandonner",
      });
      if (!ok) return;
    }
    onClose();
  };

  const addNote = async () => {
    const text = noteDraft.trim();
    if (!text || noteBusy) return;
    setNoteBusy(true);
    try {
      const res = await fetch(`/api/ideas/${idea._id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return notify(data.error || "Impossible d'ajouter la note", "error");
      onUpdated({ ...idea, internalNotes: data.notes });
      setNoteDraft("");
    } catch {
      notify("Erreur réseau", "error");
    } finally {
      setNoteBusy(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    const ok = await confirm({
      title: "Supprimer cette note ?",
      description: "Elle disparaîtra pour tout le staff.",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/ideas/${idea._id}/notes?noteId=${noteId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return notify(data.error || "Impossible de supprimer la note", "error");
      onUpdated({ ...idea, internalNotes: data.notes });
    } catch {
      notify("Erreur réseau", "error");
    }
  };

  const notes = idea.internalNotes ?? [];
  const history = [...(idea.history ?? [])].reverse().slice(0, 10);
  const overLimit = responseDraft.trim().length > IDEA_RESPONSE_MAX;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-white/20">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-200">
              {CATEGORY_LABELS[idea.category] || idea.category}
            </span>
            <IdeaStatusBadge status={idea.status} />
            {!hasReply(idea) && (
              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-200">
                Sans réponse
              </span>
            )}
            {notes.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-zinc-400" title="Notes internes">
                <StickyNote size={12} />
                {notes.length}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs tabular-nums text-zinc-400" title="Votes pour et contre">
              <ArrowUp size={12} className="text-emerald-400" />
              {idea.upvotes.length}
              <ArrowDown size={12} className="ml-1 text-red-400" />
              {idea.downvotes.length}
            </span>
          </div>
          <p className="mb-1 text-base font-semibold text-white">{idea.title}</p>
          <p className={`text-sm leading-relaxed text-zinc-400 ${editing ? "" : "line-clamp-2"}`}>{idea.description}</p>
          <p className="mt-2 text-xs text-zinc-400">
            Par <span className="font-semibold text-zinc-300">{idea.authorName}</span> ·{" "}
            {new Date(idea.createdAt).toLocaleDateString("fr-FR")}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          {editing ? (
            <button
              onClick={cancel}
              className={`cursor-pointer rounded-lg border border-white/10 p-2.5 text-zinc-400 transition-colors hover:border-white/25 hover:text-white ${FOCUS}`}
              title="Fermer"
              aria-label="Fermer"
            >
              <X size={14} />
            </button>
          ) : (
            <button
              onClick={onEdit}
              className={`cursor-pointer rounded-lg border border-white/10 p-2.5 text-zinc-400 transition-colors hover:border-white/25 hover:text-white ${FOCUS}`}
              title="Gérer"
              aria-label={`Gérer l'idée : ${idea.title}`}
            >
              <Edit2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Réponse officielle actuelle (hors édition) */}
      {!editing && hasReply(idea) && (
        <div className="mt-3 rounded-xl border border-purple-500/30 bg-purple-500/[0.06] p-3.5">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-purple-200">
            <MessageSquare size={12} />
            Réponse officielle
            <span className="font-normal text-zinc-400">
              · {idea.officialResponse?.by?.name ? `${idea.officialResponse.by.name}, ` : ""}
              {fmt(idea.officialResponse?.updatedAt)}
            </span>
          </p>
          <p className="line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-zinc-300">{currentResponse}</p>
        </div>
      )}

      {/* PANNEAU D'ÉDITION */}
      {editing && (
        <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
          <div className="space-y-2">
            <p id={`status-label-${idea._id}`} className="text-sm font-medium text-zinc-200">Statut</p>
            <div role="group" aria-labelledby={`status-label-${idea._id}`} className="flex flex-wrap gap-2">
              {statusFilters
                .filter((s) => s.id !== "tous")
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatusDraft(s.id)}
                    aria-pressed={statusDraft === s.id}
                    className={`cursor-pointer rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${FOCUS} ${
                      statusDraft === s.id
                        ? "border-purple-500/60 bg-purple-500/20 text-purple-100"
                        : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor={`response-${idea._id}`} className="text-sm font-medium text-zinc-200">
              Réponse officielle <span className="font-normal text-zinc-400">(publique)</span>
            </label>
            <ReplyTemplatePicker templates={IDEA_TEMPLATES} onPick={applyTemplate} />
            <textarea
              id={`response-${idea._id}`}
              value={responseDraft}
              onChange={(e) => setResponseDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  save();
                }
              }}
              placeholder="Laisser vide pour ne pas publier de réponse..."
              rows={4}
              className={`${inputCls} resize-y`}
            />
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Ctrl + Entrée pour enregistrer</span>
              <span className={overLimit ? "font-semibold text-rose-400" : "tabular-nums"}>
                {responseDraft.trim().length}/{IDEA_RESPONSE_MAX}
              </span>
            </div>

            {responseDraft.trim() && (
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/[0.06] p-3.5">
                <p className="mb-1 text-xs font-semibold text-purple-200">Aperçu public</p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-200">{responseDraft.trim()}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={save}
              disabled={!dirty || saving || overLimit}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-50 ${FOCUS}`}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Enregistrer
            </button>
            <button
              onClick={cancel}
              className={`cursor-pointer rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-white/30 hover:text-white ${FOCUS}`}
            >
              Annuler
            </button>
            {hasReply(idea) && (
              <button
                onClick={removeResponse}
                disabled={saving}
                className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:opacity-50"
              >
                <Trash2 size={13} />
                Retirer la réponse
              </button>
            )}
          </div>

          {/* Notes internes */}
          <div className="space-y-2 border-t border-white/10 pt-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-200">
              <Lock size={13} />
              Notes internes
              <span className="font-normal text-zinc-400">visibles du staff uniquement</span>
            </p>

            {notes.length > 0 && (
              <ul className="space-y-2">
                {notes.map((n) => (
                  <li
                    key={n._id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">{n.text}</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {n.by?.name ?? "Staff"} · {fmt(n.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteNote(n._id)}
                      className="shrink-0 rounded p-2 text-zinc-400 transition-colors hover:text-red-400"
                      title="Supprimer la note"
                      aria-label="Supprimer la note"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={noteDraft}
                maxLength={IDEA_NOTE_MAX}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNote();
                  }
                }}
                placeholder="Ajouter une note pour l'équipe (dépendance, décision, suite à donner)..."
                aria-label="Ajouter une note interne"
                className={inputCls}
              />
              <button
                onClick={addNote}
                disabled={!noteDraft.trim() || noteBusy}
                className={`shrink-0 cursor-pointer rounded-lg border border-white/15 px-3.5 text-zinc-300 transition-colors hover:border-white/30 hover:text-white disabled:opacity-40 ${FOCUS}`}
                title="Ajouter la note"
                aria-label="Ajouter la note"
              >
                {noteBusy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>

          {/* Historique */}
          {history.length > 0 && (
            <div className="border-t border-white/10 pt-3">
              <button
                onClick={() => setShowHistory((v) => !v)}
                aria-expanded={showHistory}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded text-sm font-medium text-zinc-400 transition-colors hover:text-purple-300 ${FOCUS}`}
              >
                <History size={14} />
                {showHistory ? "Masquer" : "Voir"} l&apos;historique ({history.length})
              </button>
              {showHistory && (
                <ol className="mt-2 space-y-2 border-l border-white/10 pl-4">
                  {history.map((e, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-zinc-600 ring-4 ring-black" />
                      <p className="text-sm text-zinc-300">{describeEvent(e)}</p>
                      <p className="text-xs text-zinc-400">
                        {e.by?.name ?? "Staff"} · {fmt(e.at)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

export default function AdminIdeasPage() {
  const { confirm } = useDialog();

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(false);

  const [queue, setQueue] = useState<Queue>("all");
  const [filter, setFilter] = useState("tous");
  const [categoryFilter, setCategoryFilter] = useState("tous");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("recent");

  const [editingId, setEditingId] = useState<string | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    fetch("/api/admin/ideas", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 403) return setDenied(true);
        const data = await r.json();
        setIdeas(data.ideas || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const requestEdit = async (id: string) => {
    if (editingId && editingId !== id && dirtyRef.current) {
      const ok = await confirm({
        title: "Abandonner les modifications ?",
        description: "Ce que vous rédigez sur une autre idée n'a pas été enregistré.",
        confirmLabel: "Abandonner",
      });
      if (!ok) return;
    }
    dirtyRef.current = false;
    setEditingId(id);
  };

  const closeEditor = () => {
    dirtyRef.current = false;
    setEditingId(null);
  };

  const updateIdea = (updated: Idea) =>
    setIdeas((prev) => prev.map((i) => (i._id === updated._id ? { ...i, ...updated, score: i.score } : i)));

  const filtered = useMemo(() => {
    let result = ideas;
    if (queue === "todo") result = result.filter(isTodo);
    else if (queue === "noreply") result = result.filter((i) => !hasReply(i));
    else if (queue === "replied") result = result.filter(hasReply);

    if (filter !== "tous") result = result.filter((i) => i.status === filter);
    if (categoryFilter !== "tous") result = result.filter((i) => i.category === categoryFilter);

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.authorName.toLowerCase().includes(q)
      );
    }

    const time = (i: Idea) => new Date(i.createdAt).getTime();
    return [...result].sort(
      sort === "popular" ? (a, b) => b.score - a.score : sort === "oldest" ? (a, b) => time(a) - time(b) : (a, b) => time(b) - time(a)
    );
  }, [ideas, queue, filter, categoryFilter, search, sort]);

  const queueCounts = useMemo<Record<Queue, number>>(
    () => ({
      todo: ideas.filter(isTodo).length,
      noreply: ideas.filter((i) => !hasReply(i)).length,
      replied: ideas.filter(hasReply).length,
      all: ideas.length,
    }),
    [ideas]
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { tous: ideas.length };
    for (const i of ideas) map[i.status] = (map[i.status] || 0) + 1;
    return map;
  }, [ideas]);

  if (denied) {
    return (
      <div role="alert" className="mx-auto mt-10 max-w-md rounded-2xl border border-red-500/25 bg-white/[0.02] p-8 text-center">
        <AlertTriangle className="mx-auto text-red-400 mb-3" size={32} />
        <h2 className="mb-2 text-lg font-bold">Accès refusé</h2>
        <p className="text-sm text-zinc-400">
          Ton rôle ne dispose pas de la permission de gestion de la boîte à idées.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="mx-auto mt-10 max-w-md rounded-2xl border border-red-500/25 bg-white/[0.02] p-8 text-center">
        <AlertTriangle className="mx-auto text-red-400 mb-3" size={32} />
        <h2 className="mb-2 text-lg font-bold">Chargement impossible</h2>
        <p className="text-sm text-zinc-400">Impossible de récupérer les idées. Réessaie dans un instant.</p>
      </div>
    );
  }

  const pill = (active: boolean, accent: "purple" | "cyan" = "purple") =>
    `cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors ${FOCUS} ${
      active
        ? accent === "purple"
          ? "border-purple-500/50 bg-purple-500/15 text-purple-200"
          : "border-cyan-500/50 bg-cyan-500/15 text-cyan-200"
        : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
    }`;

  const sortBtn = (id: Sort, label: string, Icon: typeof Clock) => (
    <button
      onClick={() => setSort(id)}
      aria-pressed={sort === id}
      className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${FOCUS} ${
        sort === id ? "bg-white/[0.08] text-white" : "text-zinc-400 hover:text-white"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Communauté"
        title="Idées"
        action={
          <Link
            href="/ideas"
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/15 px-4 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:text-white ${FOCUS}`}
          >
            <ExternalLink size={14} />
            Voir la page publique
          </Link>
        }
      />

      {/* FILE DE TRAITEMENT */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUEUES.map((q) => (
          <button
            key={q.id}
            onClick={() => setQueue(queue === q.id ? "all" : q.id)}
            title={q.hint}
            aria-pressed={queue === q.id}
            className={`cursor-pointer rounded-2xl border p-4 text-left transition-colors ${FOCUS} ${
              queue === q.id
                ? "border-purple-500/50 bg-purple-500/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
            }`}
          >
            <p
              className={`font-display text-3xl font-extrabold tabular-nums ${
                q.id === "todo" && queueCounts.todo > 0 ? "text-amber-300" : "text-white"
              }`}
            >
              {loading ? "–" : queueCounts[q.id]}
            </p>
            <p className="mt-1 text-sm text-zinc-400">{q.label}</p>
          </button>
        ))}
      </div>

      {/* RECHERCHE + TRI */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par titre, description ou auteur..."
            aria-label="Rechercher une idée"
            className="w-full rounded-lg border border-white/10 bg-white/[0.02] py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
          />
        </div>

        <div role="group" aria-label="Trier les idées" className="flex shrink-0 items-center rounded-lg border border-white/10 p-1">
          {sortBtn("recent", "Récentes", Clock)}
          {sortBtn("oldest", "Anciennes", History)}
          {sortBtn("popular", "Populaires", Flame)}
        </div>
      </div>

      {/* FILTRES STATUT */}
      <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap items-center gap-2">
        {statusFilters.map(({ id, label }) => (
          <button key={id} onClick={() => setFilter(id)} aria-pressed={filter === id} className={pill(filter === id)}>
            {label} {counts[id] !== undefined && <span className="tabular-nums opacity-70">{counts[id] || 0}</span>}
          </button>
        ))}
      </div>

      {/* FILTRES CATÉGORIE */}
      <div role="group" aria-label="Filtrer par catégorie" className="-mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCategoryFilter("tous")}
          aria-pressed={categoryFilter === "tous"}
          className={pill(categoryFilter === "tous", "cyan")}
        >
          Toutes catégories
        </button>
        {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setCategoryFilter(id)}
            aria-pressed={categoryFilter === id}
            className={pill(categoryFilter === id, "cyan")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* LISTE DES IDÉES */}
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center" aria-busy="true">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin mx-auto mb-2" />
          <p className="text-sm text-zinc-400">Chargement des idées...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-16 text-center">
          <Lightbulb size={28} className="mx-auto mb-3 text-zinc-600" />
          <p className="text-sm text-zinc-300">
            {queue === "todo" ? "Rien à traiter : toutes les idées à l'étude ont une réponse." : "Aucune idée pour ces filtres."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((idea) => (
            <IdeaCard
              key={idea._id}
              idea={idea}
              editing={editingId === idea._id}
              onEdit={() => requestEdit(idea._id)}
              onClose={closeEditor}
              onUpdated={updateIdea}
              onDirtyChange={(dirty) => {
                if (editingId === idea._id) dirtyRef.current = dirty;
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
