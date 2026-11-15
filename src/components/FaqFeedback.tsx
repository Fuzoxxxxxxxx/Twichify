"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThumbsDown, ThumbsUp } from "lucide-react";

const STORAGE_KEY = "twichify-faq-feedback";
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

type Vote = "yes" | "no";

// Le choix du lecteur est gardé dans son navigateur : il retrouve sa réponse à la réouverture de l'article, et ne peut pas
// voter deux fois par erreur. Le stockage peut être indisponible (navigation privée, bloqué) : on s'en passe sans erreur.
function readVotes(): Record<string, Vote> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveVote(articleId: string, vote: Vote) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readVotes(), [articleId]: vote }));
  } catch {
    // Stockage indisponible : le retour est tout de même envoyé.
  }
}

/** « Cet article vous a-t-il aidé ? » : deux boutons anonymes, et un lien vers un ticket si la réponse ne convient pas. */
export default function FaqFeedback({ articleId }: { articleId: string }) {
  const [vote, setVote] = useState<Vote | null>(null);

  useEffect(() => {
    const stored = readVotes()[articleId];
    setVote(stored === "yes" || stored === "no" ? stored : null);
  }, [articleId]);

  const send = (next: Vote) => {
    if (vote) return;
    setVote(next);
    saveVote(articleId, next);
    // Meilleur effort : un échec réseau n'a pas à gêner le lecteur.
    fetch(`/api/faq/${articleId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ helpful: next === "yes" }),
    }).catch(() => {});
  };

  const buttonClass = (selected: boolean) =>
    `inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors disabled:cursor-default ${FOCUS} ${
      selected
        ? "border-purple-500/50 bg-purple-500/15 text-purple-100"
        : "border-white/10 text-zinc-300 hover:border-white/25 hover:text-white disabled:hover:border-white/10 disabled:hover:text-zinc-300"
    }`;

  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <p id={`faq-feedback-${articleId}`} className="text-sm text-zinc-400">
          Cet article vous a-t-il aidé ?
        </p>
        <div role="group" aria-labelledby={`faq-feedback-${articleId}`} className="flex gap-2">
          <button type="button" onClick={() => send("yes")} disabled={vote !== null} aria-pressed={vote === "yes"} className={buttonClass(vote === "yes")}>
            <ThumbsUp size={15} aria-hidden="true" />
            Oui
          </button>
          <button type="button" onClick={() => send("no")} disabled={vote !== null} aria-pressed={vote === "no"} className={buttonClass(vote === "no")}>
            <ThumbsDown size={15} aria-hidden="true" />
            Non
          </button>
        </div>
      </div>

      <div aria-live="polite">
        {vote === "yes" && <p className="mt-3 text-sm text-zinc-400">Merci pour votre retour.</p>}
        {vote === "no" && (
          <p className="mt-3 text-sm text-zinc-400">
            Merci, l'équipe en tient compte. Besoin d'une réponse précise ?{" "}
            <Link href="/support/new" className={`font-medium text-purple-300 underline-offset-2 hover:underline ${FOCUS}`}>
              Ouvrir un ticket
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
