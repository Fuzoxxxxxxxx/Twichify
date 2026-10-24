"use client";

import { useState, useEffect, useMemo, useRef, ComponentType } from "react";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  MessageSquarePlus,
  Music,
  Tv,
  Key,
  User as UserIcon,
  HelpCircle,
  X,
  LucideProps,
  Ticket,
  Rocket,
  Bot,
  MessageSquare,
  Radio,
  TrendingUp,
  Activity,
  ShieldCheck,
  Lightbulb,
} from "lucide-react";
import PublicShell from "@/components/site/PublicShell";
import PageIntro from "@/components/site/PageIntro";
import WelcomeModal from "@/components/WelcomeModal";
import Pagination, { usePagination } from "@/components/Pagination";
import { FAQ_CATEGORIES, faqCategoryDescription, faqCategoryOrder } from "@/lib/faq-categories";

interface FaqArticle {
  _id: string;
  question: string;
  answer: string;
  category: string;
}

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

// Icône par catégorie ; libellés, ordre et descriptions viennent de lib/faq-categories.ts.
const CATEGORY_ICONS: Record<string, ComponentType<LucideProps>> = {
  demarrage: Rocket,
  spotify: Music,
  bot: Bot,
  obs: Tv,
  chat: MessageSquare,
  twitch: Radio,
  stats: TrendingUp,
  statut: Activity,
  compte: UserIcon,
  securite: ShieldCheck,
  api: Key,
  communaute: Lightbulb,
  autre: HelpCircle,
};

const categoryMeta: Record<string, { label: string; icon: ComponentType<LucideProps> }> = Object.fromEntries(
  FAQ_CATEGORIES.map((c) => [c.key, { label: c.label, icon: CATEGORY_ICONS[c.key] ?? HelpCircle }])
);

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
            ? "mt-3 rounded-lg border border-purple-500/25 bg-purple-500/10 p-3 text-sm text-purple-100"
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
    const result = articles.filter((a) => {
      const matchesCategory = !activeCategory || a.category === activeCategory;
      const matchesQuery = !q || a.question.toLowerCase().includes(q) || a.answer.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
    // Regroupé par catégorie dans l'ordre d'affichage (tri stable : l'ordre propre à chaque catégorie est conservé).
    return result.sort((a, b) => faqCategoryOrder(a.category) - faqCategoryOrder(b.category));
  }, [articles, query, activeCategory]);

  const listRef = useRef<HTMLDivElement>(null);
  const { page, setPage, pageCount, pageItems } = usePagination(filtered, PAGE_SIZE, `${query}|${activeCategory}`);

  // Seules les catégories qui contiennent des articles sont proposées, dans l'ordre d'affichage, avec leur effectif.
  const categories = useMemo(() => {
    return Array.from(new Set(articles.map((a) => a.category))).sort(
      (a, b) => faqCategoryOrder(a) - faqCategoryOrder(b)
    );
  }, [articles]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of articles) map[a.category] = (map[a.category] || 0) + 1;
    return map;
  }, [articles]);

  const pillClass = (active: boolean) =>
    `flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${FOCUS} ${
      active
        ? "border-purple-500/50 bg-purple-500/15 text-purple-200"
        : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
    }`;

  return (
    <PublicShell>
      <PageIntro title="Comment pouvons-nous vous aider ?">
        Trouvez une réponse dans la FAQ, ou ouvrez un ticket pour échanger avec l'équipe.
      </PageIntro>

      {/* RECHERCHE */}
      <div className="relative mt-8">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une réponse (ex : Spotify, OBS, clés API...)"
          aria-label="Rechercher dans la FAQ"
          className="w-full rounded-xl border border-white/10 bg-white/[0.02] py-4 pl-12 pr-12 text-base text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Effacer la recherche"
            className={`absolute inset-y-0 right-2 my-auto flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:text-white ${FOCUS}`}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* FILTRES CATEGORIES */}
      {categories.length > 0 && (
        <div role="group" aria-label="Filtrer par catégorie" className="mt-5 flex flex-wrap items-center gap-2">
          <button onClick={() => setActiveCategory(null)} aria-pressed={!activeCategory} className={pillClass(!activeCategory)}>
            Tout afficher
          </button>
          {categories.map((cat) => {
            const meta = categoryMeta[cat] || categoryMeta.autre;
            const Icon = meta.icon;
            const isActive = activeCategory === cat;
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} aria-pressed={isActive} className={pillClass(isActive)}>
                <Icon size={14} />
                <span>{meta.label}</span>
                <span className="text-xs tabular-nums opacity-70">{counts[cat]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Description de la catégorie choisie */}
      {activeCategory && <p className="mt-3 text-sm text-zinc-400">{faqCategoryDescription(activeCategory)}</p>}

      {/* GUIDE DE BIENVENUE */}
      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-purple-500/30 bg-purple-500/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-purple-300">
            <Rocket size={18} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">Guide de bienvenue</h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              Les étapes essentielles pour afficher votre musique et votre chat dans OBS : Spotify, widgets, OBS et bot.
              À revoir autant de fois que nécessaire.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowWelcome(true)}
          className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500 ${FOCUS}`}
        >
          Revoir le guide
        </button>
      </div>

      {/* LISTE FAQ */}
      <div ref={listRef} className="mt-10 scroll-mt-24">
        {loading ? (
          <div className="py-12 text-center" aria-busy="true">
            <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            <p className="text-sm text-zinc-400">Chargement des données...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
            <HelpCircle className="mx-auto mb-2 text-zinc-600" size={26} />
            <p className="text-sm font-semibold text-zinc-200">Aucune réponse trouvée</p>
            <p className="mt-1 text-sm text-zinc-400">Ajustez vos termes de recherche ou réinitialisez la catégorie.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {pageItems.map((article) => {
              const isOpen = openId === article._id;
              const meta = categoryMeta[article.category] || categoryMeta.autre;
              const Icon = meta.icon;
              const panelId = `faq-${article._id}`;

              return (
                <li key={article._id}>
                  <button
                    onClick={() => setOpenId(isOpen ? null : article._id)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className={`flex w-full cursor-pointer items-start justify-between gap-4 py-5 text-left transition-colors hover:bg-white/[0.02] ${FOCUS}`}
                  >
                    <span className="flex min-w-0 items-start gap-3">
                      <Icon size={16} className={`mt-1 shrink-0 ${isOpen ? "text-purple-300" : "text-zinc-500"}`} aria-hidden="true" />
                      <span className="text-base font-semibold leading-snug text-zinc-100">{article.question}</span>
                    </span>
                    <ChevronDown
                      size={18}
                      aria-hidden="true"
                      className={`mt-0.5 shrink-0 transition-transform ${isOpen ? "rotate-180 text-purple-300" : "text-zinc-500"}`}
                    />
                  </button>

                  {isOpen && (
                    <div id={panelId} className="pb-6 pl-7 pr-8 text-[15px] text-zinc-300">
                      {renderFormattedAnswer(article.answer)}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <Pagination page={page} pageCount={pageCount} onPageChange={setPage} scrollToRef={listRef} className="pt-6" />
      </div>

      {/* SUPPORT */}
      <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold tracking-tight text-white">Vous ne trouvez pas votre réponse ?</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
          Notre équipe de support est là pour résoudre vos demandes spécifiques.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/support/new"
            className={`inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500 ${FOCUS}`}
          >
            <MessageSquarePlus size={16} />
            Ouvrir un ticket
          </Link>

          <Link
            href="/support/my-tickets"
            className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:text-white ${FOCUS}`}
          >
            <Ticket size={16} />
            Mes tickets
          </Link>
        </div>
      </section>

      <WelcomeModal isOpen={showWelcome} onFinish={() => setShowWelcome(false)} />
    </PublicShell>
  );
}
