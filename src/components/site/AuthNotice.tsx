"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { RefreshCw, Home, HelpCircle, X, type LucideIcon } from "lucide-react";
import PublicShell from "@/components/site/PublicShell";

// Page de résultat d'une connexion Twitch qui n'a pas abouti (/auth/cancelled, /auth/not-linked) :
// un message, deux actions (réessayer, accueil) et une fenêtre d'explication ouverte à la demande.

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

const TONES = {
  purple: { icon: "text-purple-300", ring: "border-purple-500/30 bg-purple-500/10" },
  amber: { icon: "text-amber-300", ring: "border-amber-500/30 bg-amber-500/10" },
};

export interface AuthNoticeItem {
  icon: LucideIcon;
  title: string;
  text: string;
}

export default function AuthNotice({
  tone,
  icon: Icon,
  title,
  children,
  extra,
  helpLabel,
  modalTitle,
  modalSubtitle,
  modalItems,
}: {
  tone: keyof typeof TONES;
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  extra?: ReactNode;
  helpLabel: string;
  modalTitle: string;
  modalSubtitle: string;
  modalItems: AuthNoticeItem[];
}) {
  const [showModal, setShowModal] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const t = TONES[tone];

  // Fermeture avec Échap, et focus sur le bouton de fermeture à l'ouverture.
  useEffect(() => {
    if (!showModal) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModal]);

  return (
    <PublicShell width="max-w-xl">
      <div className="flex flex-col items-center py-12 text-center">
        <span className={`flex h-16 w-16 items-center justify-center rounded-2xl border ${t.ring}`}>
          <Icon size={30} className={t.icon} />
        </span>

        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{title}</h1>

        <div className="mt-4 max-w-md space-y-3 text-base leading-relaxed text-zinc-400">{children}</div>

        <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <button
            onClick={() => signIn("twitch", { callbackUrl: "/dashboard" })}
            className={`flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-purple-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-purple-500 sm:w-auto ${FOCUS}`}
          >
            <RefreshCw size={18} />
            Réessayer avec Twitch
          </button>

          <Link
            href="/"
            className={`flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 text-base font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:text-white sm:w-auto ${FOCUS}`}
          >
            <Home size={18} />
            Accueil
          </Link>
        </div>

        {extra}

        <div className="mt-12 w-full border-t border-white/10 pt-6">
          <button
            onClick={() => setShowModal(true)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded text-sm text-zinc-400 transition-colors hover:text-purple-300 ${FOCUS}`}
          >
            <HelpCircle size={15} />
            {helpLabel}
          </button>
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 text-left shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
          >
            <button
              ref={closeRef}
              onClick={() => setShowModal(false)}
              className={`absolute right-4 top-4 cursor-pointer rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white ${FOCUS}`}
              aria-label="Fermer la fenêtre"
            >
              <X size={16} />
            </button>

            <h2 id="auth-modal-title" className="pr-10 font-display text-xl font-bold text-white">
              {modalTitle}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">{modalSubtitle}</p>

            <ul className="my-6 space-y-4">
              {modalItems.map(({ icon: ItemIcon, title: itemTitle, text }) => (
                <li key={itemTitle} className="flex items-start gap-3">
                  <ItemIcon size={18} className={`mt-0.5 shrink-0 ${t.icon}`} aria-hidden="true" />
                  <div className="text-sm leading-relaxed text-zinc-400">
                    <strong className="block font-semibold text-white">{itemTitle}</strong>
                    {text}
                  </div>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setShowModal(false)}
              className={`w-full cursor-pointer rounded-xl border border-white/15 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:text-white ${FOCUS}`}
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </PublicShell>
  );
}
