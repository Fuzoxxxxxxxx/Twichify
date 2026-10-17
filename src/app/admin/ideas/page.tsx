"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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

const inputCls =
  "w-full rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 transition-colors";

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
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 hover:border-purple-500/40 transition-all backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] text-purple-400/80 font-mono uppercase bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
              {CATEGORY_LABELS[idea.category] || idea.category}
            </span>
            <IdeaStatusBadge status={idea.status} />
            {!hasReply(idea) && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                Sans réponse
              </span>
            )}
            {notes.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-500" title="Notes internes">
                <StickyNote size={10} />
                {notes.length}
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-500">
              <ArrowUp size={10} className="text-emerald-500" />
              {idea.upvotes.length}
              <ArrowDown size={10} className="text-red-500 ml-1" />
              {idea.downvotes.length}
            </span>
          </div>
          <p className="text-sm font-bold text-white mb-1">{idea.title}</p>
          <p className={`text-[11px] text-zinc-400 leading-relaxed ${editing ? "" : "line-clamp-2"}`}>{idea.description}</p>
          <p className="text-[10px] text-zinc-600 mt-2">
            Par <span className="text-zinc-400 font-semibold">{idea.authorName}</span> ·{" "}
            {new Date(idea.createdAt).toLocaleDateString("fr-FR")}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          {editing ? (
            <button
              onClick={cancel}
              className="p-2 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
              title="Fermer"
            >
              <X size={14} />
            </button>
          ) : (
            <button
              onClick={onEdit}
              className="p-2 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
              title="Gérer"
            >
              <Edit2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Réponse officielle actuelle (hors édition) */}
      {!editing && hasReply(idea) && (
        <div className="mt-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-purple-400">
            <MessageSquare size={11} />
            Réponse officielle
            <span className="font-normal normal-case tracking-normal text-zinc-500">
              · {idea.officialResponse?.by?.name ? `${idea.officialResponse.by.name}, ` : ""}
              {fmt(idea.officialResponse?.updatedAt)}
            </span>
          </p>
          <p className="line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-zinc-300">{currentResponse}</p>
        </div>
      )}

      {/* PANNEAU D'ÉDITION */}
      {editing && (
        <div className="mt-4 pt-4 border-t border-zinc-800/80 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Statut</label>
            <div className="flex flex-wrap gap-1.5">
              {statusFilters
                .filter((s) => s.id !== "tous")
                .map((s) => (
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
              Réponse officielle <span className="font-normal normal-case tracking-normal text-zinc-600">(publique)</span>
            </label>
            <ReplyTemplatePicker templates={IDEA_TEMPLATES} onPick={applyTemplate} />
            <textarea
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
            <div className="flex items-center justify-between text-[10px] text-zinc-600">
              <span>Ctrl + Entrée pour enregistrer</span>
              <span className={overLimit ? "font-bold text-rose-400" : ""}>
                {responseDraft.trim().length}/{IDEA_RESPONSE_MAX}
              </span>
            </div>

            {responseDraft.trim() && (
              <div className="rounded-xl border border-purple-500/25 bg-purple-500/5 p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-purple-400">Aperçu public</p>
                <p className="whitespace-pre-line text-xs leading-relaxed text-zinc-200">{responseDraft.trim()}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={save}
              disabled={!dirty || saving || overLimit}
              className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Enregistrer
            </button>
            <button
              onClick={cancel}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-xs font-bold text-zinc-400 transition-colors hover:text-white"
            >
              Annuler
            </button>
            {hasReply(idea) && (
              <button
                onClick={removeResponse}
                disabled={saving}
                className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
              >
                <Trash2 size={13} />
                Retirer la réponse
              </button>
            )}
          </div>

          {/* Notes internes */}
          <div className="space-y-2 border-t border-zinc-800/80 pt-4">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <Lock size={11} />
              Notes internes
              <span className="font-normal normal-case tracking-normal text-zinc-600">
                · visibles du staff uniquement
              </span>
            </p>

            {notes.length > 0 && (
              <ul className="space-y-1.5">
                {notes.map((n) => (
                  <li
                    key={n._id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="whitespace-pre-line text-xs leading-relaxed text-zinc-300">{n.text}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-zinc-600">
                        {n.by?.name ?? "Staff"} · {fmt(n.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteNote(n._id)}
                      className="shrink-0 p-1 text-zinc-600 transition-colors hover:text-red-400"
                      title="Supprimer la note"
                    >
                      <Trash2 size={12} />
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
                className={inputCls}
              />
              <button
                onClick={addNote}
                disabled={!noteDraft.trim() || noteBusy}
                className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 text-zinc-300 transition-colors hover:text-white disabled:opacity-40"
                title="Ajouter la note"
              >
                {noteBusy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>

          {/* Historique */}
          {history.length > 0 && (
            <div className="border-t border-zinc-800/80 pt-3">
              <button
                onClick={() => setShowHistory((v) => !v)}
                aria-expanded={showHistory}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 transition-colors hover:text-purple-400"
              >
                <History size={12} />
                {showHistory ? "Masquer" : "Voir"} l&apos;historique ({history.length})
              </button>
              {showHistory && (
                <ol className="mt-2 space-y-1.5 border-l border-zinc-800 pl-4">
                  {history.map((e, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-zinc-600 ring-4 ring-zinc-950" />
                      <p className="text-xs text-zinc-300">{describeEvent(e)}</p>
                      <p className="font-mono text-[10px] text-zinc-600">
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
      <div className="max-w-md mx-auto text-center rounded-2xl border border-red-500/20 bg-zinc-950/80 p-8 backdrop-blur-xl mt-10">
        <AlertTriangle className="mx-auto text-red-400 mb-3" size={32} />
        <h2 className="text-lg font-bold mb-2">Accès Refusé</h2>
        <p className="text-zinc-400 text-xs">
          Ton rôle ne dispose pas de la permission de gestion de la boîte à idées.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center rounded-2xl border border-red-500/20 bg-zinc-950/80 p-8 backdrop-blur-xl mt-10">
        <AlertTriangle className="mx-auto text-red-400 mb-3" size={32} />
        <h2 className="text-lg font-bold mb-2">Chargement impossible</h2>
        <p className="text-zinc-400 text-xs">Impossible de récupérer les idées. Réessaie dans un instant.</p>
      </div>
    );
  }

  const pill = (active: boolean, accent: "purple" | "cyan" = "purple") =>
    `rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-widest border transition-all ${
      active
        ? accent === "purple"
          ? "border-purple-500 bg-purple-500/15 text-purple-300"
          : "border-cyan-500 bg-cyan-500/15 text-cyan-300"
        : "border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:text-zinc-300"
    }`;

  const sortBtn = (id: Sort, label: string, Icon: typeof Clock) => (
    <button
      onClick={() => setSort(id)}
      className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-all ${
        sort === id ? "bg-purple-500/20 text-purple-300" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      <Icon size={12} />
      {label}
    </button>
  );

  return (
    <div className="space-y-8">
      {/* ENTÊTE */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400 mb-2">Communauté</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white">Idées</h1>
        </div>

        <Link
          href="/ideas"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:text-white hover:border-purple-500/40 transition-all shrink-0"
        >
          <ExternalLink size={13} />
          Voir la page publique
        </Link>
      </div>

      {/* FILE DE TRAITEMENT */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUEUES.map((q) => (
          <button
            key={q.id}
            onClick={() => setQueue(queue === q.id ? "all" : q.id)}
            title={q.hint}
            className={`rounded-2xl border p-4 text-left transition-all backdrop-blur-xl ${
              queue === q.id
                ? "border-purple-500/50 bg-purple-500/10"
                : "border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700"
            }`}
          >
            <p
              className={`font-mono text-2xl font-black ${
                q.id === "todo" && queueCounts.todo > 0 ? "text-amber-400" : "text-white"
              }`}
            >
              {loading ? "–" : queueCounts[q.id]}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">{q.label}</p>
          </button>
        ))}
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
          {sortBtn("recent", "Récentes", Clock)}
          {sortBtn("oldest", "Anciennes", History)}
          {sortBtn("popular", "Populaires", Flame)}
        </div>
      </div>

      {/* FILTRES STATUT */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Filter size={13} className="text-zinc-600 mr-1" />
        {statusFilters.map(({ id, label }) => (
          <button key={id} onClick={() => setFilter(id)} className={pill(filter === id)}>
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
          <p className="text-sm text-zinc-500">
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
