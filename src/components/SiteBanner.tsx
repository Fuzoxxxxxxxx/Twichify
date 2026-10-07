"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Info, TriangleAlert, OctagonAlert, X } from "lucide-react";

export type BannerLevel = "info" | "warning" | "critical";

const STYLES: Record<BannerLevel, { bar: string; icon: typeof Info }> = {
  info: { bar: "bg-indigo-600/20 border-indigo-500/30 text-indigo-100", icon: Info },
  warning: { bar: "bg-amber-500/20 border-amber-500/30 text-amber-100", icon: TriangleAlert },
  critical: { bar: "bg-rose-600/25 border-rose-500/40 text-rose-100", icon: OctagonAlert },
};

// Présentation seule : réutilisée par le site et par l'aperçu de l'espace propriétaire.
export function BannerBar({
  message,
  level,
  onDismiss,
}: {
  message: string;
  level: BannerLevel;
  onDismiss?: () => void;
}) {
  const { bar, icon: Icon } = STYLES[level] ?? STYLES.info;

  return (
    <div role="status" className={`w-full border-b backdrop-blur-xl ${bar}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-6 py-2.5 text-sm font-medium">
        <Icon size={16} className="shrink-0" aria-hidden="true" />
        <span className="text-center">{message}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fermer l'annonce"
            className="ml-2 shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

type ActiveBanner = { id: number; message: string; level: BannerLevel };

// Intervalle d'actualisation : l'annonce apparaît chez les visiteurs sans rechargement.
// (Délai max ≈ 10 s de cache CDN + 15 s d'intervalle.)
const POLL_MS = 15_000;

// Annonce globale gérée depuis l'espace propriétaire. Masquée sur les overlays OBS.
export default function SiteBanner() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [banner, setBanner] = useState<ActiveBanner | null>(null);
  const [dismissedId, setDismissedId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async (fresh = false) => {
      try {
        // ?t= contourne le cache CDN quand on veut la valeur à jour tout de suite.
        const res = await fetch(fresh ? `/api/site-banner?t=${Date.now()}` : "/api/site-banner", {
          cache: "no-store",
        });
        // Erreur serveur/réseau : on garde l'annonce actuellement affichée.
        if (!res.ok || cancelled) return;

        const data = await res.json();
        const next: ActiveBanner | null = data?.banner ?? null;

        // Ne re-rend que si quelque chose a changé.
        setBanner((prev) =>
          prev?.id === next?.id && prev?.message === next?.message && prev?.level === next?.level ? prev : next
        );

        if (next) {
          try {
            if (sessionStorage.getItem(`banner-dismissed:${next.id}`) === "1") setDismissedId(next.id);
          } catch {
            // stockage indisponible : la fermeture ne sera pas mémorisée.
          }
        }
      } catch {
        // réseau indisponible : on réessaiera au prochain passage.
      }
    };

    // Boucle d'actualisation, en pause quand l'onglet est masqué.
    const schedule = () => {
      timer = setTimeout(async () => {
        if (document.visibilityState === "visible") await load();
        if (!cancelled) schedule();
      }, POLL_MS);
    };

    load(true);
    schedule();

    // Rafraîchit immédiatement : sauvegarde depuis l'espace propriétaire, retour sur l'onglet, reconnexion.
    const refresh = () => load(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") load(true);
    };
    window.addEventListener("site-banner-updated", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("site-banner-updated", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const visible = !!banner && banner.id !== dismissedId && !pathname?.startsWith("/widget");

  const dismiss = () => {
    if (!banner) return;
    setDismissedId(banner.id);
    try {
      sessionStorage.setItem(`banner-dismissed:${banner.id}`, "1");
    } catch {
      // stockage indisponible : la fermeture ne sera pas mémorisée.
    }
  };

  return (
    <AnimatePresence initial={false}>
      {visible && banner && (
        <motion.div
          key={banner.id}
          initial={reduceMotion ? false : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }}
          className="overflow-hidden"
        >
          {/* Une annonce critique ne peut pas être fermée. */}
          <BannerBar
            message={banner.message}
            level={banner.level}
            onDismiss={banner.level === "critical" ? undefined : dismiss}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
