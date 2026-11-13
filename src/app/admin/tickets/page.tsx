"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { LifeBuoy, ChevronRight, MessageSquare, Clock } from "lucide-react";
import TicketStatusBadge from "@/components/TicketStatusBadge";
import { PageHeader } from "@/components/dashboard/DashboardUI";
import {
  AccessDenied,
  EmptyPanel,
  FilterPills,
  FOCUS,
  LoadingPanel,
  NoticePanel,
  SearchField,
  STATUS_RAIL,
  timeAgo,
} from "@/components/admin/AdminUI";
import { FAQ_CATEGORIES, faqCategoryLabel } from "@/lib/faq-categories";

interface Ticket {
  _id: string;
  subject: string;
  userName: string;
  category: string;
  status: string;
  updatedAt: string;
  messages: any[];
  assignedTo?: { userId: string | null; userName: string | null };
}

const STATUS_FILTERS = [
  { id: "tous", label: "Tous" },
  { id: "en_attente", label: "En attente" },
  { id: "en_cours", label: "En cours" },
  { id: "resolu", label: "Résolus" },
  { id: "ferme", label: "Fermés" },
];

// Ordre de traitement : ce qui attend une réponse d'abord, puis ce qui est en cours, résolu, fermé.
const STATUS_PRIORITY: Record<string, number> = { en_attente: 0, en_cours: 1, resolu: 2, ferme: 3 };

// La liste se rafraîchit toute seule, mais pas plus d'une fois par quart de minute et seulement onglet visible.
const POLL_MS = 15_000;

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState("tous");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("toutes");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async (initial: boolean) => {
    try {
      const res = await fetch("/api/admin/tickets", { cache: "no-store" });
      if (res.status === 403) {
        setDenied(true);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setTickets(data.tickets || []);
      setNow(Date.now());
      setLoadError(false);
    } catch {
      // Un échec d'actualisation garde la liste affichée : seul le premier chargement montre une erreur.
      if (initial) setLoadError(true);
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    const refresh = () => {
      if (document.visibilityState === "visible") load(false);
    };
    const id = setInterval(refresh, POLL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  const filtered = useMemo(() => {
    let result = filter === "tous" ? tickets : tickets.filter((t) => t.status === filter);
    if (categoryFilter !== "toutes") result = result.filter((t) => t.category === categoryFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((t) => t.subject.toLowerCase().includes(q) || t.userName.toLowerCase().includes(q));
    }
    return [...result].sort(
      (a, b) =>
        (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9) ||
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [tickets, filter, categoryFilter, search]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { tous: tickets.length };
    for (const t of tickets) map[t.status] = (map[t.status] || 0) + 1;
    return map;
  }, [tickets]);

  // Catégories présentes dans la liste (dans l'ordre de la FAQ), avec leur effectif parmi les tickets du statut choisi.
  const categoryCounts = useMemo(() => {
    const inStatus = filter === "tous" ? tickets : tickets.filter((t) => t.status === filter);
    const map: Record<string, number> = {};
    for (const t of inStatus) map[t.category] = (map[t.category] || 0) + 1;
    return map;
  }, [tickets, filter]);

  const categoryOptions = useMemo(
    () => [
      { id: "toutes", label: "Toutes les catégories" },
      ...FAQ_CATEGORIES.filter((c) => categoryCounts[c.key] || categoryFilter === c.key).map((c) => ({
        id: c.key,
        label: c.label,
        count: categoryCounts[c.key] || 0,
      })),
    ],
    [categoryCounts, categoryFilter]
  );

  if (denied) return <AccessDenied />;
  if (loadError) {
    return <NoticePanel title="Chargement impossible">Impossible de récupérer les tickets. Réessaie dans un instant.</NoticePanel>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Support"
        title="Tickets"
        description="Les demandes en attente de réponse sont affichées en premier."
      />

      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Rechercher par sujet ou pseudo..."
        label="Rechercher un ticket"
      />

      <FilterPills
        label="Filtrer par statut"
        options={STATUS_FILTERS.map((f) => ({ ...f, count: counts[f.id] || 0 }))}
        value={filter}
        onChange={setFilter}
      />

      {Object.keys(categoryCounts).length > 0 && (
        <FilterPills
          label="Filtrer par catégorie"
          options={categoryOptions}
          value={categoryFilter}
          onChange={setCategoryFilter}
          tone="cyan"
          small
        />
      )}

      {loading ? (
        <LoadingPanel label="Chargement des tickets..." />
      ) : filtered.length === 0 ? (
        <EmptyPanel icon={LifeBuoy}>Aucun ticket pour ces filtres.</EmptyPanel>
      ) : (
        <ul className="space-y-3">
          {filtered.map((ticket) => (
            <li key={ticket._id}>
              <Link
                href={`/admin/tickets/${ticket._id}`}
                className={`group flex items-center justify-between gap-4 rounded-2xl border border-l-[3px] border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-purple-500/40 hover:bg-white/[0.04] ${
                  STATUS_RAIL[ticket.status] ?? "border-l-transparent"
                } ${FOCUS}`}
              >
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <TicketStatusBadge status={ticket.status} />
                    <span className="text-xs text-zinc-400">{faqCategoryLabel(ticket.category)}</span>
                    {ticket.assignedTo?.userName && (
                      <span className="text-xs font-medium text-purple-300">Pris en charge par {ticket.assignedTo.userName}</span>
                    )}
                  </div>
                  <p className="truncate text-base font-semibold text-white">{ticket.subject}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
                    <span>Par {ticket.userName}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} aria-hidden="true" />
                      {timeAgo(ticket.updatedAt, now)}
                    </span>
                    <span className="flex items-center gap-1" title="Nombre de messages">
                      <MessageSquare size={12} aria-hidden="true" />
                      {ticket.messages?.length ?? 0}
                    </span>
                  </p>
                </div>
                <ChevronRight
                  size={18}
                  aria-hidden="true"
                  className="shrink-0 text-zinc-500 transition-all group-hover:translate-x-0.5 group-hover:text-purple-300"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
