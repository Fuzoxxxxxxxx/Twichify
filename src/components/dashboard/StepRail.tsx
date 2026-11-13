"use client";

import { useEffect, useId, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

// Suite d'étapes avec rail vertical : à n'utiliser que pour un vrai déroulé (Spotify, Bot), pas pour une simple liste.
//  - done    : étape terminée, repliée sur son résumé (un bouton permet de la revoir)
//  - current : étape à faire maintenant
//  - todo    : étape à venir
//  - plain   : étape numérotée sans suivi d'avancement

export type StepState = "done" | "current" | "todo" | "plain";

const CIRCLE: Record<StepState, string> = {
  done: "border-emerald-500/60 bg-emerald-500/15 text-emerald-300",
  current: "border-purple-400 bg-purple-500/15 text-purple-200",
  todo: "border-white/15 text-zinc-400",
  plain: "border-white/15 text-zinc-300",
};

const TITLE: Record<StepState, string> = {
  done: "text-zinc-400",
  current: "text-white",
  todo: "text-zinc-200",
  plain: "text-white",
};

export function StepRail({
  index,
  state,
  title,
  summary,
  children,
  last = false,
}: {
  index: number;
  state: StepState;
  title: string;
  /** Affiché sous le titre quand l'étape est terminée. */
  summary?: string;
  children?: React.ReactNode;
  last?: boolean;
}) {
  const panelId = useId();
  const collapsible = state === "done" && !!children;
  const [open, setOpen] = useState(state !== "done");

  // Une étape qui se termine se replie ; une étape qui redevient à faire se rouvre.
  useEffect(() => {
    setOpen(state !== "done");
  }, [state]);

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-colors duration-300 ${CIRCLE[state]}`}
        >
          {state === "done" ? <Check size={16} strokeWidth={3} aria-label="Terminée" /> : index}
        </div>
        {!last && <div className={`mt-1 w-px flex-1 ${state === "done" ? "bg-emerald-500/30" : "bg-white/10"}`} />}
      </div>

      <div className={`min-w-0 flex-1 ${last ? "" : "pb-8"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={`text-base font-semibold ${TITLE[state]}`}>{title}</h2>
            {state === "done" && summary && <p className="mt-0.5 text-sm text-zinc-400">{summary}</p>}
          </div>
          {collapsible && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls={panelId}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
            >
              {open ? "Replier" : "Revoir"}
              <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>

        {open && children && (
          <div id={panelId} className="mt-3 space-y-4 text-sm leading-relaxed text-zinc-400">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
