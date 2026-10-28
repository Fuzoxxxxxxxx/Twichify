"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BarChart3, Clock, CheckCircle2, Hourglass, LifeBuoy, Loader2, Tag, Users, Inbox, ThumbsUp, ThumbsDown } from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardUI";
import { KpiCard, Panel, EmptyState } from "@/components/dashboard/StatsUI";
import type { Backlog, DailyPoint, NegativeFeedback, PeriodStats, StaffActivity } from "@/lib/support-stats";

interface StatsResponse {
  days: 7 | 30 | 90;
  generatedAt: string;
  current: PeriodStats;
  previous: {
    created: number;
    resolutionRate: number | null;
    avgFirstResponseMs: number | null;
    medianResolutionMs: number | null;
    satisfactionRate: number | null;
  };
  daily: DailyPoint[];
  backlog: Backlog;
  staff: StaffActivity[];
  negativeFeedback: NegativeFeedback[];
}

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

const PERIODS = [
  { value: 7, label: "7 jours" },
  { value: 30, label: "30 jours" },
  { value: 90, label: "90 jours" },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  spotify: "Spotify",
  obs: "OBS / Widget",
  api: "API / Clés",
  compte: "Compte",
  autre: "Autre",
};

const STATUS_SEGMENTS = [
  { key: "en_attente", label: "En attente", color: "bg-amber-400" },
  { key: "en_cours", label: "En cours", color: "bg-blue-400" },
  { key: "resolu", label: "Résolus", color: "bg-emerald-400" },
  { key: "ferme", label: "Fermés", color: "bg-zinc-500" },
] as const;

const ROLE_LABELS: Record<string, string> = {
  creator: "Créateur",
  co_creator: "Co-créateur",
  admin: "Admin",
  moderator: "Modérateur",
  helper: "Helper",
};

// 90 secondes → « 1 min », 5 400 s → « 1 h 30 », 2 jours et demi → « 2 j 12 h ».
function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "–";
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours} h ${String(rest).padStart(2, "0")}` : `${hours} h`;
  }
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours ? `${days} j ${restHours} h` : `${days} j`;
}

const formatPercent = (rate: number | null) => (rate == null ? "–" : `${Math.round(rate * 100)} %`);

// Variation par rapport à la période précédente. `better` indique le sens qui est une bonne nouvelle :
// moins d'attente est positif, plus de tickets n'est ni bon ni mauvais.
function Delta({
  now,
  before,
  better,
  unit = "%",
}: {
  now: number | null | undefined;
  before: number | null | undefined;
  better: "up" | "down" | "neutral";
  unit?: "%" | "pts";
}) {
  if (now == null || before == null || (unit === "%" && before === 0)) {
    return <span>Pas de comparaison possible</span>;
  }
  const change = unit === "%" ? Math.round(((now - before) / before) * 100) : Math.round((now - before) * 100);
  if (change === 0) return <span>Stable par rapport à la période précédente</span>;

  const up = change > 0;
  const good = better === "neutral" ? null : (better === "up") === up;
  const color = good === null ? "text-zinc-300" : good ? "text-emerald-400" : "text-rose-400";

  return (
    <span>
      <span className={`font-semibold tabular-nums ${color}`}>
        {up ? "+" : "−"}
        {Math.abs(change)} {unit}
      </span>{" "}
      par rapport à la période précédente
    </span>
  );
}

function DailyChart({ data }: { data: DailyPoint[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.created, d.closed]));
  const totalCreated = data.reduce((sum, d) => sum + d.created, 0);
  const totalClosed = data.reduce((sum, d) => sum + d.closed, 0);
  const peak = data.reduce((best, d) => (d.created > best.created ? d : best), data[0]);
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <div>
      <div
        role="img"
        aria-label={`Tickets par jour : ${totalCreated} créés et ${totalClosed} clôturés sur ${data.length} jours. Pic de création le ${fmt(peak.date)} avec ${peak.created} ticket${peak.created > 1 ? "s" : ""}.`}
        className="flex h-44 items-end gap-px"
      >
        {data.map((d) => (
          <div key={d.date} className="flex h-full flex-1 items-end justify-center gap-px" title={`${fmt(d.date)} : ${d.created} créé${d.created > 1 ? "s" : ""}, ${d.closed} clôturé${d.closed > 1 ? "s" : ""}`}>
            <div className="w-1/2 min-w-px rounded-t-sm bg-purple-400" style={{ height: `${(d.created / max) * 100}%`, minHeight: d.created ? 2 : 0 }} />
            <div className="w-1/2 min-w-px rounded-t-sm bg-emerald-400" style={{ height: `${(d.closed / max) * 100}%`, minHeight: d.closed ? 2 : 0 }} />
          </div>
        ))}
      </div>

      <div className="mt-2 flex justify-between text-xs text-zinc-400">
        <span>{fmt(data[0].date)}</span>
        <span>{fmt(data[data.length - 1].date)}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-zinc-400">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-purple-400" /> Créés ({totalCreated})
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> Clôturés ({totalClosed})
        </span>
      </div>
    </div>
  );
}

export default function AdminSupportStatsPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"forbidden" | "failed" | null>(null);

  const load = useCallback(async (period: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/support/stats?days=${period}`, { cache: "no-store" });
      if (res.status === 403) {
        setError("forbidden");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
    } catch {
      setError("failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  if (error === "forbidden") {
    return (
      <div role="alert" className="mx-auto mt-10 max-w-md rounded-2xl border border-red-500/25 bg-white/[0.02] p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 text-red-400" size={32} />
        <h2 className="mb-2 text-lg font-bold">Accès refusé</h2>
        <p className="text-sm text-zinc-400">Ton rôle ne permet pas de consulter les statistiques du support.</p>
      </div>
    );
  }

  const periodPicker = (
    <div role="group" aria-label="Période" className="flex w-fit gap-1 rounded-xl border border-white/10 p-1">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => setDays(p.value)}
          aria-pressed={days === p.value}
          className={`cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${FOCUS} ${
            days === p.value ? "bg-purple-600/25 text-purple-200" : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  const header = <PageHeader eyebrow="Support" title="Statistiques" action={periodPicker} />;

  if (!data && loading) {
    return (
      <div className="space-y-8" aria-busy="true">
        {header}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-purple-400" />
          <p className="text-sm text-zinc-400">Calcul des statistiques...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-8">
        {header}
        <div role="alert" className="flex flex-col items-start gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-100">Impossible de charger les statistiques du support.</p>
          <button
            onClick={() => load(days)}
            className={`cursor-pointer rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 ${FOCUS}`}
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const { current, previous, daily, backlog, staff, negativeFeedback } = data;
  const oldest = backlog.oldestWaiting[0];
  const categoryEntries = Object.entries(current.byCategory).sort((a, b) => b[1] - a[1]);
  const maxCategory = Math.max(1, ...categoryEntries.map(([, n]) => n));

  return (
    <div className={`space-y-8 transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
      {header}

      {current.created === 0 && backlog.open === 0 ? (
        <EmptyState
          icon={<Inbox size={28} />}
          text="Aucun ticket sur cette période."
          hint="Essaie une période plus longue, ou reviens quand des demandes arriveront."
        />
      ) : (
        <>
          {/* Chiffres clés */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard
              icon={<LifeBuoy size={16} className="text-purple-300" />}
              label="Tickets créés"
              value={String(current.created)}
              tone="purple"
              sub={<Delta now={current.created} before={previous.created} better="neutral" />}
              spark={daily.map((d) => d.created)}
            />
            <KpiCard
              icon={<Clock size={16} className="text-sky-300" />}
              label="Premier retour (médiane)"
              value={formatDuration(current.medianFirstResponseMs)}
              tone="sky"
              sub={
                <>
                  <span className="block">
                    Moyenne {formatDuration(current.avgFirstResponseMs)}
                    {current.answeredWithin24hRate != null && ` · ${formatPercent(current.answeredWithin24hRate)} en moins de 24 h`}
                  </span>
                  <span className="mt-0.5 block">
                    {current.unanswered > 0 ? `${current.unanswered} sans réponse du staff` : "Tous les tickets ont reçu une réponse"}
                  </span>
                </>
              }
            />
            <KpiCard
              icon={<CheckCircle2 size={16} className="text-emerald-300" />}
              label="Taux de résolution"
              value={formatPercent(current.resolutionRate)}
              tone="emerald"
              sub={
                <>
                  <span className="block">
                    {current.closed} clôturé{current.closed > 1 ? "s" : ""} · délai médian {formatDuration(current.medianResolutionMs)}
                  </span>
                  <span className="mt-0.5 block">
                    <Delta now={current.resolutionRate} before={previous.resolutionRate} better="up" unit="pts" />
                  </span>
                </>
              }
            />
            <KpiCard
              icon={<ThumbsUp size={16} className="text-emerald-300" />}
              label="Satisfaction"
              value={formatPercent(current.satisfactionRate)}
              tone="emerald"
              sub={
                <>
                  <span className="block">
                    {current.rated === 0
                      ? "Aucune réponse à l'enquête"
                      : `${current.satisfied} sur ${current.rated} disent que c'est réglé`}
                  </span>
                  <span className="mt-0.5 block">
                    {current.rated} réponse{current.rated > 1 ? "s" : ""} pour {current.closed} ticket{current.closed > 1 ? "s" : ""} clôturé{current.closed > 1 ? "s" : ""}
                  </span>
                  <span className="mt-0.5 block">
                    <Delta now={current.satisfactionRate} before={previous.satisfactionRate} better="up" unit="pts" />
                  </span>
                </>
              }
            />
            <KpiCard
              icon={<Hourglass size={16} className={backlog.waiting > 0 ? "text-amber-300" : "text-emerald-300"} />}
              label="En attente d'une réponse"
              value={String(backlog.waiting)}
              tone={backlog.waiting > 0 ? "amber" : "emerald"}
              sub={
                <>
                  <span className="block">
                    {backlog.inProgress} en cours · {backlog.open} ouvert{backlog.open > 1 ? "s" : ""} au total
                  </span>
                  <span className="mt-0.5 block">{oldest ? `Le plus ancien attend depuis ${formatDuration(oldest.ageMs)}` : "Aucun ticket en attente"}</span>
                </>
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Panel title="Tickets par jour" icon={<BarChart3 size={15} className="text-purple-300" />}>
                {current.created === 0 ? (
                  <p className="py-8 text-center text-sm text-zinc-400">Aucun ticket créé sur la période.</p>
                ) : (
                  <DailyChart data={daily} />
                )}
              </Panel>
            </div>

            <Panel title="Par catégorie" icon={<Tag size={15} className="text-sky-300" />}>
              {categoryEntries.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-400">Aucune donnée.</p>
              ) : (
                <ul className="space-y-3.5">
                  {categoryEntries.map(([key, count]) => (
                    <li key={key}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="text-zinc-300">{CATEGORY_LABELS[key] ?? key}</span>
                        <span className="font-semibold tabular-nums text-white">
                          {count} <span className="font-normal text-zinc-400">({Math.round((count / current.created) * 100)} %)</span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-sky-400" style={{ width: `${(count / maxCategory) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel title="Répartition par statut" icon={<LifeBuoy size={15} className="text-purple-300" />}>
              {current.created === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-400">Aucun ticket sur la période.</p>
              ) : (
                <>
                  <div
                    role="img"
                    aria-label={STATUS_SEGMENTS.map((s) => `${current.byStatus[s.key] || 0} ${s.label.toLowerCase()}`).join(", ")}
                    className="flex h-2 overflow-hidden rounded-full bg-white/5"
                  >
                    {STATUS_SEGMENTS.map((s) =>
                      current.byStatus[s.key] ? (
                        <div key={s.key} className={s.color} style={{ width: `${(current.byStatus[s.key] / current.created) * 100}%` }} />
                      ) : null
                    )}
                  </div>
                  <ul className="mt-4 space-y-2">
                    {STATUS_SEGMENTS.map((s) => (
                      <li key={s.key} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-zinc-300">
                          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${s.color}`} />
                          {s.label}
                        </span>
                        <span className="font-semibold tabular-nums text-white">{current.byStatus[s.key] || 0}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>

            <Panel title="Attendent depuis le plus longtemps" icon={<Hourglass size={15} className="text-amber-300" />}>
              {backlog.oldestWaiting.length === 0 ? (
                <p className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-300">
                  <CheckCircle2 size={16} className="text-emerald-400" /> Aucun ticket en attente.
                </p>
              ) : (
                <ul className="-my-2 divide-y divide-white/10">
                  {backlog.oldestWaiting.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/admin/tickets/${t.id}`}
                        className={`flex items-center justify-between gap-3 rounded py-3 transition-colors hover:text-white ${FOCUS}`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-zinc-100">{t.subject}</span>
                          <span className="block text-xs text-zinc-400">{CATEGORY_LABELS[t.category] ?? t.category}</span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-amber-300">{formatDuration(t.ageMs)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Activité du staff" icon={<Users size={15} className="text-emerald-300" />}>
              {staff.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-400">Aucune réponse du staff sur la période.</p>
              ) : (
                <div className="-mx-2 overflow-x-auto">
                  <table className="w-full min-w-[300px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-400">
                        <th scope="col" className="px-2 pb-2 font-medium">Membre</th>
                        <th scope="col" className="px-2 pb-2 text-right font-medium">Réponses</th>
                        <th scope="col" className="px-2 pb-2 text-right font-medium" title="Tickets pour lesquels cette personne a répondu en premier">
                          Premières
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((s) => (
                        <tr key={s.id} className="border-b border-white/10 last:border-0">
                          <td className="px-2 py-2.5">
                            <span className="block font-medium text-zinc-100">{s.name}</span>
                            <span className="block text-xs text-zinc-400">
                              {ROLE_LABELS[s.role] ?? s.role} · {s.tickets} ticket{s.tickets > 1 ? "s" : ""}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-white">{s.replies}</td>
                          <td className="px-2 py-2.5 text-right tabular-nums text-zinc-300">{s.firstResponses}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          {negativeFeedback.length > 0 && (
            <Panel title="Problèmes non réglés signalés" icon={<ThumbsDown size={15} className="text-rose-300" />}>
              <ul className="-my-2 divide-y divide-white/10">
                {negativeFeedback.map((f) => (
                  <li key={f.id}>
                    <Link
                      href={`/admin/tickets/${f.id}`}
                      className={`block rounded py-3 transition-colors hover:text-white ${FOCUS}`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-sm font-medium text-zinc-100">{f.subject}</span>
                        <span className="shrink-0 text-xs text-zinc-400">
                          {new Date(f.ratedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </span>
                      </span>
                      <span className={`mt-1 block text-sm leading-relaxed ${f.comment ? "text-zinc-300" : "italic text-zinc-500"}`}>
                        {f.comment || "Sans commentaire"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <p className="text-sm text-zinc-400">
            Calculé le {new Date(data.generatedAt).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}. Les délais se
            comptent depuis la création du ticket jusqu'à la première réponse d'un membre du staff, et jusqu'au dernier message système de clôture pour la résolution.
          </p>
        </>
      )}
    </div>
  );
}
