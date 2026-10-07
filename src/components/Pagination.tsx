"use client";

import { useCallback, useMemo, useState, type RefObject } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Pagination côté client d'une liste déjà chargée.
 *
 * `resetKey` : dès qu'il change (filtre, recherche, tri...), on revient automatiquement à la page 1,
 * sans avoir à réinitialiser la page à la main dans chaque handler. La page est aussi bornée si la
 * liste raccourcit (ex. une idée supprimée) : on ne reste jamais sur une page vide.
 */
export function usePagination<T>(items: T[], pageSize: number, resetKey: string = "") {
  const [state, setState] = useState({ key: resetKey, page: 1 });

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const requested = state.key === resetKey ? state.page : 1;
  const page = Math.min(Math.max(1, requested), pageCount);

  const setPage = useCallback((next: number) => setState({ key: resetKey, page: next }), [resetKey]);
  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize]
  );

  return { page, setPage, pageCount, pageItems, offset: (page - 1) * pageSize, total: items.length };
}

type PaginationProps = {
  /** Page courante (à partir de 1). */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Élément vers lequel remonter en douceur après un changement de page (le haut de la liste). */
  scrollToRef?: RefObject<HTMLElement | null>;
  className?: string;
};

// Première et dernière page, page courante et ses voisines, avec des « … » entre les trous.
function getPageItems(page: number, pageCount: number): (number | "gap")[] {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1]);
  const pages = [...wanted].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);

  const items: (number | "gap")[] = [];
  let previous = 0;
  for (const n of pages) {
    if (n - previous > 1) items.push("gap");
    items.push(n);
    previous = n;
  }
  return items;
}

const BUTTON_BASE =
  "flex h-9 min-w-9 items-center justify-center rounded-xl border px-3 text-[11px] font-bold transition-all";
const BUTTON_IDLE = "border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200";
const BUTTON_ARROW =
  "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-zinc-800 disabled:hover:text-zinc-400";

export default function Pagination({ page, pageCount, onPageChange, scrollToRef, className = "" }: PaginationProps) {
  if (pageCount <= 1) return null;

  const go = (next: number) => {
    const target = Math.min(Math.max(1, next), pageCount);
    if (target === page) return;
    onPageChange(target);
    scrollToRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav aria-label="Pagination" className={`flex flex-col items-center gap-2.5 ${className}`}>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page === 1}
          aria-label="Page précédente"
          className={`${BUTTON_BASE} ${BUTTON_ARROW}`}
        >
          <ChevronLeft size={14} />
        </button>

        {getPageItems(page, pageCount).map((item, i) =>
          item === "gap" ? (
            <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-xs text-zinc-600">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => go(item)}
              aria-label={`Page ${item}`}
              aria-current={item === page ? "page" : undefined}
              className={`${BUTTON_BASE} ${
                item === page ? "border-purple-500 bg-purple-500/15 text-purple-300" : BUTTON_IDLE
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page === pageCount}
          aria-label="Page suivante"
          className={`${BUTTON_BASE} ${BUTTON_ARROW}`}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
        Page {page} sur {pageCount}
      </p>
    </nav>
  );
}
