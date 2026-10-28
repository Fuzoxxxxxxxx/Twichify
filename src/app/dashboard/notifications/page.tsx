"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { PageHeader, DashboardLoading, DashboardLoadError } from "@/components/dashboard/DashboardUI";
import { useNotifications } from "@/components/notifications/useNotifications";
import NotificationIcon, { notificationLabel } from "@/components/notifications/NotificationIcon";
import { timeAgo } from "@/components/notifications/format";
import { useDialog } from "@/components/DialogProvider";
import { NOTIFICATION_TTL_DAYS, type NotificationItem } from "@/lib/notification-types";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

type Filter = "all" | "unread";

// Regroupement par ancienneté : les notifications sont déjà triées de la plus récente à la plus ancienne.
function bucketOf(iso: string, now: number): "today" | "week" | "older" {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const time = Date.parse(iso);
  if (time >= startOfToday.getTime()) return "today";
  if (time >= now - 7 * 24 * 60 * 60 * 1000) return "week";
  return "older";
}

const BUCKET_LABELS = { today: "Aujourd'hui", week: "Cette semaine", older: "Plus ancien" } as const;

export default function DashboardNotifications() {
  const { data: session } = useSession();
  const { confirm } = useDialog();
  const { items, unread, state, refresh, markRead, markAllRead, remove, clearRead } = useNotifications({
    limit: 100,
    pollMs: 60_000,
  });
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(() => (filter === "unread" ? items.filter((n) => !n.read) : items), [items, filter]);
  const hasRead = items.some((n) => n.read);

  const groups = useMemo(() => {
    const now = Date.now();
    const map: Record<keyof typeof BUCKET_LABELS, NotificationItem[]> = { today: [], week: [], older: [] };
    for (const n of visible) map[bucketOf(n.createdAt, now)].push(n);
    return (Object.keys(BUCKET_LABELS) as (keyof typeof BUCKET_LABELS)[])
      .map((key) => ({ key, label: BUCKET_LABELS[key], items: map[key] }))
      .filter((g) => g.items.length > 0);
  }, [visible]);

  const handleClearRead = async () => {
    const ok = await confirm({
      title: "Supprimer les notifications lues ?",
      description: "Les notifications déjà lues seront supprimées définitivement. Les non lues sont conservées.",
      confirmLabel: "Supprimer",
    });
    if (ok) clearRead();
  };

  if (!session) return null;
  if (state === "loading") return <DashboardLoading eyebrow="Compte" title="Notifications" />;
  if (state === "error") return <DashboardLoadError eyebrow="Compte" title="Notifications" onRetry={() => refresh()} />;

  const pill = (active: boolean) =>
    `cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors ${FOCUS} ${
      active
        ? "border-purple-500/50 bg-purple-500/15 text-purple-200"
        : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
    }`;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Compte"
        title="Notifications"
        action={
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-500 ${FOCUS}`}
              >
                <CheckCheck size={15} aria-hidden="true" />
                Tout marquer comme lu
              </button>
            )}
            {hasRead && (
              <button
                onClick={handleClearRead}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-white/30 hover:text-white ${FOCUS}`}
              >
                <Trash2 size={15} aria-hidden="true" />
                Supprimer les lues
              </button>
            )}
          </div>
        }
      />

      <div role="group" aria-label="Filtrer les notifications" className="-mt-4 flex flex-wrap items-center gap-2">
        <button onClick={() => setFilter("all")} aria-pressed={filter === "all"} className={pill(filter === "all")}>
          Toutes <span className="tabular-nums opacity-70">{items.length}</span>
        </button>
        <button onClick={() => setFilter("unread")} aria-pressed={filter === "unread"} className={pill(filter === "unread")}>
          Non lues <span className="tabular-nums opacity-70">{unread}</span>
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-16 text-center">
          <Bell size={28} className="mx-auto mb-3 text-zinc-600" aria-hidden="true" />
          <p className="text-sm font-semibold text-zinc-200">
            {filter === "unread" ? "Tout est lu." : "Aucune notification pour le moment."}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-400">
            Tu seras prévenu ici quand l'équipe répond à un de tes tickets ou à une de tes idées.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`notif-${group.key}`}>
              <h2 id={`notif-${group.key}`} className="mb-3 font-display text-lg font-bold tracking-tight text-white">
                {group.label}
              </h2>

              <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
                {group.items.map((n) => {
                  const content = (
                    <>
                      <NotificationIcon type={n.type} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={`text-base leading-snug ${n.read ? "font-medium text-zinc-300" : "font-semibold text-white"}`}>
                            {n.title}
                          </span>
                          {!n.read && <span aria-label="Non lue" className="h-2 w-2 shrink-0 rounded-full bg-purple-400" />}
                        </span>
                        {n.body && <span className="mt-0.5 block text-sm leading-relaxed text-zinc-400">{n.body}</span>}
                        <span className="mt-1 block text-xs text-zinc-400">
                          {notificationLabel(n.type)} · {timeAgo(n.createdAt)}
                        </span>
                      </span>
                    </>
                  );

                  const rowClass = `flex min-w-0 flex-1 items-start gap-3.5 px-5 py-4 text-left transition-colors hover:bg-white/[0.04] ${FOCUS}`;

                  return (
                    <li key={n.id} className={`flex items-stretch ${n.read ? "" : "bg-purple-500/[0.05]"}`}>
                      {n.href ? (
                        <Link href={n.href} onClick={() => markRead([n.id])} className={rowClass}>
                          {content}
                        </Link>
                      ) : (
                        <button type="button" onClick={() => markRead([n.id])} className={`${rowClass} cursor-pointer`}>
                          {content}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => remove([n.id])}
                        aria-label={`Supprimer la notification : ${n.title}`}
                        className={`flex w-12 shrink-0 cursor-pointer items-center justify-center text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-red-300 ${FOCUS}`}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="text-sm text-zinc-400">Les notifications sont conservées {NOTIFICATION_TTL_DAYS} jours, puis supprimées automatiquement.</p>
    </div>
  );
}
