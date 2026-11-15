"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Music, MoreHorizontal, X, type LucideIcon } from "lucide-react";

// Navigation commune au dashboard utilisateur et au panneau admin : même structure, mêmes états,
// pour que les deux espaces se comportent à l'identique. Chaque shell fournit ses propres groupes de liens.

export type NavItem = {
  href: string;
  label: string;
  /** Libellé court de la barre mobile. */
  short?: string;
  icon: LucideIcon;
  /** Actif seulement si l'URL est exactement `href` (sinon : dès qu'elle commence par `href`). */
  exact?: boolean;
  /** Pastille de compteur (tickets en attente, etc.), masquée à 0. */
  badge?: number;
  /** Barre mobile : item gardé dans la barre (les autres passent dans le menu « Plus »). */
  primary?: boolean;
};
export type NavGroup = { label: string | null; items: NavItem[] };

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

export const isNavActive = (pathname: string | null, item: NavItem) =>
  !!pathname && (item.exact ? pathname === item.href : pathname.startsWith(item.href));

// `action` : bouton à droite du logo (cloche de notifications). Le bloc est `relative` pour que sa fenêtre déroulante s'y cale.
export function SidebarBrand({ tag, action }: { tag?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="relative border-b border-white/[0.06] px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className={`flex items-center gap-3 rounded-lg ${FOCUS}`}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-900/40">
            <Music size={18} aria-hidden="true" />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight text-white">Twichify</span>
        </Link>
        {action}
      </div>
      {tag && <div className="mt-4">{tag}</div>}
    </div>
  );
}

function CountBadge({ count, small = false }: { count: number; small?: boolean }) {
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-amber-400 font-bold text-black ${
        small ? "h-3.5 min-w-3.5 px-1 text-[9px]" : "ml-auto h-5 min-w-5 px-1.5 text-[11px]"
      }`}
    >
      {count}
    </span>
  );
}

export function SidebarNav({ groups, pathname }: { groups: NavGroup[]; pathname: string | null }) {
  return (
    <nav aria-label="Navigation principale" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {groups.map((group) => (
        <div key={group.label ?? "main"} className="space-y-0.5">
          {group.label && (
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">{group.label}</p>
          )}
          {group.items.map((item) => {
            const active = isNavActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${FOCUS} ${
                  active ? "bg-white/[0.07] text-white" : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-purple-400"
                  />
                )}
                <span
                  aria-hidden="true"
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                    active ? "bg-purple-500/20 text-purple-200" : "bg-white/[0.03] text-zinc-400 group-hover:text-white"
                  }`}
                >
                  <Icon size={15} />
                </span>
                {item.label}
                {item.badge ? <CountBadge count={item.badge} /> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

// Barre mobile : 4 accès directs maximum + « Plus ». Au-delà, les libellés sont tronqués et les zones de toucher trop étroites (8 items = ~45 px chacun sur 360 px).
const MOBILE_BAR_SLOTS = 4;

/** Style commun des lignes du menu « Plus » (zone de toucher d'au moins 44 px). */
export const SHEET_ITEM =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-purple-400";

export function SheetLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">{children}</p>;
}

export function SheetLink({
  href,
  label,
  icon: Icon,
  iconClass = "text-zinc-400",
  badge,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  iconClass?: string;
  badge?: number;
}) {
  return (
    <Link href={href} className={SHEET_ITEM}>
      <Icon size={18} aria-hidden="true" className={iconClass} />
      <span className="flex-1">{label}</span>
      {badge ? <CountBadge count={badge} /> : null}
    </Link>
  );
}

/**
 * Barre de navigation du bas (< md). Les items `primary` restent dans la barre, les autres vont dans un tiroir « Plus »
 * qui accueille aussi `more` (liens du compte, aide, déconnexion…) : sans lui, ces liens n'existaient que dans la barre
 * latérale, donc inaccessibles sur mobile.
 */
export function MobileNav({
  groups,
  pathname,
  more,
}: {
  groups: NavGroup[];
  pathname: string | null;
  more?: React.ReactNode;
}) {
  const items = groups.flatMap((group) => group.items);
  const [open, setOpen] = useState(false);

  const needsSheet = !!more || items.length > MOBILE_BAR_SLOTS + 1;
  // Items de la barre : d'abord ceux marqués `primary` (visibles selon les droits), complétés dans l'ordre jusqu'à 4.
  const picked = needsSheet ? [...items.filter((i) => i.primary), ...items.filter((i) => !i.primary)].slice(0, MOBILE_BAR_SLOTS) : items;
  const barItems = items.filter((i) => picked.includes(i));
  const sheetGroups = groups
    .map((group) => ({ label: group.label, items: group.items.filter((i) => !barItems.includes(i)) }))
    .filter((group) => group.items.length > 0);
  const moreActive = sheetGroups.some((group) => group.items.some((i) => isNavActive(pathname, i)));
  const moreBadge = sheetGroups.reduce((sum, group) => sum + group.items.reduce((s, i) => s + (i.badge ?? 0), 0), 0);

  // Le tiroir se ferme à chaque navigation, avec Échap, et bloque le défilement de la page derrière lui.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const itemClass = (active: boolean) =>
    `relative flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors ${FOCUS} ${
      active ? "text-purple-300" : "text-zinc-500"
    }`;

  return (
    <>
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-white/10 bg-zinc-950/90 px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden"
      >
        {barItems.map((item) => {
          const active = isNavActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={itemClass(active)}>
              {active && (
                <span aria-hidden="true" className="absolute inset-x-3 -top-1.5 h-0.5 rounded-full bg-purple-400" />
              )}
              <Icon size={20} aria-hidden="true" />
              <span className="max-w-full truncate">{item.short ?? item.label}</span>
              {item.badge ? (
                <span className="absolute right-1 top-0.5">
                  <CountBadge count={item.badge} small />
                </span>
              ) : null}
            </Link>
          );
        })}

        {needsSheet && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="dialog"
            className={itemClass(moreActive || open)}
          >
            {moreActive && !open && (
              <span aria-hidden="true" className="absolute inset-x-3 -top-1.5 h-0.5 rounded-full bg-purple-400" />
            )}
            <MoreHorizontal size={20} aria-hidden="true" />
            <span>Plus</span>
            {moreBadge > 0 ? (
              <span className="absolute right-1 top-0.5">
                <CountBadge count={moreBadge} small />
              </span>
            ) : null}
          </button>
        )}
      </nav>

      {needsSheet && open && (
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
          />
          <div
            // Un clic sur un lien ferme le tiroir (utile aussi quand le lien mène à la page déjà ouverte).
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setOpen(false);
            }}
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-2xl border-t border-white/10 bg-zinc-950 px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl shadow-black/60"
          >
            <div className="flex items-center justify-between px-3 pb-1">
              <p className="text-sm font-semibold text-white">Menu</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white ${FOCUS}`}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {sheetGroups.map((group) => (
              <div key={group.label ?? "main"}>
                {group.label && <SheetLabel>{group.label}</SheetLabel>}
                {group.items.map((item) => {
                  const active = isNavActive(pathname, item);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`${SHEET_ITEM} ${active ? "bg-white/[0.07] text-white" : ""}`}
                    >
                      <Icon size={18} aria-hidden="true" className={active ? "text-purple-300" : "text-zinc-400"} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge ? <CountBadge count={item.badge} /> : null}
                    </Link>
                  );
                })}
              </div>
            ))}

            {more && <div className={sheetGroups.length > 0 ? "mt-2 border-t border-white/10 pt-1" : ""}>{more}</div>}
          </div>
        </div>
      )}
    </>
  );
}
