"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Info, TriangleAlert, OctagonAlert, X } from "lucide-react";

export type BannerLevel = "info" | "warning" | "critical";

// Fonds pleins (pas de transparence) : la bannière reste lisible quel que soit le contenu de la page derrière.
const STYLES: Record<BannerLevel, { bar: string; iconColor: string; button: string; icon: typeof Info }> = {
  info: {
    bar: "bg-zinc-900 border-white/10 text-zinc-100",
    iconColor: "text-purple-300",
    button: "hover:bg-white/10 focus-visible:outline-purple-300",
    icon: Info,
  },
  warning: {
    bar: "bg-amber-950 border-amber-500/30 text-amber-50",
    iconColor: "text-amber-300",
    button: "hover:bg-amber-500/20 focus-visible:outline-amber-300",
    icon: TriangleAlert,
  },
  critical: {
    bar: "bg-rose-950 border-rose-500/40 text-rose-50",
    iconColor: "text-rose-300",
    button: "hover:bg-rose-500/20 focus-visible:outline-rose-300",
    icon: OctagonAlert,
  },
};

// Présentation seule : réutilisée par le site et par l'aperçu de l'espace propriétaire.
// Une annonce critique est annoncée tout de suite aux lecteurs d'écran (role="alert"), les autres poliment (role="status").
export function BannerBar({
  message,
  level,
  onDismiss,
}: {
  message: string;
  level: BannerLevel;
  onDismiss?: () => void;
}) {
  const { bar, iconColor, button, icon: Icon } = STYLES[level] ?? STYLES.info;

  return (
    <div role={level === "critical" ? "alert" : "status"} className={`w-full border-b ${bar}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-6 py-3 text-sm font-medium leading-snug">
        <Icon size={18} className={`shrink-0 ${iconColor}`} aria-hidden="true" />
        <span className="text-center">{message}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fermer l'annonce"
            className={`-my-1.5 -mr-2 ml-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-current opacity-80 transition hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 ${button}`}
          >
            <X size={16} />
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
