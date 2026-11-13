"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight, Loader2, Search, type LucideIcon } from "lucide-react";

/**
 * Briques communes des pages du panneau admin : états (chargement, vide, accès refusé), recherche, filtres,
 * tuiles de chiffres et cartes de section. Chaque page les assemble au lieu de recopier le même balisage.
 * Même langage visuel que le dashboard utilisateur ; l'ambre reste le repère propre à l'administration.
 */

export const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

export const CARD = "rounded-2xl border border-white/10 bg-white/[0.02]";

export const INPUT =
  "w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60";

export const BTN_PRIMARY = `inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`;

export const BTN_SECONDARY = `inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`;

export const BTN_ICON = `inline-flex cursor-pointer items-center justify-center rounded-lg border border-white/10 p-2.5 text-zinc-400 transition-colors hover:border-white/25 hover:text-white ${FOCUS}`;

export const BTN_ICON_DANGER =
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-red-500/25 bg-red-500/10 p-2.5 text-red-300 transition-colors hover:bg-red-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300";

// Trait de couleur à gauche d'une ligne de ticket : l'état se lit sans lire le badge.
export const STATUS_RAIL: Record<string, string> = {
  en_attente: "border-l-amber-400/80",
  en_cours: "border-l-blue-400/80",
  resolu: "border-l-emerald-400/80",
  ferme: "border-l-zinc-600",
};

/** Ancienneté en français : « à l'instant », « il y a 5 min », « il y a 3 h », « il y a 2 j ». */
export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 60) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

/* ----------------------------------- États ----------------------------------- */

export function LoadingPanel({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" className={`${CARD} py-16 text-center`}>
      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-purple-400" aria-hidden="true" />
      <p className="text-sm text-zinc-400">{label}</p>
    </div>
  );
}

export function EmptyPanel({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-16 text-center">
      <Icon size={28} className="mx-auto mb-3 text-zinc-600" aria-hidden="true" />
      <p className="text-sm text-zinc-300">{children}</p>
    </div>
  );
}

/** Message bloquant (accès refusé, chargement impossible). */
export function NoticePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="alert" className="mx-auto mt-10 max-w-md rounded-2xl border border-red-500/25 bg-white/[0.02] p-8 text-center">
      <AlertTriangle className="mx-auto mb-3 text-red-400" size={32} aria-hidden="true" />
      <h2 className="mb-2 text-lg font-bold text-white">{title}</h2>
      <p className="text-sm text-zinc-400">{children}</p>
    </div>
  );
}

export function AccessDenied({ children = "Cette section est réservée au staff." }: { children?: React.ReactNode }) {
  return <NoticePanel title="Accès refusé">{children}</NoticePanel>;
}

/* ------------------------------- Recherche et filtres ------------------------------- */

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="relative flex-1">
      <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={`${INPUT} py-3 pl-10 pr-4`}
      />
    </div>
  );
}

export type FilterOption<T extends string> = { id: T; label: string; count?: number };

/** Puces de filtre : un seul choix actif à la fois. `tone="cyan"` distingue un second groupe de filtres. */
export function FilterPills<T extends string>({
  label,
  options,
  value,
  onChange,
  tone = "purple",
  small = false,
}: {
  label: string;
  options: FilterOption<T>[];
  value: T;
  onChange: (id: T) => void;
  tone?: "purple" | "cyan";
  small?: boolean;
}) {
  const active = tone === "purple" ? "border-purple-500/50 bg-purple-500/15 text-purple-200" : "border-cyan-500/50 bg-cyan-500/15 text-cyan-200";
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          aria-pressed={value === option.id}
          className={`cursor-pointer rounded-full border font-medium transition-colors ${FOCUS} ${
            small ? "px-3.5 py-1.5 text-sm" : "px-4 py-2 text-sm"
          } ${value === option.id ? active : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"}`}
        >
          {option.label}
          {option.count !== undefined && <span className="ml-1.5 tabular-nums opacity-70">{option.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------- Cartes ------------------------------------- */

/**
 * Tuile de chiffre. `attention` colore la tuile en ambre : à utiliser seulement quand il y a quelque chose à traiter.
 * Avec `href`, toute la tuile est un lien.
 */
export function StatTile({
  label,
  value,
  hint,
  href,
  attention = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  attention?: boolean;
}) {
  const classes = `block rounded-2xl border p-5 transition-colors ${
    attention ? "border-amber-400/30 bg-amber-400/[0.05]" : "border-white/10 bg-white/[0.02]"
  }`;
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-zinc-400">{label}</p>
        {href && (
          <ChevronRight
            size={16}
            aria-hidden="true"
            className="shrink-0 text-zinc-600 transition-all group-hover:translate-x-0.5 group-hover:text-zinc-300"
          />
        )}
      </div>
      <p className={`mt-1 font-display text-4xl font-extrabold tabular-nums ${attention ? "text-amber-300" : "text-white"}`}>{value}</p>
      {hint && <p className="mt-1.5 text-sm text-zinc-400">{hint}</p>}
    </>
  );

  if (!href) return <div className={classes}>{body}</div>;
  return (
    <Link
      href={href}
      className={`group ${classes} ${attention ? "hover:border-amber-400/50" : "hover:border-white/20"} ${FOCUS}`}
    >
      {body}
    </Link>
  );
}

/** Carte de section : titre (icône facultative), action à droite, contenu. `flush` retire les marges du contenu (listes). */
export function SectionCard({
  title,
  icon: Icon,
  action,
  flush = false,
  className = "",
  children,
}: {
  title: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`overflow-hidden ${CARD} ${className}`}>
      <div className={`flex items-center justify-between gap-3 px-5 py-4 ${flush ? "border-b border-white/10" : ""}`}>
        <h2 className="flex items-center gap-2.5 text-base font-semibold text-white">
          {Icon && <Icon size={16} aria-hidden="true" className="text-purple-300" />}
          {title}
        </h2>
        {action}
      </div>
      <div className={flush ? "" : "px-5 pb-5"}>{children}</div>
    </section>
  );
}
