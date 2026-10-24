"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { LifeBuoy, ChevronRight, AlertTriangle, Loader2, Search } from "lucide-react";
import TicketStatusBadge from "@/components/TicketStatusBadge";
import { PageHeader } from "@/components/dashboard/DashboardUI";

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

const statusFilters = [
  { id: "tous", label: "Tous" },
  { id: "en_attente", label: "En attente" },
  { id: "en_cours", label: "En cours" },
  { id: "resolu", label: "Résolus" },
  { id: "ferme", label: "Fermés" },
];

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("tous");
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");

  const POLL_INTERVAL_MS = 1000;


  useEffect(() => {
    fetch("/api/admin/tickets")
      .then((r) => {
        if (r.status === 403) {
          setError(true);
          return { tickets: [] };
        }
        return r.json();
      })
      .then((data) => setTickets(data.tickets || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/admin/tickets")
        .then((r) => r.json())
        .then((data) => setTickets(data.tickets || []))
        .catch(() => setError(true));
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    let result = filter === "tous" ? tickets : tickets.filter((t) => t.status === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (t) => t.subject.toLowerCase().includes(q) || t.userName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tickets, filter, search]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { tous: tickets.length };
    for (const t of tickets) {
      map[t.status] = (map[t.status] || 0) + 1;
    }
    return map;
  }, [tickets]);

  if (error) {
    return (
      <div role="alert" className="max-w-md mx-auto text-center rounded-2xl border border-red-500/25 bg-zinc-950/80 p-8 mt-10">
        <AlertTriangle className="mx-auto text-red-400 mb-3" size={32} />
        <h2 className="text-lg font-bold mb-2">Accès refusé</h2>
        <p className="text-zinc-400 text-sm">
          Cette section est réservée au staff.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Support" title="Tickets" />

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par sujet ou pseudo..."
          aria-label="Rechercher un ticket"
          className="w-full rounded-lg border border-white/10 bg-white/[0.02] py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
        />
      </div>

      <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap items-center gap-2">
        {statusFilters.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            aria-pressed={filter === id}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 ${
              filter === id
                ? "border-purple-500/50 bg-purple-500/15 text-purple-200"
                : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
            }`}
          >
            {label} {counts[id] !== undefined && <span className="tabular-nums opacity-70">{counts[id] || 0}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center border border-white/10 bg-white/[0.02] rounded-2xl" aria-busy="true">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin mx-auto mb-2" />
          <p className="text-zinc-400 text-sm">Chargement des tickets...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-white/15 bg-white/[0.02]">
          <LifeBuoy size={28} className="mx-auto text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-300">Aucun ticket dans cette catégorie.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((ticket) => (
            <li key={ticket._id}>
              <Link
                href={`/admin/tickets/${ticket._id}`}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-purple-500/40 hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
              >
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <TicketStatusBadge status={ticket.status} />
                    <span className="text-xs text-zinc-400">{ticket.category}</span>
                    {ticket.assignedTo?.userName && (
                      <span className="text-xs font-medium text-purple-300">
                        Pris en charge par {ticket.assignedTo.userName}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-base font-semibold text-white">{ticket.subject}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Par {ticket.userName} · Mis à jour le {new Date(ticket.updatedAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-zinc-500 transition-all group-hover:translate-x-0.5 group-hover:text-purple-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
