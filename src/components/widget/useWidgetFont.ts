"use client";

import { useEffect, useState } from "react";
import { resolveFont, ensureStylesheet, type ResolvedFont } from "@/lib/widget-fonts";

/**
 * Police d'un widget : charge la feuille Google Fonts si besoin et indique quand la police est prête.
 *
 * `ready` reste vrai pour les polices système. Pour une police Google, il passe à vrai quand la police est chargée, ou
 * au bout de 2 s si elle n'arrive pas (réseau lent) : le widget s'affiche alors avec la police de secours plutôt que de
 * rester invisible. Une fois prête une première fois, un changement de police ne cache plus le widget.
 */
export function useWidgetFont(fontId: string | undefined): { font: ResolvedFont; ready: boolean } {
  const font = resolveFont(fontId);
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    if (!font.href || !font.family) return;
    ensureStylesheet(`wf-${font.family}`, font.href);

    let cancelled = false;
    const timeout = new Promise((resolve) => setTimeout(resolve, 2000));
    Promise.race([document.fonts.load(`900 16px "${font.family}"`), timeout])
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadedOnce(true);
      });
    return () => {
      cancelled = true;
    };
  }, [font.href, font.family]);

  return { font, ready: !font.href || loadedOnce };
}
