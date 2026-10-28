"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NotificationItem } from "@/lib/notification-types";

type LoadState = "loading" | "ready" | "error";

async function post(body: object): Promise<{ unreadCount: number } | null> {
  try {
    const res = await fetch("/api/user/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Notifications de l'utilisateur connecté : liste, compteur de non lues et actions (lire, supprimer).
 * Les actions sont appliquées tout de suite à l'écran puis confirmées par le serveur ; si le serveur refuse,
 * on recharge la liste pour revenir à l'état réel. Rafraîchissement automatique toutes les `pollMs`
 * (suspendu quand l'onglet est caché) et au retour sur l'onglet.
 */
export function useNotifications({ limit = 20, pollMs = 60_000 }: { limit?: number; pollMs?: number } = {}) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [state, setState] = useState<LoadState>("loading");
  const loadedOnce = useRef(false);

  const refresh = useCallback(
    async (silent = false) => {
      try {
        const res = await fetch(`/api/user/notifications?limit=${limit}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        setItems(data.notifications ?? []);
        setUnread(data.unreadCount ?? 0);
        setState("ready");
        loadedOnce.current = true;
      } catch {
        // Un échec silencieux (poll en arrière-plan) ne remplace pas une liste déjà affichée par une erreur.
        if (!silent || !loadedOnce.current) setState(loadedOnce.current ? "ready" : "error");
      }
    },
    [limit]
  );

  useEffect(() => {
    refresh();
    const interval = setInterval(() => {
      if (!document.hidden) refresh(true);
    }, pollMs);
    const onVisible = () => {
      if (!document.hidden) refresh(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, pollMs]);

  const markRead = useCallback(
    async (ids: string[]) => {
      const targets = items.filter((n) => ids.includes(n.id) && !n.read);
      if (targets.length === 0) return;
      setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
      setUnread((u) => Math.max(0, u - targets.length));
      const result = await post({ action: "read", ids });
      if (result) setUnread(result.unreadCount);
      else refresh(true);
    },
    [items, refresh]
  );

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    const result = await post({ action: "readAll" });
    if (result) setUnread(result.unreadCount);
    else refresh(true);
  }, [refresh]);

  const remove = useCallback(
    async (ids: string[]) => {
      const removedUnread = items.filter((n) => ids.includes(n.id) && !n.read).length;
      setItems((prev) => prev.filter((n) => !ids.includes(n.id)));
      setUnread((u) => Math.max(0, u - removedUnread));
      const result = await post({ action: "delete", ids });
      if (result) setUnread(result.unreadCount);
      else refresh(true);
    },
    [items, refresh]
  );

  const clearRead = useCallback(async () => {
    setItems((prev) => prev.filter((n) => !n.read));
    const result = await post({ action: "clearRead" });
    if (result) setUnread(result.unreadCount);
    else refresh(true);
  }, [refresh]);

  return { items, unread, state, refresh, markRead, markAllRead, remove, clearRead };
}
