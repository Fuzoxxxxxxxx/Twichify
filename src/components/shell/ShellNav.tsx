"use client";

import Link from "next/link";
import { Music, type LucideIcon } from "lucide-react";

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
};
export type NavGroup = { label: string | null; items: NavItem[] };

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

export const isNavActive = (pathname: string | null, item: NavItem) =>
  !!pathname && (item.exact ? pathname === item.href : pathname.startsWith(item.href));

// `action` : bouton à droite du logo (cloche de notifications). Le bloc est `relative` pour que sa fenêtre déroulante s'y cale.
export function SidebarBrand({ tag, action }: { tag?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="relative border-b border-white/5 px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className={`flex items-center gap-3 rounded-lg ${FOCUS}`}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600 text-white">
            <Music size={18} />
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
          {group.label && <p className="px-3 pb-1.5 text-xs font-medium text-zinc-500">{group.label}</p>}
          {group.items.map((item) => {
            const active = isNavActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${FOCUS} ${
                  active ? "bg-white/[0.06] text-white" : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-purple-400"
                  />
                )}
                <Icon size={16} className={active ? "text-purple-300" : ""} />
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

export function MobileNav({ groups, pathname }: { groups: NavGroup[]; pathname: string | null }) {
  const items = groups.flatMap((group) => group.items);
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-white/10 bg-zinc-950/90 px-1 py-1.5 backdrop-blur-xl md:hidden"
    >
      {items.map((item) => {
        const active = isNavActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors ${FOCUS} ${
              active ? "text-purple-300" : "text-zinc-500"
            }`}
          >
            <Icon size={18} />
            <span className="max-w-full truncate">{item.short ?? item.label}</span>
            {item.badge ? (
              <span className="absolute right-1 top-0.5">
                <CountBadge count={item.badge} small />
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
