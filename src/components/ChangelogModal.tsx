"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X, Sparkles, Wrench, Bug, ArrowRight, PartyPopper, ChevronDown } from "lucide-react";
import { CHANGELOG, LATEST_VERSION, ChangeType, ChangelogEntry, getMajorVersion } from "@/lib/changelog";

const STORAGE_KEY = "twichify_seen_changelog_version";

// La pop-up « une version » n'affiche que la dernière version.
const latest = CHANGELOG[0];

const TYPE_META: Record<ChangeType, { label: string; color: string; bar: string; icon: any }> = {
  new: { label: "Nouveau", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", bar: "border-l-emerald-500", icon: Sparkles },
  improved: { label: "Amélioré", color: "text-blue-400 bg-blue-500/10 border-blue-500/30", bar: "border-l-blue-500", icon: Wrench },
  fixed: { label: "Corrigé", color: "text-amber-400 bg-amber-500/10 border-amber-500/30", bar: "border-l-amber-500", icon: Bug },
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
    <div className="mt-4 flex flex-wrap gap-1.5">
      {(Object.keys(counts) as ChangeType[]).map((t) =>
        counts[t] > 0 ? (
          <span key={t} className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${TYPE_META[t].color}`}>
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
            style={animate ? { animationDelay: `${Math.min(150 + i * 70, 700)}ms` } : undefined}
            className={`${animate ? "cl-item" : ""} flex items-start gap-2.5 rounded-xl border border-zinc-800/60 border-l-[3px] ${meta.bar} bg-zinc-900/40 p-3`}
          >
            <span className={`mt-0.5 flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${meta.color}`}>
              <Icon size={10} />
              {meta.label}
            </span>
            <p className="text-[13px] leading-relaxed text-zinc-300">{c.text}</p>
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
    <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/30">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-black text-zinc-300">v{entry.version}</span>
            <p className="truncate text-xs font-bold text-white">{entry.title}</p>
          </div>
          <p className="mt-1 text-[10px] text-zinc-500">
            {Object.entries(counts).filter(([, n]) => n > 0).map(([t, n]) => `${n} ${n > 1 ? SUMMARY_LABEL[t as ChangeType].plural : SUMMARY_LABEL[t as ChangeType].singular}`).join(" · ")}
          </p>
        </div>
        <ChevronDown size={15} className={`shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-zinc-800/60 px-4 py-3">
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
    @keyframes cl-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @keyframes cl-glow { 0%, 100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.15); } }
    .cl-item { animation: cl-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
    .cl-glow { animation: cl-glow 3s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) { .cl-item, .cl-glow { animation: none; } }
  `;

  // ── GROSSE MISE À JOUR : récap de tout le cycle manqué (2.0 → 3.0, etc.) ──
  if (bigRelease) {
    const counts = countChanges(bigRelease.entries);
    return (
      <div
        className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={close}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="changelog-title"
          onClick={(e) => e.stopPropagation()}
          className={`relative flex w-full max-w-xl max-h-[88vh] flex-col overflow-hidden rounded-[28px] border border-amber-400/30 bg-zinc-950/95 backdrop-blur-xl shadow-2xl shadow-amber-900/30 transition-all duration-300 ease-out ${
            visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"
          }`}
        >
          <style>{sharedStyles}</style>

          <div className="pointer-events-none absolute top-0 right-0 h-72 w-72 rounded-full bg-amber-500/20 blur-[110px]" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 rounded-full bg-purple-600/20 blur-[110px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-amber-500/10 to-transparent" />

          <div className="relative shrink-0 px-7 pt-8 pb-5 sm:px-8">
            <button onClick={close} aria-label="Fermer" className="absolute top-5 right-5 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white">
              <X size={18} />
            </button>

            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="cl-glow absolute inset-0 rounded-2xl bg-amber-400/50 blur-xl" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-400/30 to-orange-500/20 text-amber-200">
                  <PartyPopper size={24} />
                </div>
              </div>

              <div className="min-w-0 pr-8">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400">Grosse mise à jour</p>
                <h2 id="changelog-title" className="mt-1 text-2xl font-black leading-tight text-white">
                  Twichify passe en version {bigRelease.toMajor}.0
                </h2>
                <p className="mt-1.5 text-xs text-zinc-400">
                  Voici tout ce qui a changé depuis la version {bigRelease.fromMajor}.0 que tu connaissais.
                </p>
              </div>
            </div>

            <ChangeBadges counts={counts} />
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col">
            <div ref={scrollRef} onScroll={updateFade} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-7 pt-1 pb-3 sm:px-8">
              {bigRelease.entries.map((entry, i) => (
                <VersionGroup key={entry.version} entry={entry} defaultOpen={i === 0} />
              ))}
            </div>

            <div className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-zinc-950 to-transparent transition-opacity duration-200 ${fade.top ? "opacity-100" : "opacity-0"}`} />
            <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-zinc-950 to-transparent transition-opacity duration-200 ${fade.bottom ? "opacity-100" : "opacity-0"}`} />
          </div>

          <div className="relative mt-2 flex shrink-0 items-center justify-between gap-3 border-t border-zinc-800/80 bg-zinc-900/40 px-7 py-5 sm:px-8">
            <Link href="/changelog" onClick={close} className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 transition-colors hover:text-amber-400">
              Voir tout l'historique
              <ArrowRight size={12} />
            </Link>

            <button
              ref={confirmRef}
              onClick={close}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-lg shadow-amber-600/20 outline-none transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-amber-300/60"
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
    <div
      className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-title"
        onClick={(e) => e.stopPropagation()}
        className={`relative flex w-full max-w-lg max-h-[85vh] flex-col overflow-hidden rounded-[28px] border border-purple-500/30 bg-zinc-950/95 backdrop-blur-xl shadow-2xl shadow-purple-900/40 transition-all duration-300 ease-out ${
          visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"
        }`}
      >
        <style>{sharedStyles}</style>

        {/* Ambiance : halos + voile dégradé en haut */}
        <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full bg-purple-600/20 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-emerald-600/10 blur-[100px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-purple-500/10 to-transparent" />

        {/* EN-TÊTE (fixe) */}
        <div className="relative shrink-0 px-7 pt-8 pb-5 sm:px-8">
          <button
            onClick={close}
            aria-label="Fermer"
            className="absolute top-5 right-5 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>

          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="cl-glow absolute inset-0 rounded-2xl bg-purple-500/50 blur-xl" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-500/30 to-indigo-500/20 text-purple-200">
                <Sparkles size={24} />
              </div>
            </div>

            <div className="min-w-0 pr-8">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-400">Quoi de neuf</p>
              <h2 id="changelog-title" className="mt-1 text-2xl font-black leading-tight text-white">
                {latest.title}
              </h2>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-purple-600/30">
                  v{latest.version}
                </span>
                <span className="text-[11px] text-zinc-500">{latest.date}</span>
              </div>
            </div>
          </div>

          {changes.length > 1 && <ChangeBadges counts={counts} />}
        </div>

        {/* CONTENU (scrollable) */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            onScroll={updateFade}
            className="min-h-0 flex-1 overflow-y-auto px-7 pt-1 pb-3 sm:px-8"
          >
            <ChangeList changes={changes} animate />
          </div>

          {/* Dégradés de fondu : indiquent qu'il y a plus de contenu */}
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-zinc-950 to-transparent transition-opacity duration-200 ${
              fade.top ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-zinc-950 to-transparent transition-opacity duration-200 ${
              fade.bottom ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>

        {/* PIED (fixe) */}
        <div className="relative mt-2 flex shrink-0 items-center justify-between gap-3 border-t border-zinc-800/80 bg-zinc-900/40 px-7 py-5 sm:px-8">
          <Link
            href="/changelog"
            onClick={close}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 transition-colors hover:text-purple-400"
          >
            {missedCount > 0
              ? `Voir aussi les ${missedCount} version${missedCount > 1 ? "s" : ""} précédente${missedCount > 1 ? "s" : ""}`
              : "Voir tout l'historique"}
            <ArrowRight size={12} />
          </Link>

          <button
            ref={confirmRef}
            onClick={close}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-purple-600/20 outline-none transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-purple-400/60"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
}
