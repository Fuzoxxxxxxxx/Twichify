"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

// Composants UI partagés entre toutes les pages du dashboard utilisateur
// (Accueil, Spotify, Bot, Widget musique, Widget chat, Statistiques).

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
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400 mb-2">{eyebrow}</p>
        <h1 className="text-4xl font-black tracking-tighter text-white">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "emerald" | "amber" | "purple" }) {
  const toneMap = {
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    amber: "border-amber-500/20 bg-amber-500/5",
    purple: "border-purple-500/20 bg-purple-500/5",
  };

  return (
    <div className={`rounded-[24px] border ${toneMap[tone]} p-5 shadow-xl shadow-black/20`}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950/70 border border-zinc-800">{icon}</div>
      <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-black tracking-tighter text-white">{value}</p>
    </div>
  );
}

export function SourceCard({
  icon,
  label,
  statusText,
  gradient,
  glow,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  statusText: string;
  gradient: string;
  glow: string;
  onClick: () => void;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950/60 p-6 shadow-2xl shadow-black/30 cursor-pointer transition hover:border-white/10 flex flex-col justify-between"
      onClick={onClick}
    >
      <div className={`absolute -top-10 -right-10 h-40 w-40 rounded-full ${glow} blur-3xl pointer-events-none`} />
      <div className="relative flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
            {icon}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">OBS Source</p>
            <p className="text-base font-bold text-white">{label}</p>
          </div>
        </div>
        <ExternalLink size={20} className="text-zinc-400 group-hover:text-white transition" />
      </div>
      <p className="text-xs text-zinc-400 bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-800/80 font-mono truncate">
        {statusText}
      </p>
    </div>
  );
}

export function QuickAction({ icon, title, subtitle, onClick }: { icon: React.ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center justify-between rounded-[28px] border border-zinc-800 bg-zinc-950/60 p-6 text-left transition hover:border-purple-500/40 hover:bg-zinc-950/80"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800">{icon}</div>
        <div>
          <h3 className="text-base font-bold text-white">{title}</h3>
          <p className="text-sm text-zinc-500">{subtitle}</p>
        </div>
      </div>
      <span className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">Ouvrir</span>
    </button>
  );
}

export function QuickActionLink({ icon, title, subtitle, href }: { icon: React.ReactNode; title: string; subtitle: string; href: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-[28px] border border-zinc-800 bg-zinc-950/60 p-6 text-left transition hover:border-purple-500/40 hover:bg-zinc-950/80"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800">{icon}</div>
        <div>
          <h3 className="text-base font-bold text-white">{title}</h3>
          <p className="text-sm text-zinc-500">{subtitle}</p>
        </div>
      </div>
      <span className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">Ouvrir</span>
    </Link>
  );
}

export function InfoStep({ step, title, text, href, tone = "purple" }: { step: string; title: string; text: string; href: string; tone?: "purple" | "amber" }) {
  const toneMap = {
    purple: "border-purple-500/20 bg-purple-500/10 text-purple-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${toneMap[tone]}`}>{step}</span>
      <h3 className="mt-3 text-base font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{text}</p>
      <a href={href} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-purple-300">
        Ouvrir <ExternalLink size={12} />
      </a>
    </div>
  );
}

export function SliderRow({ label, value, onChange, suffix, max, min = 0 }: { label: string; value: string; onChange: (value: string) => void; suffix: string; max: number; min?: number }) {
  const numValue = Number(value) || 0;
  const percent = Math.min(100, Math.max(0, ((numValue - min) / (max - min || 1)) * 100));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
        <span>{label}</span>
        <span className="rounded-md bg-purple-600 px-2 py-1 text-white font-mono">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="twichify-slider h-1.5 w-full cursor-pointer"
        style={{ background: `linear-gradient(to right, #9333ea ${percent}%, #3f3f46 ${percent}%)` }}
      />
    </div>
  );
}
