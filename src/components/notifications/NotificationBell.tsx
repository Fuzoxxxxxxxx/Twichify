"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications } from "@/components/notifications/useNotifications";
import NotificationIcon from "@/components/notifications/NotificationIcon";
import { timeAgo } from "@/components/notifications/format";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

/**
 * Cloche de notifications avec compteur de non lues et liste déroulante des plus récentes.
 * `sidebar` : dans l'en-tête de la barre latérale (la fenêtre se cale sur ce bloc, qui doit être `relative`).
 * `floating` : bouton fixe en haut à droite, pour les écrans étroits où la barre latérale est masquée.
 */
export default function NotificationBell({ variant = "sidebar" }: { variant?: "sidebar" | "floating" }) {
  const router = useRouter();
  const { items, unread, state, refresh, markRead, markAllRead } = useNotifications({ limit: 8 });
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fermeture au clic en dehors et avec Échap (le focus revient alors sur la cloche) ; liste actualisée à l'ouverture.
  useEffect(() => {
    if (!open) return;
    refresh(true);
    const onMouseDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, refresh]);

  const openItem = (id: string, href: string | null, read: boolean) => {
    if (!read) markRead([id]);
    setOpen(false);
    if (href) router.push(href);
  };

  const label = unread > 0 ? `Notifications, ${unread} non lue${unread > 1 ? "s" : ""}` : "Notifications";

  const wrapperClass = variant === "floating" ? "fixed right-3 top-3 z-40 md:hidden" : "";
  const panelClass =
    variant === "floating"
      ? "absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-1.5rem))]"
      : "absolute left-3 top-full z-50 mt-1 w-[22rem] max-w-[calc(100vw-1.5rem)]";

  return (
    <div ref={rootRef} className={wrapperClass}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-zinc-950/80 text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white ${FOCUS}`}
      >
        <Bell size={18} aria-hidden="true" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-purple-500 px-1 text-[11px] font-bold tabular-nums text-white"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className={`${panelClass} overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/60`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className={`flex cursor-pointer items-center gap-1.5 rounded text-sm font-medium text-purple-300 transition-colors hover:text-purple-200 ${FOCUS}`}
              >
                <CheckCheck size={14} aria-hidden="true" />
                Tout marquer comme lu
              </button>
            )}
          </div>

          {state === "loading" ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-400" aria-busy="true">
              Chargement...
            </p>
          ) : state === "error" ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-zinc-300">Impossible de charger les notifications.</p>
              <button
                type="button"
                onClick={() => refresh()}
                className={`mt-2 cursor-pointer rounded text-sm font-medium text-purple-300 hover:text-purple-200 ${FOCUS}`}
              >
                Réessayer
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell size={24} className="mx-auto mb-2 text-zinc-600" aria-hidden="true" />
              <p className="text-sm text-zinc-300">Rien de nouveau pour le moment.</p>
              <p className="mt-1 text-sm text-zinc-400">Les réponses à tes tickets et à tes idées apparaîtront ici.</p>
            </div>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-white/10 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n.id, n.href, n.read)}
                    className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04] ${FOCUS} ${
                      n.read ? "" : "bg-purple-500/[0.05]"
                    }`}
                  >
                    <NotificationIcon type={n.type} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className={`text-sm leading-snug ${n.read ? "font-medium text-zinc-300" : "font-semibold text-white"}`}>
                          {n.title}
                        </span>
                        {!n.read && <span aria-label="Non lue" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-purple-400" />}
                      </span>
                      {n.body && <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-zinc-400">{n.body}</span>}
                      <span className="mt-1 block text-xs text-zinc-400">{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-white/10 px-4 py-3">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className={`block rounded text-center text-sm font-medium text-zinc-300 transition-colors hover:text-white ${FOCUS}`}
            >
              Voir toutes les notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
