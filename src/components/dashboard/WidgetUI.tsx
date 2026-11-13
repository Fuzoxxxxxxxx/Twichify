"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";

// Briques partagées par l'Accueil, la page Spotify et la page Bot : état d'un widget, lien masquable, boutons.

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

// Le serveur n'écrit la date de chargement d'un widget qu'une fois par minute : au-delà de ~2,5 min sans signe,
// il est considéré hors ligne (même seuil que l'assistant d'installation).
export const LIVE_WINDOW_MS = 150_000;

// Durée pendant laquelle un lien reste affiché en clair avant de se masquer de nouveau (partage d'écran).
const REVEAL_MS = 20_000;
const MASK = "••••••••••••";

export function ago(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 10) return "à l'instant";
  if (s < 60) return `il y a ${s} s`;
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

// Bouton secondaire (lien ou bouton) : même gabarit partout dans le dashboard.
export const ACTION_BTN = `inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-purple-500/50 hover:text-white ${FOCUS}`;

// ── État ──
// live = en service (pastille qui pulse) · ok = en règle · seen = a déjà fonctionné · idle = rien à signaler · warn = à configurer.
const PILL = {
  live: { dot: "bg-emerald-400", text: "text-emerald-300", pulse: true },
  ok: { dot: "bg-emerald-400", text: "text-emerald-300", pulse: false },
  seen: { dot: "bg-zinc-500", text: "text-zinc-300", pulse: false },
  idle: { dot: "bg-zinc-600", text: "text-zinc-400", pulse: false },
  warn: { dot: "bg-amber-400", text: "text-amber-200", pulse: false },
} as const;

export type PillTone = keyof typeof PILL;

export function StatusDot({ tone, className = "h-2 w-2" }: { tone: PillTone; className?: string }) {
  const t = PILL[tone];
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 rounded-full ${className} ${t.dot} ${t.pulse ? "motion-safe:animate-pulse" : ""}`}
    />
  );
}

export function StatusPill({
  tone,
  children,
  detail,
}: {
  tone: PillTone;
  children: React.ReactNode;
  detail?: string;
}) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 text-sm font-medium ${PILL[tone].text}`}>
      <StatusDot tone={tone} />
      {children}
      {detail && <span className="font-normal text-zinc-400">{detail}</span>}
    </span>
  );
}

// ── Lien masquable ──
// Les liens OBS et les commandes bot contiennent le jeton du compte : affichés masqués par défaut (un partage d'écran ne
// les fait plus fuiter), complets au clic sur l'œil pendant 20 s, et toujours copiés en entier.
const CODE_TONE = {
  neutral: "text-zinc-200",
  purple: "text-purple-200",
  emerald: "text-emerald-200",
} as const;

export function MaskedField({
  value,
  secret,
  label,
  tone = "neutral",
  wrap = false,
}: {
  value: string;
  /** Partie à masquer dans `value` (le jeton). Sans elle, le champ n'a pas de bouton œil. */
  secret?: string | null;
  label: string;
  tone?: keyof typeof CODE_TONE;
  /** true : le texte passe à la ligne (script long) ; false : une seule ligne tronquée. */
  wrap?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  const canMask = !!secret && value.includes(secret);
  const shown = canMask && !revealed ? value.split(secret as string).join(MASK) : value;

  const toggleReveal = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (revealed) {
      setRevealed(false);
      return;
    }
    setRevealed(true);
    hideTimer.current = setTimeout(() => setRevealed(false), REVEAL_MS);
  };

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div role="group" aria-label={label} className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/30 p-2 pl-3.5">
      <code
        className={`min-w-0 flex-1 py-1.5 font-mono text-xs leading-relaxed ${CODE_TONE[tone]} ${
          wrap ? "whitespace-pre-wrap break-all" : "truncate"
        }`}
      >
        {shown || "Lien indisponible : recharge la page"}
      </code>
      <div className="flex shrink-0 items-center gap-1">
        {canMask && (
          <button
            type="button"
            onClick={toggleReveal}
            aria-pressed={revealed}
            aria-label={revealed ? "Masquer le lien" : "Afficher le lien en entier"}
            title={revealed ? "Masquer le lien" : "Afficher le lien en entier (20 s)"}
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-white ${FOCUS}`}
          >
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        <button
          type="button"
          onClick={copy}
          disabled={!value}
          aria-label={`Copier : ${label}`}
          className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS} ${
            copied ? "bg-emerald-500/20 text-emerald-200" : "bg-purple-600 text-white hover:bg-purple-500"
          }`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <span role="status" className="sr-only">
        {copied ? "Copié dans le presse-papiers" : ""}
      </span>
    </div>
  );
}
