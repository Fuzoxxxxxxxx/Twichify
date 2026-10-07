"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle, Loader2, LifeBuoy, HelpCircle, Clock,
  ChevronRight, TrendingUp, Lightbulb,
} from "lucide-react";
import TicketStatusBadge from "@/components/TicketStatusBadge";
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
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400 mb-2">Panneau de modération</p>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white">Accueil</h1>
      </div>

      {loading ? (
        <div className="py-16 text-center border border-zinc-800/80 bg-zinc-950/60 rounded-2xl backdrop-blur-xl">
          <Loader2 className="w-5 h-5 text-purple-500 animate-spin mx-auto mb-2" />
          <p className="text-zinc-500 text-xs">Chargement des statistiques...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="En attente" value={counts.en_attente} tone="amber" />
            <StatCard label="En cours" value={counts.en_cours} tone="blue" />
            <StatCard label="Résolus" value={counts.resolu} tone="emerald" />
            <StatCard label="Fermés" value={counts.ferme} tone="zinc" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {canManageTickets && (
            <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/60 backdrop-blur-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <LifeBuoy size={15} className="text-purple-400" />
                  <p className="text-xs font-extrabold uppercase tracking-widest text-zinc-300">
                    Tickets récents
                  </p>
                </div>
                <Link
                  href="/admin/tickets"
                  className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-0.5"
                >
                  Tout voir
                  <ChevronRight size={12} />
                </Link>
              </div>

              {recentTickets.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-10">Aucun ticket pour le moment.</p>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {recentTickets.map((ticket) => (
                    <Link
                      key={ticket._id}
                      href={`/admin/tickets/${ticket._id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-white/5 transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate group-hover:text-purple-200 transition-colors">
                          {ticket.subject}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <TicketStatusBadge status={ticket.status} />
                          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(ticket.updatedAt).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        size={14}
                        className="shrink-0 text-zinc-600 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all"
                      />
                    </Link>
                  ))}
                </div>
              )}
            </div>
            )}

            <div className="space-y-5">
              {canManageFaq && (
              <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/60 backdrop-blur-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <HelpCircle size={15} className="text-purple-400" />
                  <p className="text-xs font-extrabold uppercase tracking-widest text-zinc-300">
                    Base de connaissances
                  </p>
                </div>

                <div className="flex items-end gap-2 mb-4">
                  <span className="text-3xl font-black text-white font-mono">{articles.length}</span>
                  <span className="text-xs text-zinc-500 mb-1">article{articles.length > 1 ? "s" : ""} publié{articles.length > 1 ? "s" : ""}</span>
                </div>

                <Link
                  href="/admin/faq"
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] hover:bg-right px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white transition-all duration-300 hover:scale-[1.01] active:scale-95 shadow-md shadow-purple-600/20 w-full"
                >
                  Gérer la FAQ
                </Link>
              </div>
              )}

              {canManageIdeas && (
              <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/60 backdrop-blur-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb size={15} className="text-purple-400" />
                  <p className="text-xs font-extrabold uppercase tracking-widest text-zinc-300">
                    Boîte à idées
                  </p>
                </div>

                <div className="flex items-end gap-2 mb-4">
                  <span className="text-3xl font-black text-white font-mono">{ideasEnEtude}</span>
                  <span className="text-xs text-zinc-500 mb-1">à l'étude sur {ideas.length} au total</span>
                </div>

                <Link
                  href="/admin/ideas"
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] hover:bg-right px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white transition-all duration-300 hover:scale-[1.01] active:scale-95 shadow-md shadow-purple-600/20 w-full"
                >
                  Gérer les idées
                </Link>
              </div>
              )}

              <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/60 backdrop-blur-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={15} className="text-purple-400" />
                  <p className="text-xs font-extrabold uppercase tracking-widest text-zinc-300">
                    Taux de résolution
                  </p>
                </div>
                <p className="text-3xl font-black text-white font-mono mb-1">
                  {tickets.length === 0
                    ? "—"
                    : `${Math.round(((counts.resolu + counts.ferme) / tickets.length) * 100)}%`}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {counts.resolu + counts.ferme} sur {tickets.length} tickets traités
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "amber" | "blue" | "emerald" | "zinc" }) {
  const toneMap = {
    amber: "border-amber-500/20 bg-amber-500/5 text-amber-300",
    blue: "border-blue-500/20 bg-blue-500/5 text-blue-300",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
    zinc: "border-zinc-700/40 bg-zinc-900/40 text-zinc-400",
  };

  return (
    <div className={`rounded-2xl border p-4 backdrop-blur-xl ${toneMap[tone]}`}>
      <p className="text-2xl font-black font-mono text-white mb-0.5">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</p>
    </div>
  );
}
