"use client";

import { useMemo, useState } from "react";
import { ChevronDown, FileText, Search } from "lucide-react";
import { TEMPLATE_CATEGORY_LABELS, type ReplyTemplate } from "@/lib/reply-templates";

interface Props {
  templates: ReplyTemplate[];
  /** Catégories mises en avant (ex. celle du ticket) : elles forment l'onglet « Suggérés ». */
  suggestedCategories?: string[];
  onPick: (template: ReplyTemplate) => void;
}

// Aperçu : première phrase du corps, sans formule d'appel.
const preview = (t: ReplyTemplate) =>
  t.text
    .replace(/^Bonjour \{pseudo\},\n\n/, "")
    .split("\n\n")[0]
    .replace(/\n/g, " ")
    .slice(0, 120);

/**
 * Sélecteur de réponses pré-rédigées (tickets, idées). Il ne fait qu'insérer le texte : l'agent le relit,
 * l'adapte, puis l'envoie lui-même.
 */
export default function ReplyTemplatePicker({ templates, suggestedCategories = [], onPick }: Props) {
  const hasSuggestions = suggestedCategories.length > 0;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<string>(hasSuggestions ? "suggested" : "all");

  const categories = useMemo(() => Array.from(new Set(templates.map((t) => t.category))), [templates]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      const inTab =
        tab === "all" || (tab === "suggested" ? suggestedCategories.includes(t.category) : t.category === tab);
      return inTab && (!q || t.label.toLowerCase().includes(q) || t.text.toLowerCase().includes(q));
    });
  }, [templates, tab, query, suggestedCategories]);

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest border transition-all ${
      active
        ? "border-purple-500 bg-purple-500/15 text-purple-300"
        : "border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:text-zinc-300"
    }`;

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-[11px] font-bold text-zinc-300 transition-all hover:border-purple-500/40 hover:text-white"
      >
        <FileText size={12} className="text-purple-400" />
        Modèles de réponse
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-2 space-y-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/90 p-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un modèle..."
              className="w-full rounded-lg border border-zinc-800/80 bg-zinc-900/40 py-2 pl-8 pr-3 text-xs text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/50"
            />
          </div>

          {(hasSuggestions || categories.length > 1) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {hasSuggestions && (
                <button type="button" onClick={() => setTab("suggested")} className={chip(tab === "suggested")}>
                  Suggérés
                </button>
              )}
              <button type="button" onClick={() => setTab("all")} className={chip(tab === "all")}>
                Tous
              </button>
              {categories.length > 1 &&
                categories.map((c) => (
                  <button key={c} type="button" onClick={() => setTab(c)} className={chip(tab === c)}>
                    {TEMPLATE_CATEGORY_LABELS[c] ?? c}
                  </button>
                ))}
            </div>
          )}

          <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {visible.length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-500">Aucun modèle ne correspond.</p>
            ) : (
              visible.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onPick(t);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="block w-full rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2 text-left transition-all hover:border-purple-500/40 hover:bg-zinc-900/80"
                >
                  <span className="block text-xs font-bold text-white">{t.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-zinc-500">{preview(t)}…</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
