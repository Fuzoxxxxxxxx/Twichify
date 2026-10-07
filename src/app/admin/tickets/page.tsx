"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { LifeBuoy, ChevronRight, Filter, AlertTriangle, Loader2, Search } from "lucide-react";
import TicketStatusBadge from "@/components/TicketStatusBadge";

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
      <div className="max-w-md mx-auto text-center rounded-2xl border border-red-500/20 bg-zinc-950/80 p-8 backdrop-blur-xl mt-10">
        <AlertTriangle className="mx-auto text-red-400 mb-3" size={32} />
        <h2 className="text-lg font-bold mb-2">Accès Refusé</h2>
        <p className="text-zinc-400 text-xs">
          Cette section est exclusivement réservée au staff.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400 mb-2">Support</p>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white">Tickets</h1>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par sujet ou pseudo..."
          className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 backdrop-blur-xl transition-colors"
        />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Filter size={13} className="text-zinc-600 mr-1" />
        {statusFilters.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-widest border transition-all ${
              filter === id
                ? "border-purple-500 bg-purple-500/15 text-purple-300"
                : "border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label} {counts[id] !== undefined && <span className="opacity-60">({counts[id] || 0})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center border border-zinc-800/80 bg-zinc-950/60 rounded-2xl backdrop-blur-xl">
          <Loader2 className="w-5 h-5 text-purple-500 animate-spin mx-auto mb-2" />
          <p className="text-zinc-500 text-xs">Chargement des tickets...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-[24px] border border-zinc-800/80 bg-zinc-950/40">
          <LifeBuoy size={28} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">Aucun ticket dans cette catégorie.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <Link
              key={ticket._id}
              href={`/admin/tickets/${ticket._id}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 hover:border-purple-500/40 transition-all group backdrop-blur-xl"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                  <TicketStatusBadge status={ticket.status} />
                  <span className="text-[10px] text-zinc-600 font-mono uppercase">{ticket.category}</span>
                  {ticket.assignedTo?.userName && (
                    <span className="text-[10px] font-bold text-purple-400/80">
                      • Pris en charge par {ticket.assignedTo.userName}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-white truncate">{ticket.subject}</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">
                  Par {ticket.userName} · Mis à jour le {new Date(ticket.updatedAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-zinc-600 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
