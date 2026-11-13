"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { LifeBuoy, HelpCircle, Clock, ChevronRight, MessageSquare, AlertTriangle } from "lucide-react";
import TicketStatusBadge from "@/components/TicketStatusBadge";
import { PageHeader } from "@/components/dashboard/DashboardUI";
import {
  AccessDenied,
  BTN_SECONDARY,
  EmptyPanel,
  FOCUS,
  LoadingPanel,
  SectionCard,
  STATUS_RAIL,
  StatTile,
  timeAgo,
} from "@/components/admin/AdminUI";
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

// Service tel que le renvoie /api/status, et incident tel que le renvoie /api/admin/incidents (seuls les champs utiles ici).
interface LiveService {
  name: string;
  status: string;
}

interface OpenIncident {
  service: string;
  status: string;
}

// Réponse JSON, ou objet vide si la requête échoue (403, réseau…) : chaque source de l'accueil est indépendante.
// Type de retour explicite : sans lui, TypeScript réduit le résultat à `{}` et refuse l'accès aux champs.
async function fetchJsonOrEmpty(url: string): Promise<any> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    return res.ok ? await res.json() : {};
  } catch {
    return {};
  }
}

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
  const [services, setServices] = useState<LiveService[]>([]);
  const [incidents, setIncidents] = useState<OpenIncident[]>([]);
  const [loading, setLoading] = useState(true);
  // null tant que le rôle n'est pas connu : on ne décide de rien avant.
  const [myRole, setMyRole] = useState<string | null>(null);

  const canManageFaq = myRole !== null && hasPermission(myRole, PERMISSIONS.MANAGE_FAQ);
  const canManageTickets = myRole !== null && hasPermission(myRole, PERMISSIONS.MANAGE_TICKETS);
  const canManageIdeas = myRole !== null && hasPermission(myRole, PERMISSIONS.MANAGE_IDEAS);
  const canManageStatus = myRole !== null && hasPermission(myRole, PERMISSIONS.MANAGE_STATUS);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => setMyRole(data.role || "user"))
      .catch(() => setMyRole("user"));
  }, []);

  // Chaque source est indépendante : un rôle sans accès aux tickets (403) ne doit pas bloquer le reste de l'accueil.
  useEffect(() => {
    Promise.all([
      fetchJsonOrEmpty("/api/admin/tickets"),
      fetchJsonOrEmpty("/api/faq"),
      fetchJsonOrEmpty("/api/ideas"),
    ])
      .then(([ticketsData, faqData, ideasData]) => {
        setTickets(ticketsData.tickets || []);
        setArticles(faqData.articles || []);
        setIdeas(ideasData.ideas || []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Page de statut : seulement pour qui peut publier des incidents (sinon l'API répond 403 et l'alerte serait inutile).
  useEffect(() => {
    if (!canManageStatus) return;
    Promise.all([fetchJsonOrEmpty("/api/status"), fetchJsonOrEmpty("/api/admin/incidents")]).then(([live, inc]) => {
      setServices(live.services || []);
      setIncidents(inc.incidents || []);
    });
  }, [canManageStatus]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { en_attente: 0, en_cours: 0, resolu: 0, ferme: 0 };
    for (const t of tickets) map[t.status] = (map[t.status] || 0) + 1;
    return map;
  }, [tickets]);

  // Le ticket qui attend une réponse depuis le plus longtemps : c'est lui qu'il faut traiter en premier.
  const oldestPending = useMemo(
    () =>
      tickets
        .filter((t) => t.status === "en_attente")
        .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())[0],
    [tickets]
  );

  // Services en panne ou dégradés sans incident ouvert : même règle que sur la page Statut (un incident « Plusieurs services » couvre tout).
  const uncovered = useMemo(() => {
    const open = incidents.filter((i) => i.status !== "resolved");
    return services.filter(
      (s) =>
        (s.status === "Down" || s.status === "Degraded") &&
        !open.some((i) => i.service === s.name || i.service === "Plusieurs services")
    );
  }, [services, incidents]);

  const recentTickets = useMemo(() => tickets.slice(0, 5), [tickets]);
  const ideasEnEtude = useMemo(() => ideas.filter((i) => i.status === "en_etude").length, [ideas]);
  const treated = counts.resolu + counts.ferme;

  if (myRole === null || loading) {
    return (
      <div className="space-y-10">
        <PageHeader eyebrow="Administration" title="Accueil" />
        <LoadingPanel label="Chargement de l'accueil…" />
      </div>
    );
  }

  if (!canManageTickets && !canManageIdeas && !canManageFaq && !canManageStatus) {
    return (
      <div className="space-y-10">
        <PageHeader eyebrow="Administration" title="Accueil" />
        <AccessDenied>Ton rôle n'a accès à aucune section de gestion pour le moment.</AccessDenied>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Administration"
        title="Accueil"
        description="Ce qui attend une action, puis l'état du support."
      />

      {/* Un service en panne sans incident publié passe avant tout : les utilisateurs ne sont pas prévenus. */}
      {canManageStatus && uncovered.length > 0 && (
        <section aria-label="Services à signaler" className="space-y-2">
          {uncovered.map((s) => (
            <div
              key={s.name}
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} aria-hidden="true" className="shrink-0 text-rose-300" />
                <p className="text-sm text-zinc-200">
                  <strong className="font-semibold text-white">{s.name}</strong> est {s.status === "Down" ? "en panne" : "dégradé"} et
                  aucun incident n&apos;est publié.
                </p>
              </div>
              <Link
                href={`/admin/status?service=${encodeURIComponent(s.name)}`}
                className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
              >
                Prévenir les utilisateurs
              </Link>
            </div>
          ))}
        </section>
      )}

      {/* Ce qui attend une action : c'est la première chose qu'un modérateur doit voir. */}
      {(canManageTickets || canManageIdeas) && (
        <section aria-labelledby="todo-title">
          <h2 id="todo-title" className="mb-4 font-display text-xl font-bold tracking-tight text-white">
            À traiter
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {canManageTickets && (
              <StatTile
                href="/admin/tickets"
                label="Tickets en attente"
                value={counts.en_attente}
                attention={counts.en_attente > 0}
                hint={oldestPending ? `Le plus ancien : ${timeAgo(oldestPending.updatedAt)}` : "Tout est à jour"}
              />
            )}
            {canManageTickets && (
              <StatTile
                href="/admin/tickets"
                label="Tickets en cours"
                value={counts.en_cours}
                hint="Pris en charge ou en discussion"
              />
            )}
            {canManageIdeas && (
              <StatTile
                href="/admin/ideas"
                label="Idées à l'étude"
                value={ideasEnEtude}
                attention={ideasEnEtude > 0}
                hint={ideasEnEtude > 0 ? "À examiner et à traiter" : "Tout est à jour"}
              />
            )}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {canManageTickets && (
          <SectionCard
            title="Tickets récents"
            icon={LifeBuoy}
            flush
            className="lg:col-span-2"
            action={
              <Link
                href="/admin/tickets"
                className={`flex items-center gap-0.5 rounded text-sm font-medium text-purple-300 transition-colors hover:text-purple-200 ${FOCUS}`}
              >
                Tout voir
                <ChevronRight size={14} aria-hidden="true" />
              </Link>
            }
          >
            {recentTickets.length === 0 ? (
              <div className="p-5">
                <EmptyPanel icon={LifeBuoy}>Aucun ticket pour le moment.</EmptyPanel>
              </div>
            ) : (
              <ul className="divide-y divide-white/10">
                {recentTickets.map((ticket) => (
                  <li key={ticket._id}>
                    <Link
                      href={`/admin/tickets/${ticket._id}`}
                      className={`group flex items-center justify-between gap-3 border-l-[3px] px-5 py-4 transition-colors hover:bg-white/[0.03] ${
                        STATUS_RAIL[ticket.status] ?? "border-l-transparent"
                      } ${FOCUS}`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white transition-colors group-hover:text-purple-200">
                          {ticket.subject}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <TicketStatusBadge status={ticket.status} />
                          <span className="text-xs text-zinc-400">{ticket.userName}</span>
                          <span className="flex items-center gap-1 text-xs text-zinc-400">
                            <Clock size={11} aria-hidden="true" />
                            {timeAgo(ticket.updatedAt)}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-zinc-400">
                            <MessageSquare size={11} aria-hidden="true" />
                            {ticket.messages?.length ?? 0}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        aria-hidden="true"
                        className="shrink-0 text-zinc-500 transition-all group-hover:translate-x-0.5 group-hover:text-purple-300"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        <div className="space-y-6">
          {canManageTickets && (
            <SectionCard title="Répartition des tickets">
              <p className="font-display text-4xl font-extrabold tabular-nums text-white">
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
            </SectionCard>
          )}

          {canManageFaq && (
            <SectionCard title="Base de connaissances" icon={HelpCircle}>
              <p className="font-display text-4xl font-extrabold tabular-nums text-white">{articles.length}</p>
              <p className="mt-1 text-sm text-zinc-400">
                article{articles.length > 1 ? "s" : ""} publié{articles.length > 1 ? "s" : ""}
              </p>
              <Link href="/admin/faq" className={`${BTN_SECONDARY} mt-5 w-full`}>
                Gérer la FAQ
              </Link>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
