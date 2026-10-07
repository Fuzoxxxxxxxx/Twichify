"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Music, Sparkles, Wrench, Bug, History, Search, Filter, Rss } from "lucide-react";
import { CHANGELOG, ChangeType } from "@/lib/changelog";
import SiteHeader from "@/components/SiteHeader";
import Pagination, { usePagination } from "@/components/Pagination";

const TYPE_META: Record<ChangeType, { label: string; color: string; icon: any; dot: string }> = {
  new: { label: "Nouveau", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", icon: Sparkles, dot: "bg-emerald-400" },
  improved: { label: "Amélioré", color: "text-blue-400 bg-blue-500/10 border-blue-500/30", icon: Wrench, dot: "bg-blue-400" },
  fixed: { label: "Corrigé", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", icon: Bug, dot: "bg-amber-400" },
};

const TYPE_FILTERS: { id: "tous" | ChangeType; label: string }[] = [
  { id: "tous", label: "Tous" },
  { id: "new", label: "Nouveau" },
  { id: "improved", label: "Amélioré" },
  { id: "fixed", label: "Corrigé" },
];

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

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 relative flex flex-col justify-between overflow-x-clip">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[520px] bg-gradient-to-tr from-purple-600/25 via-indigo-500/15 to-emerald-500/15 blur-[170px] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e15_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />

      <div>
        <SiteHeader />

        <div className="max-w-3xl mx-auto px-6 pt-8 pb-20">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-purple-400 transition-colors mb-6 group w-fit"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
            <span>Accueil</span>
          </Link>

          {/* HERO */}
          <div className="relative overflow-hidden rounded-3xl border border-purple-500/25 bg-zinc-950/70 backdrop-blur-xl p-6 sm:p-8 mb-6 shadow-[0_0_50px_rgba(147,51,234,0.08)]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-[90px] pointer-events-none rounded-full" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 text-purple-400 mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
                  <History size={15} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Changelog</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white">
                Journal des mises à jour
              </h1>
              <p className="text-zinc-400 text-sm mt-2.5 max-w-lg leading-relaxed">
                Tout ce qui a changé sur Twichify, version après version.
              </p>

              {/* STATS */}
              <div className="relative grid grid-cols-4 gap-3 sm:gap-6 mt-6 pt-5 border-t border-zinc-800/70">
                <div>
                  <p className="font-mono font-black text-white text-lg sm:text-2xl">{stats.versions}</p>
                  <p className="text-zinc-500 text-[10px] sm:text-xs mt-0.5">Versions</p>
                </div>
                <div>
                  <p className="font-mono font-black text-emerald-400 text-lg sm:text-2xl">{stats.new}</p>
                  <p className="text-zinc-500 text-[10px] sm:text-xs mt-0.5">Nouveautés</p>
                </div>
                <div>
                  <p className="font-mono font-black text-blue-400 text-lg sm:text-2xl">{stats.improved}</p>
                  <p className="text-zinc-500 text-[10px] sm:text-xs mt-0.5">Améliorations</p>
                </div>
                <div>
                  <p className="font-mono font-black text-amber-400 text-lg sm:text-2xl">{stats.fixed}</p>
                  <p className="text-zinc-500 text-[10px] sm:text-xs mt-0.5">Corrections</p>
                </div>
              </div>
            </div>
          </div>

          {/* RECHERCHE + FILTRES */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl p-4 sm:p-5 space-y-3.5 mb-10">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher dans le journal..."
                className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/50 pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter size={13} className="text-zinc-600 mr-1" />
              {TYPE_FILTERS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setTypeFilter(id)}
                  className={`rounded-full px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-all ${
                    typeFilter === id
                      ? "border-purple-500 bg-purple-500/15 text-purple-300"
                      : "border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* TIMELINE */}
          {filteredEntries.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-zinc-800/80 bg-zinc-950/40">
              <Rss size={28} className="mx-auto text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">Aucun changement ne correspond à ces filtres.</p>
            </div>
          ) : (
            <div ref={listRef} className="relative pl-8 scroll-mt-24">
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-purple-500/50 via-zinc-800 to-transparent" />

              <div className="space-y-10">
                {pageItems.map((entry) => {
                  const isLatest = entry.version === CHANGELOG[0].version;
                  return (
                    <div key={entry.version} id={`v${entry.version}`} className="relative scroll-mt-24">
                      <div
                        className={`absolute -left-8 top-1.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${
                          isLatest ? "border-purple-400 bg-purple-500/20" : "border-zinc-700 bg-zinc-950"
                        }`}
                      >
                        {isLatest && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />}
                      </div>

                      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl p-5 sm:p-6 hover:border-purple-500/30 transition-all">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <a
                            href={`#v${entry.version}`}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all ${
                              isLatest
                                ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
                                : "border-zinc-800 bg-zinc-900/60 text-zinc-500"
                            }`}
                          >
                            v{entry.version}
                          </a>
                          {isLatest && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                              Dernière version
                            </span>
                          )}
                          <span className="text-[11px] text-zinc-600 ml-auto">{entry.date}</span>
                        </div>

                        <h2 className="text-lg font-bold text-white mb-3">{entry.title}</h2>

                        <ul className="space-y-2">
                          {entry.changes.map((c, i) => {
                            const meta = TYPE_META[c.type];
                            const Icon = meta.icon;
                            return (
                              <li key={i} className="flex items-start gap-2.5">
                                <span
                                  className={`mt-0.5 flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide shrink-0 ${meta.color}`}
                                >
                                  <Icon size={10} />
                                  {meta.label}
                                </span>
                                <p className="text-[13px] text-zinc-400 leading-relaxed">{c.text}</p>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>

              {page === pageCount && (
                <div className="relative pl-0 mt-2">
                  <div className="absolute -left-8 top-0 w-[18px] h-[18px] rounded-full border-2 border-zinc-800 bg-zinc-950 flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-zinc-700" />
                  </div>
                  <p className="text-[11px] text-zinc-600 italic">Début de l'aventure Twichify.</p>
                </div>
              )}
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
