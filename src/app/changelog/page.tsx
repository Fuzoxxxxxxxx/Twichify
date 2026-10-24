"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Wrench, Bug, Search, Rss } from "lucide-react";
import { CHANGELOG, ChangeType } from "@/lib/changelog";
import PublicShell from "@/components/site/PublicShell";
import PageIntro from "@/components/site/PageIntro";
import Pagination, { usePagination } from "@/components/Pagination";

const TYPE_META: Record<ChangeType, { label: string; color: string; icon: any; number: string }> = {
  new: { label: "Nouveau", color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30", icon: Sparkles, number: "text-emerald-400" },
  improved: { label: "Amélioré", color: "text-blue-300 bg-blue-500/10 border-blue-500/30", icon: Wrench, number: "text-blue-400" },
  fixed: { label: "Corrigé", color: "text-amber-300 bg-amber-500/10 border-amber-500/30", icon: Bug, number: "text-amber-400" },
};

const TYPE_FILTERS: { id: "tous" | ChangeType; label: string }[] = [
  { id: "tous", label: "Tous" },
  { id: "new", label: "Nouveau" },
  { id: "improved", label: "Amélioré" },
  { id: "fixed", label: "Corrigé" },
];

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

// Nombre de versions affichées par page.
const PAGE_SIZE = 5;

export default function ChangelogPage() {
  const [typeFilter, setTypeFilter] = useState<"tous" | ChangeType>("tous");
  const [search, setSearch] = useState("");

  const stats = useMemo(() => {
    const counts: Record<ChangeType, number> = { new: 0, improved: 0, fixed: 0 };
    for (const entry of CHANGELOG) {
      for (const c of entry.changes) counts[c.type]++;
    }
    return { versions: CHANGELOG.length, ...counts };
  }, []);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CHANGELOG.map((entry) => {
      const changes = entry.changes.filter((c) => {
        const matchesType = typeFilter === "tous" || c.type === typeFilter;
        const matchesSearch = !q || c.text.toLowerCase().includes(q) || entry.title.toLowerCase().includes(q);
        return matchesType && matchesSearch;
      });
      return { ...entry, changes };
    }).filter((entry) => entry.changes.length > 0);
  }, [typeFilter, search]);

  const listRef = useRef<HTMLDivElement>(null);
  const { page, setPage, pageCount, pageItems } = usePagination(filteredEntries, PAGE_SIZE, `${typeFilter}|${search}`);

  // Un lien direct (#v3.2.1) ouvre la page qui contient cette version, puis y défile.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const index = CHANGELOG.findIndex((entry) => `v${entry.version}` === hash);
    if (index === -1) return;
    setPage(Math.floor(index / PAGE_SIZE) + 1);
    setTimeout(() => document.getElementById(hash)?.scrollIntoView(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = [
    { label: "Versions", value: stats.versions, color: "text-white" },
    { label: "Nouveautés", value: stats.new, color: TYPE_META.new.number },
    { label: "Améliorations", value: stats.improved, color: TYPE_META.improved.number },
    { label: "Corrections", value: stats.fixed, color: TYPE_META.fixed.number },
  ];

  return (
    <PublicShell>
      <PageIntro title="Journal des mises à jour">Tout ce qui a changé sur Twichify, version après version.</PageIntro>

      {/* Totaux : de simples chiffres, pas de cartes */}
      <dl className="grid grid-cols-2 gap-6 border-b border-white/10 py-8 sm:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label}>
            <dd className={`font-display text-3xl font-extrabold tabular-nums ${item.color}`}>{item.value}</dd>
            <dt className="mt-1 text-sm text-zinc-400">{item.label}</dt>
          </div>
        ))}
      </dl>

      {/* RECHERCHE + FILTRES */}
      <div className="space-y-4 py-8">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher dans le journal..."
            aria-label="Rechercher dans le journal"
            className="w-full rounded-lg border border-white/10 bg-white/[0.02] py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
          />
        </div>

        <div role="group" aria-label="Filtrer par type de changement" className="flex flex-wrap items-center gap-2">
          {TYPE_FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTypeFilter(id)}
              aria-pressed={typeFilter === id}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${FOCUS} ${
                typeFilter === id
                  ? "border-purple-500/50 bg-purple-500/15 text-purple-200"
                  : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* TIMELINE */}
      {filteredEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-16 text-center">
          <Rss size={28} className="mx-auto mb-3 text-zinc-600" />
          <p className="text-sm text-zinc-300">Aucun changement ne correspond à ces filtres.</p>
        </div>
      ) : (
        <div ref={listRef} className="relative scroll-mt-24 pl-8">
          <div aria-hidden="true" className="absolute bottom-2 left-[9px] top-2 w-px bg-white/10" />

          <ol className="space-y-12">
            {pageItems.map((entry) => {
              const isLatest = entry.version === CHANGELOG[0].version;
              return (
                <li key={entry.version} id={`v${entry.version}`} className="relative scroll-mt-24">
                  <span
                    aria-hidden="true"
                    className={`absolute -left-8 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 ${
                      isLatest ? "border-purple-400 bg-purple-500/20" : "border-zinc-700 bg-black"
                    }`}
                  >
                    {isLatest && <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />}
                  </span>

                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={`#v${entry.version}`}
                      className={`rounded-full border px-3 py-1 text-sm font-semibold tabular-nums transition-colors ${FOCUS} ${
                        isLatest
                          ? "border-purple-500/40 bg-purple-500/10 text-purple-200"
                          : "border-white/10 text-zinc-300 hover:border-white/20"
                      }`}
                    >
                      v{entry.version}
                    </a>
                    {isLatest && <span className="text-sm font-medium text-emerald-400">Dernière version</span>}
                    <span className="text-sm text-zinc-400 sm:ml-auto">{entry.date}</span>
                  </div>

                  <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-white">{entry.title}</h2>

                  <ul className="mt-4 space-y-3">
                    {entry.changes.map((c, i) => {
                      const meta = TYPE_META[c.type];
                      const Icon = meta.icon;
                      return (
                        <li key={i} className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex w-[104px] shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${meta.color}`}
                          >
                            <Icon size={12} aria-hidden="true" />
                            {meta.label}
                          </span>
                          <p className="text-[15px] leading-relaxed text-zinc-300">{c.text}</p>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>

          {page === pageCount && (
            <div className="relative mt-12">
              <span
                aria-hidden="true"
                className="absolute -left-8 top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-zinc-800 bg-black"
              >
                <span className="h-1 w-1 rounded-full bg-zinc-700" />
              </span>
              <p className="text-sm text-zinc-400">Début de l'aventure Twichify.</p>
            </div>
          )}
        </div>
      )}

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} scrollToRef={listRef} className="mt-10" />
    </PublicShell>
  );
}
