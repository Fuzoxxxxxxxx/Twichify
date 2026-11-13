"use client";

import { useEffect, useState } from "react";

// Sommaire d'un texte juridique long : groupé par partie, avec la section en cours de lecture mise en évidence.
// Grand écran : colonne collante. Petit écran : une rangée de pastilles défilante.

export type TocGroup = {
  label: string;
  items: { id: string; num: number; short: string }[];
};

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

export default function LegalToc({ groups }: { groups: TocGroup[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const ids = groups.flatMap((g) => g.items.map((i) => i.id));
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (!elements.length || typeof IntersectionObserver === "undefined") return;

    // Sections actuellement dans la bande haute de l'écran ; la première dans l'ordre du document est la section active.
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = ids.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      { rootMargin: "-96px 0px -60% 0px" }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [groups]);

  const all = groups.flatMap((g) => g.items);

  return (
    <nav aria-label="Sommaire" className="print:hidden lg:sticky lg:top-24">
      <p className="mb-4 hidden text-sm font-semibold text-zinc-200 lg:block">Sommaire</p>

      {/* Grand écran : liste groupée par partie */}
      <div className="hidden space-y-6 lg:block">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-xs font-medium leading-snug text-zinc-400">{group.label}</p>
            <ol className="border-l border-white/10">
              {group.items.map((item) => {
                const isActive = active === item.id;
                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      aria-current={isActive ? "location" : undefined}
                      className={`-ml-px flex items-center gap-2.5 border-l-2 py-1.5 pl-3 pr-2 text-sm transition-colors ${FOCUS} ${
                        isActive ? "border-purple-400 text-white" : "border-transparent text-zinc-400 hover:text-white"
                      }`}
                    >
                      <span className="text-xs tabular-nums text-purple-300">{item.num}</span>
                      {item.short}
                    </a>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>

      {/* Petit écran : pastilles */}
      <ol className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
        {all.map((item) => (
          <li key={item.id} className="shrink-0">
            <a
              href={`#${item.id}`}
              className={`flex items-center gap-2 whitespace-nowrap rounded-full border border-white/10 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-purple-500/40 hover:text-white ${FOCUS}`}
            >
              <span className="text-xs tabular-nums text-purple-300">{item.num}</span>
              {item.short}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
