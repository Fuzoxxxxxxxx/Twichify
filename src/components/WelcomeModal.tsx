"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  PartyPopper, Music, Palette, MonitorPlay, MessageSquare, Rocket,
  ArrowRight, ArrowLeft, Check, ExternalLink,
} from "lucide-react";

interface WelcomeModalProps {
  isOpen: boolean;
  onFinish: () => void;
}

type Step = {
  icon: typeof PartyPopper;
  eyebrow: string;
  title: string;
  description: string;
  bullets?: string[];
  link?: { href: string; label: string };
};

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

const STEPS: Step[] = [
  {
    icon: PartyPopper,
    eyebrow: "Bienvenue",
    title: "Bienvenue sur Twichify !",
    description:
      "Twichify t'aide à afficher ta musique Spotify et ton chat Twitch dans OBS, avec des widgets personnalisables. Ce petit guide te montre l'essentiel en 4 étapes.",
  },
  {
    icon: Music,
    eyebrow: "Étape 1",
    title: "Connecte ton compte Spotify",
    description:
      "Rends-toi dans Intégrations → Spotify pour lier ton compte. C'est ce qui permet au widget d'afficher le morceau en cours de lecture.",
    bullets: ["Renseigne les identifiants de ton application Spotify", "Autorise l'accès à ta lecture en cours"],
    link: { href: "/dashboard/spotify", label: "Aller à Intégrations → Spotify" },
  },
  {
    icon: Palette,
    eyebrow: "Étape 2",
    title: "Personnalise tes widgets",
    description:
      "Choisis un thème, une couleur d'accent et une position pour le widget musique, puis fais de même pour le widget chat. Un aperçu en direct te montre le rendu à chaque changement.",
    link: { href: "/dashboard/design", label: "Aller à Widgets → Musique" },
  },
  {
    icon: MonitorPlay,
    eyebrow: "Étape 3",
    title: "Ajoute le widget dans OBS",
    description:
      "Chaque widget a son propre lien, personnel à ton compte. Ajoute-le comme Source Navigateur dans OBS (ou tout autre logiciel de stream compatible) pour le faire apparaître à l'écran.",
    bullets: [
      "Widget musique et widget chat ont des liens séparés, à copier depuis l'Accueil du dashboard",
      "Ne montre jamais ces liens à l'écran : s'ils fuitent, régénère-les depuis l'Accueil",
      "Redimensionne la source pour l'ajuster à ta scène",
    ],
  },
  {
    icon: MessageSquare,
    eyebrow: "Étape 4",
    title: "Configure ton chat et ton bot",
    description:
      "Depuis Widgets → Chat et Intégrations → Bot, choisis quels messages afficher, mets en avant certains rôles, et personnalise le message que ton bot peut annoncer dans le chat Twitch.",
    link: { href: "/dashboard/chat", label: "Aller à Widgets → Chat" },
  },
  {
    icon: Rocket,
    eyebrow: "C'est parti",
    title: "Tu es prêt à streamer !",
    description:
      "Tu peux revenir sur ce guide à tout moment depuis le Centre d'aide. En cas de blocage, la boîte à idées et le support sont toujours à un clic.",
    link: { href: "/help", label: "Voir le Centre d'aide" },
  },
];

export default function WelcomeModal({ isOpen, onFinish }: WelcomeModalProps) {
  const [step, setStep] = useState(0);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    nextButtonRef.current?.focus();
  }, [step, isOpen]);

  // Échap = « Passer » : le guide reste accessible depuis le Centre d'aide.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFinish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onFinish]);

  if (!isOpen) return null;

  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const current = STEPS[step];
  const Icon = current.icon;

  const goNext = () => {
    if (isLast) {
      onFinish();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
        <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl shadow-black/60 sm:p-8">
          {/* Haut : repère de progression et sortie */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm tabular-nums text-zinc-400">
              {step + 1} sur {STEPS.length}
            </p>
            {!isLast && (
              <button
                onClick={onFinish}
                className={`cursor-pointer rounded px-1 text-sm font-medium text-zinc-400 transition-colors hover:text-white ${FOCUS}`}
              >
                Passer
              </button>
            )}
          </div>

          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-purple-300">
            <Icon size={22} aria-hidden="true" />
          </div>

          <p className="text-sm font-medium text-purple-300">{current.eyebrow}</p>
          <h2 id="welcome-modal-title" className="mb-3 mt-1 font-display text-2xl font-extrabold tracking-tight text-white">
            {current.title}
          </h2>
          <p className="mb-5 text-[15px] leading-relaxed text-zinc-400">{current.description}</p>

          {current.bullets && (
            <ul className="mb-5 space-y-2">
              {current.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-300">
                  <Check size={15} className="mt-0.5 shrink-0 text-purple-300" aria-hidden="true" />
                  {b}
                </li>
              ))}
            </ul>
          )}

          {current.link && (
            <Link
              href={current.link.href}
              onClick={onFinish}
              className={`group mb-6 flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-purple-500/40 hover:text-white ${FOCUS}`}
            >
              <span>{current.link.label}</span>
              <ExternalLink size={14} aria-hidden="true" className="text-zinc-500 transition-colors group-hover:text-purple-300" />
            </Link>
          )}

          {/* Progression */}
          <div className="mb-6 flex items-center justify-center gap-1.5" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-purple-400" : i < step ? "w-1.5 bg-purple-500/50" : "w-1.5 bg-zinc-700"
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {!isFirst && (
              <button
                onClick={() => setStep((s) => Math.max(s - 1, 0))}
                aria-label="Étape précédente"
                className={`flex cursor-pointer items-center justify-center rounded-xl border border-white/15 px-4 py-3.5 text-zinc-300 transition-colors hover:border-white/30 hover:text-white ${FOCUS}`}
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <button
              ref={nextButtonRef}
              onClick={goNext}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3.5 text-base font-semibold text-white transition-colors hover:bg-purple-500 active:bg-purple-700 ${FOCUS}`}
            >
              <span>{isLast ? "Commencer" : "Suivant"}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
