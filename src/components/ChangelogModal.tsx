"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X, Sparkles, Wrench, Bug, PartyPopper, ChevronDown } from "lucide-react";
import { CHANGELOG, LATEST_VERSION, ChangeType, ChangelogEntry, getMajorVersion } from "@/lib/changelog";

const STORAGE_KEY = "twichify_seen_changelog_version";

// La pop-up « une version » n'affiche que la dernière version.
const latest = CHANGELOG[0];

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

const TYPE_META: Record<ChangeType, { label: string; color: string; icon: any }> = {
  new: { label: "Nouveau", color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30", icon: Sparkles },
  improved: { label: "Amélioré", color: "text-blue-300 bg-blue-500/10 border-blue-500/30", icon: Wrench },
  fixed: { label: "Corrigé", color: "text-amber-300 bg-amber-500/10 border-amber-500/30", icon: Bug },
};

const SUMMARY_LABEL: Record<ChangeType, { singular: string; plural: string }> = {
  new: { singular: "nouveauté", plural: "nouveautés" },
  improved: { singular: "amélioration", plural: "améliorations" },
  fixed: { singular: "correction", plural: "corrections" },
};

function countChanges(entries: ChangelogEntry[]) {
  const counts: Record<ChangeType, number> = { new: 0, improved: 0, fixed: 0 };
  for (const e of entries) for (const c of e.changes) counts[c.type]++;
  return counts;
}

function ChangeBadges({ counts }: { counts: Record<ChangeType, number> }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {(Object.keys(counts) as ChangeType[]).map((t) =>
        counts[t] > 0 ? (
          <span key={t} className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${TYPE_META[t].color}`}>
            {counts[t]} {counts[t] > 1 ? SUMMARY_LABEL[t].plural : SUMMARY_LABEL[t].singular}
          </span>
        ) : null
      )}
    </div>
  );
}

function ChangeList({ changes, animate }: { changes: ChangelogEntry["changes"]; animate?: boolean }) {
  return (
    <ul className="space-y-2.5">
      {changes.map((c, i) => {
        const meta = TYPE_META[c.type];
        const Icon = meta.icon;
        return (
          <li
            key={i}
            style={animate ? { animationDelay: `${Math.min(100 + i * 60, 600)}ms` } : undefined}
            className={`${animate ? "cl-item" : ""} flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5`}
          >
            <span className={`mt-0.5 flex w-[92px] shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${meta.color}`}>
              <Icon size={12} aria-hidden="true" />
              {meta.label}
            </span>
            <p className="text-sm leading-relaxed text-zinc-300">{c.text}</p>
          </li>
        );
      })}
    </ul>
  );
}

// Un groupe repliable pour une version incluse dans le récap d'une grosse mise à jour.
function VersionGroup({ entry, defaultOpen }: { entry: ChangelogEntry; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const counts = countChanges([entry]);
  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03] ${FOCUS}`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-300">
              v{entry.version}
            </span>
            <p className="truncate text-sm font-semibold text-white">{entry.title}</p>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {Object.entries(counts)
              .filter(([, n]) => n > 0)
              .map(([t, n]) => `${n} ${n > 1 ? SUMMARY_LABEL[t as ChangeType].plural : SUMMARY_LABEL[t as ChangeType].singular}`)
              .join(" · ")}
          </p>
        </div>
        <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-white/10 px-4 py-3">
          <ChangeList changes={entry.changes} />
        </div>
      )}
    </div>
  );
}

export default function ChangelogModal() {
  const pathname = usePathname();
  const { status } = useSession();
  // Jamais sur les overlays OBS : la pop-up ne doit pas apparaitre à l'écran pendant le stream.
  const isWidgetPage = !!pathname?.startsWith("/widget");
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false); // contrôle l'animation d'entrée
  const [missedCount, setMissedCount] = useState(0); // versions précédentes non vues
  const [fade, setFade] = useState({ top: false, bottom: false });
  const [bigRelease, setBigRelease] = useState<{ fromMajor: number; toMajor: number; entries: ChangelogEntry[] } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isWidgetPage) return;
    // Le statut de session doit être connu avant de décider quoi que ce soit, sinon un
    // visiteur connecté verrait brièvement la logique « non connecté » au premier rendu.
    if (status === "loading") return;

    let cancelled = false;

    const run = async () => {
      try {
        let seen: string | null;

        if (status === "authenticated") {
          // État sur le compte : survit à un changement de navigateur ou d'appareil.
          const res = await fetch("/api/user/onboarding-state");
          if (!res.ok) return;
          const data = await res.json();
          if (cancelled) return;

          // La personne n'a pas encore fini le tutoriel d'accueil (WelcomeModal, dans le
          // dashboard) : c'est lui qui gère le premier contact, pas cette pop-up. Évite aussi
          // que les deux pop-ups se retrouvent empilées l'une sur l'autre.
          if (data.hasSeenWelcome === false) return;

          seen = data.seenChangelogVersion;
        } else {
          // Visiteur non connecté : pas de compte auquel rattacher l'état, on garde le
          // comportement par navigateur.
          seen = localStorage.getItem(STORAGE_KEY);
        }

        if (seen === LATEST_VERSION) return;

        const seenIndex = seen ? CHANGELOG.findIndex((e) => e.version === seen) : -1;
        const latestMajor = getMajorVersion(LATEST_VERSION);

        // Grosse mise à jour : la version que la personne connaissait appartient à une
        // version majeure antérieure. On récapitule alors tout ce qu'elle a manqué,
        // plutôt que de ne montrer que le tout dernier correctif.
        if (seen && seenIndex > -1) {
          const seenMajor = getMajorVersion(seen);
          if (latestMajor > seenMajor) {
            const missedEntries = CHANGELOG.slice(0, seenIndex);
            setBigRelease({ fromMajor: seenMajor, toMajor: latestMajor, entries: missedEntries });
            setOpen(true);
            requestAnimationFrame(() => setVisible(true));
            return;
          }
        }

        // Nombre de versions intermédiaires manquées (hors dernière), pour le lien du pied.
        setMissedCount(seenIndex > 1 ? seenIndex - 1 : 0);

        setOpen(true);
        requestAnimationFrame(() => setVisible(true));
      } catch (e) {
        // réseau ou localStorage indisponible : on n'affiche rien.
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isWidgetPage, status]);

  // Échap pour fermer, blocage du scroll de la page, focus sur le bouton principal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => confirmRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Dégradés de fondu haut/bas selon la position du scroll.
  const updateFade = () => {
    const el = scrollRef.current;
    if (!el) return;
    const top = el.scrollTop > 4;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 4;
    setFade((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
  };

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(updateFade);
    window.addEventListener("resize", updateFade);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateFade);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bigRelease]);

  const close = () => {
    setVisible(false);
    // État sur le compte pour un visiteur connecté (survit au changement de navigateur),
    // sinon localStorage comme seul repli possible.
    if (status === "authenticated") {
      fetch("/api/user/onboarding-state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seenChangelogVersion: LATEST_VERSION }),
      })
        .then((res) => {
          if (!res.ok) console.error("Échec de l'enregistrement du changelog vu :", res.status);
        })
        .catch((err) => console.error("Échec de l'enregistrement du changelog vu :", err));
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, LATEST_VERSION);
      } catch (e) {
        // ignore
      }
    }
    setTimeout(() => setOpen(false), 200);
  };

  if (!open || isWidgetPage) return null;

  const sharedStyles = `
    @keyframes cl-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    .cl-item { animation: cl-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }
    @media (prefers-reduced-motion: reduce) { .cl-item { animation: none; } }
  `;

  // Cadre commun des deux variantes (version normale, grosse mise à jour).
  const overlayClass = `fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm transition-opacity duration-200 sm:items-center ${
    visible ? "opacity-100" : "opacity-0"
  }`;
  const panelClass = (maxWidth: string, border: string) =>
    `relative flex max-h-[85vh] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl border ${border} bg-zinc-950 shadow-2xl shadow-black/60 transition-all duration-300 ease-out ${
      visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0"
    }`;
  const closeButton = (
    <button
      onClick={close}
      aria-label="Fermer"
      className={`absolute right-4 top-4 cursor-pointer rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white ${FOCUS}`}
    >
      <X size={18} />
    </button>
  );
  const fadeEdges = (
    <>
      <div className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-zinc-950 to-transparent transition-opacity duration-200 ${fade.top ? "opacity-100" : "opacity-0"}`} />
      <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-zinc-950 to-transparent transition-opacity duration-200 ${fade.bottom ? "opacity-100" : "opacity-0"}`} />
    </>
  );

  // ── GROSSE MISE À JOUR : récap de tout le cycle manqué (2.0 → 3.0, etc.) ──
  if (bigRelease) {
    const counts = countChanges(bigRelease.entries);
    return (
      <div className={overlayClass} onClick={close}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="changelog-title"
          onClick={(e) => e.stopPropagation()}
          className={panelClass("max-w-xl", "border-amber-400/30")}
        >
          <style>{sharedStyles}</style>

          <div className="relative shrink-0 px-6 pb-5 pt-7 sm:px-8">
            {closeButton}

            <p className="flex items-center gap-2 text-sm font-medium text-amber-300">
              <PartyPopper size={16} aria-hidden="true" />
              Grosse mise à jour
            </p>
            <h2 id="changelog-title" className="mt-2 pr-10 font-display text-2xl font-extrabold leading-tight tracking-tight text-white">
              Twichify passe en version {bigRelease.toMajor}.0
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Voici tout ce qui a changé depuis la version {bigRelease.fromMajor}.0 que tu connaissais.
            </p>

            <ChangeBadges counts={counts} />
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col">
            <div ref={scrollRef} onScroll={updateFade} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-6 pb-3 pt-1 sm:px-8">
              {bigRelease.entries.map((entry, i) => (
                <VersionGroup key={entry.version} entry={entry} defaultOpen={i === 0} />
              ))}
            </div>
            {fadeEdges}
          </div>

          <div className="relative mt-2 flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-6 py-4 sm:px-8">
            <Link
              href="/changelog"
              onClick={close}
              className={`rounded text-sm font-medium text-zinc-400 underline-offset-4 transition-colors hover:text-amber-300 hover:underline ${FOCUS}`}
            >
              Voir tout l'historique
            </Link>

            <button
              ref={confirmRef}
              onClick={close}
              className="cursor-pointer rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-black outline-none transition-colors hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              Découvrir
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── VERSION NORMALE : uniquement la dernière ──
  const { changes } = latest;
  const counts = countChanges([latest]);

  return (
    <div className={overlayClass} onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-title"
        onClick={(e) => e.stopPropagation()}
        className={panelClass("max-w-lg", "border-white/10")}
      >
        <style>{sharedStyles}</style>

        {/* EN-TÊTE (fixe) */}
        <div className="relative shrink-0 px-6 pb-5 pt-7 sm:px-8">
          {closeButton}

          <p className="flex items-center gap-2 text-sm font-medium text-purple-300">
            <Sparkles size={16} aria-hidden="true" />
            Quoi de neuf
          </p>
          <h2 id="changelog-title" className="mt-2 pr-10 font-display text-2xl font-extrabold leading-tight tracking-tight text-white">
            {latest.title}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-purple-500/40 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-purple-200">
              v{latest.version}
            </span>
            <span className="text-sm text-zinc-400">{latest.date}</span>
          </div>

          {changes.length > 1 && <ChangeBadges counts={counts} />}
        </div>

        {/* CONTENU (scrollable) */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div ref={scrollRef} onScroll={updateFade} className="min-h-0 flex-1 overflow-y-auto px-6 pb-3 pt-1 sm:px-8">
            <ChangeList changes={changes} animate />
          </div>
          {fadeEdges}
        </div>

        {/* PIED (fixe) */}
        <div className="relative mt-2 flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-6 py-4 sm:px-8">
          <Link
            href="/changelog"
            onClick={close}
            className={`rounded text-sm font-medium text-zinc-400 underline-offset-4 transition-colors hover:text-purple-300 hover:underline ${FOCUS}`}
          >
            {missedCount > 0
              ? `Voir aussi les ${missedCount} version${missedCount > 1 ? "s" : ""} précédente${missedCount > 1 ? "s" : ""}`
              : "Voir tout l'historique"}
          </Link>

          <button
            ref={confirmRef}
            onClick={close}
            className="cursor-pointer rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
}
