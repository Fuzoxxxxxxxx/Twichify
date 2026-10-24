"use client";

import { useId, useState } from "react";
import { TrendingUp, TrendingDown, Disc3 } from "lucide-react";

/**
 * Composants partagés par les pages de statistiques (cartes de chiffres, panneaux, mini-courbes, pochettes).
 * Même style que la page Twitch : cartes sobres, bordure fine, pas de halo ni d'ombre lourde.
 */

export const TONES = {
  purple: "border-purple-500/20 bg-purple-500/5",
  emerald: "border-emerald-500/20 bg-emerald-500/5",
  amber: "border-amber-500/20 bg-amber-500/5",
  sky: "border-sky-500/20 bg-sky-500/5",
  rose: "border-rose-500/20 bg-rose-500/5",
} as const;
export type Tone = keyof typeof TONES;

export const SPARK_COLORS: Record<Tone, string> = {
  purple: "#a855f7",
  emerald: "#10b981",
  amber: "#f59e0b",
  sky: "#0ea5e9",
  rose: "#f43f5e",
};

// Mini-courbe d'une série de valeurs, sans axe ni légende.
export function Sparkline({ values, color }: { values: number[]; color: string }) {
  const gradientId = `spark-${useId().replace(/:/g, "")}`;
  if (values.length < 2) return null;

  const w = 100;
  const h = 28;
  const max = Math.max(1, ...values);
  const points = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - (v / max) * (h - 8)] as const);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-3 h-8 w-full" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill={`url(#${gradientId})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Variation en % par rapport à la période précédente (null = pas de comparaison possible). */
export function DeltaBadge({ value, suffix }: { value: number | null | undefined; suffix?: string }) {
  if (value == null) return null;
  const up = value > 0;
  const flat = value === 0;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={`inline-flex items-center gap-0.5 font-bold ${flat ? "text-zinc-400" : up ? "text-emerald-400" : "text-rose-400"}`}>
        {!flat && (up ? <TrendingUp size={11} /> : <TrendingDown size={11} />)}
        {up ? "+" : ""}
        {value} %
      </span>
      {suffix && <span>{suffix}</span>}
    </span>
  );
}

export function KpiCard({
  icon,
  label,
  value,
  sub,
  tone,
  spark,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: React.ReactNode;
  tone: Tone;
  spark?: number[];
}) {
  return (
    <div className="twichify-rise rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-lg border ${TONES[tone]}`}>{icon}</div>
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-white">{value}</p>
      {sub && <div className="mt-1 text-xs leading-snug text-zinc-400">{sub}</div>}
      {spark && <Sparkline values={spark} color={SPARK_COLORS[tone]} />}
    </div>
  );
}

export function Panel({ title, icon, right, children }: { title: string; icon: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="twichify-rise rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2.5 text-base font-semibold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">{icon}</span>
          {title}
        </p>
        {right}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ icon, text, hint }: { icon: React.ReactNode; text: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
      <div className="mx-auto mb-3 flex w-fit text-zinc-600">{icon}</div>
      <p className="text-sm text-zinc-300">{text}</p>
      {hint && <p className="mt-1 text-sm text-zinc-400">{hint}</p>}
    </div>
  );
}

// Pochette d'album avec repli (icône) si l'image manque ou ne charge pas.
export function Cover({ src, size = 40, className = "" }: { src: string | null | undefined; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const base = `shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 ${className}`;

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${base} object-cover`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div className={`${base} flex items-center justify-center`} style={{ width: size, height: size }}>
      <Disc3 size={Math.round(size * 0.4)} className="text-zinc-700" />
    </div>
  );
}
