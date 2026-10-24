"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, LifeBuoy, HelpCircle, Clock, ChevronRight } from "lucide-react";
import TicketStatusBadge from "@/components/TicketStatusBadge";
import { PageHeader } from "@/components/dashboard/DashboardUI";
import { hasPermission, PERMISSIONS } from "@/lib/roles";

interface Ticket {
  _id: string;
  subject: string;
  userName: string;
  category: string;
  status: string;
  updatedAt: string;
  messages: any[];
}

interface FaqArticle {
  _id: string;
  question: string;
}

interface Idea {
  _id: string;
  status: string;
}

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

// Répartition des tickets : l'ordre est celui du traitement (du plus urgent au clos).
const TICKET_SEGMENTS = [
  { key: "en_attente", label: "En attente", color: "bg-amber-400" },
  { key: "en_cours", label: "En cours", color: "bg-blue-400" },
  { key: "resolu", label: "Résolus", color: "bg-emerald-400" },
  { key: "ferme", label: "Fermés", color: "bg-zinc-500" },
] as const;

export default function AdminHomePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [articles, setArticles] = useState<FaqArticle[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [myRole, setMyRole] = useState<string>("user");

  const canManageFaq = hasPermission(myRole, PERMISSIONS.MANAGE_FAQ);
  const canManageTickets = hasPermission(myRole, PERMISSIONS.MANAGE_TICKETS);
  const canManageIdeas = hasPermission(myRole, PERMISSIONS.MANAGE_IDEAS);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => setMyRole(data.role || "user"))
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/tickets").then((r) => {
        if (r.status === 403) throw new Error("forbidden");
        return r.json();
      }),
      fetch("/api/faq").then((r) => r.json()),
      fetch("/api/ideas").then((r) => r.json()),
    ])
      .then(([ticketsData, faqData, ideasData]) => {
        setTickets(ticketsData.tickets || []);
        setArticles(faqData.articles || []);
        setIdeas(ideasData.ideas || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = { en_attente: 0, en_cours: 0, resolu: 0, ferme: 0 };
    for (const t of tickets) {
      map[t.status] = (map[t.status] || 0) + 1;
    }
    return map;
  }, [tickets]);

  const recentTickets = useMemo(() => tickets.slice(0, 5), [tickets]);
  const ideasEnEtude = useMemo(() => ideas.filter((i) => i.status === "en_etude").length, [ideas]);
  const treated = counts.resolu + counts.ferme;

  if (error) {
    return (
      <div role="alert" className="mx-auto mt-10 max-w-md rounded-2xl border border-red-500/25 bg-zinc-950/80 p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 text-red-400" size={32} />
        <h2 className="mb-2 text-lg font-bold">Accès refusé</h2>
        <p className="text-sm text-zinc-400">Cette section est réservée au staff.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Administration" title="Accueil" />

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center" aria-busy="true">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-purple-400" />
          <p className="text-sm text-zinc-400">Chargement des statistiques…</p>
        </div>
      ) : (
        <>
          {/* Ce qui attend une action : c'est la première chose qu'un modérateur doit voir. */}
          {(canManageTickets || canManageIdeas) && (
            <section>
              <h2 className="mb-4 font-display text-lg font-bold tracking-tight text-white">À traiter</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {canManageTickets && (
                  <TodoTile href="/admin/tickets" label="Tickets en attente" count={counts.en_attente} />
                )}
                {canManageIdeas && <TodoTile href="/admin/ideas" label="Idées à l'étude" count={ideasEnEtude} />}
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {canManageTickets && (
              <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] lg:col-span-2">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <h2 className="flex items-center gap-2.5 text-base font-semibold text-white">
                    <LifeBuoy size={16} className="text-purple-300" />
                    Tickets récents
                  </h2>
                  <Link
                    href="/admin/tickets"
                    className={`flex items-center gap-0.5 rounded text-sm font-medium text-purple-300 transition-colors hover:text-purple-200 ${FOCUS}`}
                  >
                    Tout voir
                    <ChevronRight size={14} />
                  </Link>
                </div>

                {recentTickets.length === 0 ? (
                  <p className="py-12 text-center text-sm text-zinc-400">Aucun ticket pour le moment.</p>
                ) : (
                  <ul className="divide-y divide-white/10">
                    {recentTickets.map((ticket) => (
                      <li key={ticket._id}>
                        <Link
                          href={`/admin/tickets/${ticket._id}`}
                          className={`group flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-white/[0.03] ${FOCUS}`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white transition-colors group-hover:text-purple-200">
                              {ticket.subject}
                            </p>
                            <div className="mt-1.5 flex items-center gap-3">
                              <TicketStatusBadge status={ticket.status} />
                              <span className="flex items-center gap-1 text-xs text-zinc-400">
                                <Clock size={11} />
                                {new Date(ticket.updatedAt).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                          </div>
                          <ChevronRight
                            size={16}
                            className="shrink-0 text-zinc-500 transition-all group-hover:translate-x-0.5 group-hover:text-purple-300"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <div className="space-y-6">
              {canManageTickets && (
                <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <h2 className="text-base font-semibold text-white">Répartition des tickets</h2>

                  <p className="mt-4 font-display text-4xl font-extrabold tabular-nums text-white">
                    {tickets.length === 0 ? "—" : `${Math.round((treated / tickets.length) * 100)} %`}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {treated} sur {tickets.length} tickets traités
                  </p>

                  {tickets.length > 0 && (
                    <div
                      role="img"
                      aria-label={TICKET_SEGMENTS.map((s) => `${counts[s.key]} ${s.label.toLowerCase()}`).join(", ")}
                      className="mt-5 flex h-2 overflow-hidden rounded-full bg-white/5"
                    >
                      {TICKET_SEGMENTS.map((s) =>
                        counts[s.key] > 0 ? (
                          <div key={s.key} className={s.color} style={{ width: `${(counts[s.key] / tickets.length) * 100}%` }} />
                        ) : null
                      )}
                    </div>
                  )}

                  <ul className="mt-4 space-y-2">
                    {TICKET_SEGMENTS.map((s) => (
                      <li key={s.key} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-zinc-300">
                          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${s.color}`} />
                          {s.label}
                        </span>
                        <span className="font-semibold tabular-nums text-white">{counts[s.key]}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {canManageFaq && (
                <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <h2 className="flex items-center gap-2.5 text-base font-semibold text-white">
                    <HelpCircle size={16} className="text-purple-300" />
                    Base de connaissances
                  </h2>
                  <p className="mt-4 font-display text-4xl font-extrabold tabular-nums text-white">{articles.length}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    article{articles.length > 1 ? "s" : ""} publié{articles.length > 1 ? "s" : ""}
                  </p>
                  <Link
                    href="/admin/faq"
                    className={`mt-5 flex w-full items-center justify-center rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:text-white ${FOCUS}`}
                  >
                    Gérer la FAQ
                  </Link>
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Tuile d'action : la bordure ambre apparaît seulement quand il y a quelque chose à traiter.
function TodoTile({ href, label, count }: { href: string; label: string; count: number }) {
  const pending = count > 0;
  return (
    <Link
      href={href}
      className={`group flex items-center justify-between gap-4 rounded-2xl border p-5 transition-colors ${FOCUS} ${
        pending
          ? "border-amber-400/30 bg-amber-400/[0.05] hover:border-amber-400/50"
          : "border-white/10 bg-white/[0.02] hover:border-white/20"
      }`}
    >
      <div>
        <p className="text-sm text-zinc-400">{label}</p>
        <p className="mt-1 font-display text-4xl font-extrabold tabular-nums text-white">{count}</p>
      </div>
      <span className={`flex items-center gap-1 text-sm font-medium ${pending ? "text-amber-300" : "text-zinc-400"}`}>
        {pending ? "Traiter" : "Tout est à jour"}
        <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
