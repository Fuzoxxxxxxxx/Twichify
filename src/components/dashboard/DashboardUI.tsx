"use client";

import Link from "next/link";
import { ExternalLink, AlertTriangle, RotateCw } from "lucide-react";

// Composants UI partagés entre toutes les pages du dashboard utilisateur
// (Accueil, Spotify, Bot, Widget musique, Widget chat, Statistiques).

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

// `eyebrow` = la section du menu à laquelle la page appartient (Widgets, Analyse…) : un repère de lieu, pas un décor.
export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="mb-2 text-sm text-zinc-500">{eyebrow}</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-white">{title}</h1>
      </div>
      {action}
    </div>
  );
}

// ── États de chargement partagés ──
// Une page qui dépend des réglages de l'utilisateur affiche DashboardLoading tant qu'ils ne sont pas arrivés : jamais de valeurs
// par défaut en dur qui sauteraient ensuite vers les vraies. Si le chargement échoue, DashboardLoadError remplace la page, ce qui
// évite aussi d'enregistrer par erreur ces valeurs par défaut par-dessus la vraie configuration.

export function DashboardLoading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <PageHeader eyebrow={eyebrow} title={title} />
      <div className="twichify-skeleton h-24 rounded-2xl border border-white/5" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="twichify-skeleton h-32 rounded-2xl border border-white/5" />
        ))}
      </div>
      <div className="twichify-skeleton h-72 rounded-2xl border border-white/5" />
      <span className="sr-only">Chargement de tes réglages…</span>
    </div>
  );
}

export function DashboardLoadError({ eyebrow, title, onRetry }: { eyebrow: string; title: string; onRetry: () => void }) {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={eyebrow} title={title} />
      <div
        role="alert"
        className="flex flex-col items-start gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-200">Impossible de charger tes réglages</p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-400">
              Rien n'a été modifié. Vérifie ta connexion puis réessaie : la page reste bloquée pour ne pas remplacer ta configuration par des valeurs par défaut.
            </p>
          </div>
        </div>
        <button
          onClick={onRetry}
          className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 ${FOCUS}`}
        >
          <RotateCw size={14} /> Réessayer
        </button>
      </div>
    </div>
  );
}

// La couleur de la pastille porte l'état : vert = en service, ambre = à configurer, violet = information.
const STAT_DOT = {
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  purple: "bg-purple-400",
} as const;

export function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "emerald" | "amber" | "purple" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">{icon}</div>
      <p className="flex items-center gap-2 text-sm text-zinc-400">
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${STAT_DOT[tone]}`} />
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tracking-tight text-white">{value}</p>
    </div>
  );
}

// `glow` est conservé dans les props pour ne pas casser les pages existantes, mais n'est plus utilisé : le halo décoratif a disparu.
export function SourceCard({
  icon,
  label,
  statusText,
  gradient,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  statusText: string;
  gradient: string;
  glow?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full cursor-pointer flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left transition-colors hover:border-white/20 hover:bg-white/[0.04] ${FOCUS}`}
    >
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-zinc-400">Source OBS</p>
          <p className="truncate text-base font-semibold text-white">{label}</p>
        </div>
        <ExternalLink size={18} className="shrink-0 text-zinc-500 transition-colors group-hover:text-white" />
      </div>
      <p className="truncate rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-zinc-300">
        {statusText}
      </p>
    </button>
  );
}

const ACTION_CLASS = `group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left transition-colors hover:border-purple-500/40 hover:bg-white/[0.04] ${FOCUS}`;

function ActionContent({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <>
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">{icon}</div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="text-sm text-zinc-400">{subtitle}</p>
        </div>
      </div>
      <span className="shrink-0 text-sm font-medium text-purple-300 transition-colors group-hover:text-purple-200">Ouvrir</span>
    </>
  );
}

export function QuickAction({ icon, title, subtitle, onClick }: { icon: React.ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${ACTION_CLASS} cursor-pointer`}>
      <ActionContent icon={icon} title={title} subtitle={subtitle} />
    </button>
  );
}

export function QuickActionLink({ icon, title, subtitle, href }: { icon: React.ReactNode; title: string; subtitle: string; href: string }) {
  return (
    <Link href={href} className={ACTION_CLASS}>
      <ActionContent icon={icon} title={title} subtitle={subtitle} />
    </Link>
  );
}

export function InfoStep({ step, title, text, href, tone = "purple" }: { step: string; title: string; text: string; href: string; tone?: "purple" | "amber" }) {
  const toneMap = {
    purple: "border-purple-500/25 bg-purple-500/10 text-purple-200",
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-200",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${toneMap[tone]}`}>{step}</span>
      <h3 className="mt-3 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{text}</p>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={`mt-4 inline-flex items-center gap-2 text-sm font-medium text-purple-300 underline-offset-4 hover:underline ${FOCUS}`}
      >
        Ouvrir <ExternalLink size={13} />
      </a>
    </div>
  );
}

export function SliderRow({ label, value, onChange, suffix, max, min = 0 }: { label: string; value: string; onChange: (value: string) => void; suffix: string; max: number; min?: number }) {
  const numValue = Number(value) || 0;
  const percent = Math.min(100, Math.max(0, ((numValue - min) / (max - min || 1)) * 100));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>{label}</span>
        <span className="rounded-md bg-purple-600 px-2 py-0.5 font-mono text-xs font-semibold text-white">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="twichify-slider h-1.5 w-full cursor-pointer"
        style={{ background: `linear-gradient(to right, #9333ea ${percent}%, #3f3f46 ${percent}%)` }}
      />
    </div>
  );
}
