"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  ALL_FONTS,
  FONT_CATEGORY_LABELS,
  GOOGLE_FONTS,
  ensureStylesheet,
  findFont,
  googleFontsUrl,
  resolveFont,
  type FontCategory,
  type FontOption,
} from "@/lib/widget-fonts";

// Sélecteur de police : remplace le <select> natif, dont la liste s'ouvrait sur un fond blanc avec du texte blanc
// (illisible tant qu'on ne survolait pas l'option). Ici la liste a son propre fond sombre et chaque police est
// affichée dans sa propre typographie.

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

/** Classe et style qui appliquent la police à un élément (classe Tailwind pour le système, font-family pour Google). */
function fontProps(font: FontOption): { className: string; style: CSSProperties } {
  const r = resolveFont(font.id);
  return { className: r.className, style: r.fontFamily ? { fontFamily: r.fontFamily } : {} };
}

export default function FontPicker({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (fontId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Polices regroupées par catégorie ; `start` = rang de la première police du groupe dans la liste à plat.
  const { groups, flat } = useMemo(() => {
    const categories = (Object.keys(FONT_CATEGORY_LABELS) as (FontCategory | "all")[]).filter(
      (c): c is FontCategory => c !== "all"
    );
    let start = 0;
    const built = categories
      .map((category) => ({ category, fonts: ALL_FONTS.filter((f) => f.category === category) }))
      .filter((g) => g.fonts.length > 0)
      .map((g) => {
        const group = { ...g, start };
        start += g.fonts.length;
        return group;
      });
    return { groups: built, flat: built.flatMap((g) => g.fonts) };
  }, []);

  const selected = findFont(value) ?? flat[0];
  const optionId = (index: number) => `${listId}-opt-${index}`;

  const openList = () => {
    // Toutes les polices Google sont chargées en une seule feuille de style, à la première ouverture.
    ensureStylesheet("wf-picker-all", googleFontsUrl(GOOGLE_FONTS));
    setActive(Math.max(0, flat.findIndex((f) => f.id === selected.id)));
    setOpen(true);
  };

  const choose = (font: FontOption) => {
    onChange(font.id);
    setOpen(false);
  };

  // Fermeture au clic en dehors de la liste.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // L'option active reste visible quand on navigue au clavier.
  useEffect(() => {
    if (open) document.getElementById(`${listId}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(flat.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(flat.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(flat[active]);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const selectedProps = fontProps(selected);

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(active) : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 text-left text-base text-white transition-colors hover:border-white/20 ${FOCUS}`}
      >
        <span className={`truncate ${selectedProps.className}`} style={selectedProps.style}>
          {selected.label}
        </span>
        <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Police"
          className="absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950 p-1.5 shadow-2xl shadow-black/60"
        >
          {groups.map((group) => (
            <li key={group.category} role="presentation">
              <p className="px-3 pb-1 pt-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {FONT_CATEGORY_LABELS[group.category]}
              </p>
              <ul role="group" aria-label={FONT_CATEGORY_LABELS[group.category]}>
                {group.fonts.map((font, offset) => {
                  const index = group.start + offset;
                  const isSelected = font.id === selected.id;
                  const props = fontProps(font);
                  return (
                    <li
                      key={font.id}
                      id={optionId(index)}
                      role="option"
                      aria-selected={isSelected}
                      // mouseDown : le bouton garde le focus (sinon la navigation au clavier se perdrait).
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(font)}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-base ${props.className} ${
                        index === active ? "bg-white/10 text-white" : "text-zinc-200"
                      }`}
                      style={props.style}
                    >
                      <span className="truncate">{font.label}</span>
                      {isSelected && <Check size={15} aria-hidden="true" className="shrink-0 text-purple-300" />}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
