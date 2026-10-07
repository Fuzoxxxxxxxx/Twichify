"use client";

import { useState, useEffect, useMemo, useRef, ComponentType } from "react";
import Link from "next/link";
import { 
  Search, 
  ChevronDown, 
  LifeBuoy, 
  MessageSquarePlus, 
  Music, 
  Tv, 
  Key, 
  User as UserIcon, 
  HelpCircle,
  X,
  Sparkles,
  LucideProps,
  Ticket,
  Rocket,
  ArrowRight,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import WelcomeModal from "@/components/WelcomeModal";
import Pagination, { usePagination } from "@/components/Pagination";

interface FaqArticle {
  _id: string;
  question: string;
  answer: string;
  category: string;
}

const categoryMeta: Record<string, { label: string; icon: ComponentType<LucideProps> }> = {
  spotify: { label: "Spotify", icon: Music },
  obs: { label: "OBS", icon: Tv },
  api: { label: "API", icon: Key },
  compte: { label: "Compte", icon: UserIcon },
  autre: { label: "Autre", icon: HelpCircle },
};

// Nombre d'articles de FAQ affichés par page.
const PAGE_SIZE = 8;

/**
 * Fonction utilitaire pour traiter le texte de la réponse :
 * - Gestion du gras avec **texte**
 * - Mise en valeur des lignes "Note :"
 */
function renderFormattedAnswer(text: string) {
  return text.split("\n").map((line, lineIndex) => {
    // Traitement du gras via des regex simples
    const parts = line.split(/(\*\*.*?\*\*)/g);
    
    const formattedLine = parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-zinc-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    const isNote = line.trim().toLowerCase().startsWith("note");

    return (
      <p
        key={lineIndex}
        className={`leading-relaxed ${
          isNote
            ? "mt-2.5 p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-200 text-[11px]"
            : "mb-2 last:mb-0"
        }`}
      >
        {formattedLine}
      </p>
    );
  });
}

export default function HelpPage() {
  const [articles, setArticles] = useState<FaqArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    fetch("/api/faq")
      .then((r) => r.json())
      .then((data) => setArticles(data.articles || []))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      const matchesCategory = !activeCategory || a.category === activeCategory;
      const matchesQuery =
        !q ||
        a.question.toLowerCase().includes(q) ||
        a.answer.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [articles, query, activeCategory]);

  const listRef = useRef<HTMLDivElement>(null);
  const { page, setPage, pageCount, pageItems } = usePagination(filtered, PAGE_SIZE, `${query}|${activeCategory}`);

  const categories = useMemo(() => {
    return Array.from(new Set(articles.map((a) => a.category)));
  }, [articles]);

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 relative flex flex-col justify-between overflow-x-clip">
      {/* Halo de fond */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[520px] bg-gradient-to-tr from-purple-600/25 via-indigo-500/15 to-emerald-500/15 blur-[170px] pointer-events-none -z-10" />

      {/* Grille de fond */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e15_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />

      <div>
        {/* HEADER */}
        <SiteHeader />

        {/* CONTENEUR PRINCIPAL */}
        <div className="max-w-2xl mx-auto px-6 pt-8 pb-12">
          
          {/* HERO */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800/80 text-zinc-300 text-xs mb-6 backdrop-blur-md shadow-inner">
              <LifeBuoy size={14} className="text-purple-400" />
              <span className="font-semibold text-zinc-300">Centre d'aide</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-4 bg-gradient-to-b from-white via-zinc-100 to-zinc-500 bg-clip-text text-transparent leading-tight">
              Comment pouvons-nous <br />
              <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent">
                vous aider aujourd'hui ?
              </span>
            </h1>

            <p className="text-zinc-400 text-sm sm:text-base max-w-lg mx-auto mb-8 leading-relaxed font-normal">
              Trouvez des réponses instantanées dans la FAQ ou ouvrez un ticket d'assistance avec notre équipe.
            </p>
          </div>

          {/* BARRE DE RECHERCHE */}
          <div className="relative w-full mb-8">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une réponse (ex: Spotify, OBS, Clés API...)"
              className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-950/60 pl-11 pr-10 py-3.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/50 backdrop-blur-md transition-all shadow-inner"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* FILTRES CATEGORIES */}
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              <button
                onClick={() => setActiveCategory(null)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold border transition-all duration-200 ${
                  !activeCategory
                    ? "bg-purple-600/20 border-purple-500/50 text-purple-300 shadow-sm"
                    : "bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700"
                }`}
              >
                Tout afficher
              </button>
              {categories.map((cat) => {
                const meta = categoryMeta[cat] || categoryMeta.autre;
                const Icon = meta.icon;
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold border transition-all duration-200 ${
                      isActive
                        ? "bg-purple-600/20 border-purple-500/50 text-purple-300 shadow-sm"
                        : "bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700"
                    }`}
                  >
                    <Icon size={14} />
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* GUIDE DE BIENVENUE */}
          <div className="relative mb-8 overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/30 via-zinc-950/80 to-indigo-950/20 p-5 backdrop-blur-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-purple-500/25 bg-purple-500/10 text-purple-300">
                  <Rocket size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-white">Guide de bienvenue</h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                    Les étapes essentielles pour afficher votre musique et votre chat dans OBS : Spotify, widgets, OBS et bot.
                    À revoir autant de fois que nécessaire.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowWelcome(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-purple-600/20 transition-all duration-300 hover:bg-right hover:scale-[1.02] active:scale-95"
              >
                <span>Revoir le guide</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* LISTE FAQ AMÉLIORÉE */}
          <div ref={listRef} className="space-y-3 mb-8 scroll-mt-24">
            {loading ? (
              <div className="py-10 text-center">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-zinc-500 text-[11px]">Chargement des données...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-6 text-center backdrop-blur-sm">
                <HelpCircle className="mx-auto text-zinc-600 mb-2" size={24} />
                <p className="text-zinc-300 font-bold text-xs mb-0.5">Aucune réponse trouvée</p>
                <p className="text-zinc-500 text-[11px]">
                  Ajustez vos termes de recherche ou réinitialisez la catégorie.
                </p>
              </div>
            ) : (
              pageItems.map((article) => {
                const isOpen = openId === article._id;
                const meta = categoryMeta[article.category] || categoryMeta.autre;
                const Icon = meta.icon;

                return (
                  <div
                    key={article._id}
                    className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                      isOpen
                        ? "border-purple-500/40 bg-zinc-900/80 shadow-lg shadow-purple-950/20 backdrop-blur-xl"
                        : "border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/40 backdrop-blur-md"
                    }`}
                  >
                    <button
                      onClick={() => setOpenId(isOpen ? null : article._id)}
                      className="flex w-full items-start justify-between gap-4 p-4 text-left transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 rounded-xl border shrink-0 transition-colors mt-0.5 ${
                          isOpen
                            ? "bg-purple-500/20 border-purple-500/30 text-purple-300"
                            : "bg-zinc-900 border-zinc-800/80 text-zinc-400"
                        }`}>
                          <Icon size={15} />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-zinc-100 leading-snug pt-0.5">
                          {article.question}
                        </span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-zinc-500 transition-transform duration-300 mt-1 ${
                          isOpen ? "rotate-180 text-purple-400" : ""
                        }`}
                      />
                    </button>

                    {/* BLOC RÉPONSE */}
                    {isOpen && (
                      <div className="px-5 pb-4 pt-2 border-t border-zinc-800/60 mx-4 text-xs sm:text-[13px] text-zinc-300 font-normal">
                        {renderFormattedAnswer(article.answer)}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            <Pagination page={page} pageCount={pageCount} onPageChange={setPage} scrollToRef={listRef} className="pt-3" />
          </div>

<div className="relative rounded-2xl border border-purple-500/30 bg-zinc-950/80 p-6 text-center shadow-lg shadow-purple-950/20 backdrop-blur-xl overflow-hidden">
  <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/10 blur-[60px] pointer-events-none rounded-full" />
  
  <div className="relative z-10">
    <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto mb-2.5 shadow-inner">
      <Sparkles size={16} />
    </div>

    <h3 className="text-sm font-extrabold text-white mb-1">
      Vous ne trouvez pas votre réponse ?
    </h3>
    <p className="text-zinc-400 text-xs max-w-xs mx-auto mb-4 leading-relaxed">
      Notre équipe de support est là pour résoudre vos demandes spécifiques.
    </p>

    <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
      <Link
        href="/support/new"
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] hover:bg-right text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-md shadow-purple-600/20"
      >
        <MessageSquarePlus size={14} />
        <span>Ouvrir un ticket</span>
      </Link>

      <Link
        href="/support/my-tickets"
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 hover:scale-[1.02] active:scale-95"
      >
        <Ticket size={14} />
        <span>Mes tickets</span>
      </Link>
    </div>
  </div>
</div>

        </div>
      </div>

      {/* FOOTER */}
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

      <WelcomeModal isOpen={showWelcome} onFinish={() => setShowWelcome(false)} />
    </main>
  );
}