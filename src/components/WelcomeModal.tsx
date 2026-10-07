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
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
        <div className="relative rounded-3xl bg-gradient-to-b from-purple-500/20 via-zinc-800/40 to-zinc-900/80 p-[1px] shadow-2xl shadow-purple-950/50">
          <div className="relative overflow-hidden rounded-[23px] bg-zinc-950/95 p-6 sm:p-8">
            <div className="pointer-events-none absolute top-0 left-1/2 h-24 w-3/4 -translate-x-1/2 rounded-full bg-purple-600/10 blur-2xl" />

            <div className="relative">
              {/* Skip */}
              {!isLast && (
                <button
                  onClick={onFinish}
                  className="absolute -top-1 right-0 text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-300 cursor-pointer"
                >
                  Passer
                </button>
              )}

              {/* Icône + badge d'étape */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-400 shadow-sm">
                  <Icon size={24} />
                </div>
                <span className="inline-flex items-center rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-purple-300">
                  {current.eyebrow}
                </span>
              </div>

              <h2 id="welcome-modal-title" className="mb-2 text-xl font-bold tracking-tight text-white">
                {current.title}
              </h2>
              <p className="mb-4 text-xs leading-relaxed text-zinc-400">{current.description}</p>

              {current.bullets && (
                <ul className="mb-4 space-y-1.5">
                  {current.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-xs text-zinc-300">
                      <Check size={13} className="mt-0.5 shrink-0 text-purple-400" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}

              {current.link && (
                <Link
                  href={current.link.href}
                  onClick={onFinish}
                  className="mb-6 flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-xs font-medium text-zinc-300 transition-all hover:border-purple-500/40 hover:bg-purple-500/5 hover:text-white group"
                >
                  <span>{current.link.label}</span>
                  <ExternalLink size={13} className="text-zinc-600 transition-colors group-hover:text-purple-400" />
                </Link>
              )}

              {/* Progression */}
              <div className="mb-6 flex items-center justify-center gap-1.5">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step ? "w-6 bg-purple-500" : i < step ? "w-1.5 bg-purple-500/50" : "w-1.5 bg-zinc-700"
                    }`}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-2.5">
                {!isFirst && (
                  <button
                    onClick={() => setStep((s) => Math.max(s - 1, 0))}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3.5 text-xs font-bold text-zinc-300 transition-all hover:border-zinc-700 hover:text-white cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                  </button>
                )}
                <button
                  ref={nextButtonRef}
                  onClick={goNext}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3.5 text-xs font-bold text-white shadow-lg shadow-purple-600/25 transition-all hover:bg-purple-500 hover:shadow-purple-600/35 active:bg-purple-700 cursor-pointer"
                >
                  <span>{isLast ? "Commencer" : "Suivant"}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
