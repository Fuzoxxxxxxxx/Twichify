"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  LifeBuoy, 
  MessageSquarePlus, 
  ChevronRight, 
  Music, 
  ArrowLeft,
  Clock,
  MessageCircle,
  HelpCircle
} from "lucide-react";
import TicketStatusBadge from "@/components/TicketStatusBadge";
import SiteHeader from "@/components/SiteHeader";
import Pagination, { usePagination } from "@/components/Pagination";

interface Ticket {
  _id: string;
  subject: string;
  category: string;
  status: string;
  updatedAt: string;
  messages: any[];
}

// Nombre de tickets affichés par page.
const PAGE_SIZE = 8;

export default function MyTicketsPage() {
  const { data: session, status } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const { page, setPage, pageCount, pageItems } = usePagination(tickets, PAGE_SIZE);

  useEffect(() => {
    if (!session) return;
    fetch("/api/support/tickets")
      .then((r) => r.json())
      .then((data) => setTickets(data.tickets || []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [session]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (status === "unauthenticated" || !session) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 text-center">
        <div className="max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8 backdrop-blur-xl">
          <HelpCircle className="mx-auto text-purple-400 mb-3" size={32} />
          <h2 className="text-lg font-bold mb-2">Connexion requise</h2>
          <p className="text-zinc-400 text-xs mb-6">
            Vous devez être connecté à votre compte pour consulter vos tickets.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg shadow-purple-600/20 hover:brightness-110 transition-all"
          >
            Se connecter
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 relative flex flex-col justify-between overflow-x-clip">
      {/* Halo de fond */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[520px] bg-gradient-to-tr from-purple-600/25 via-indigo-500/15 to-emerald-500/15 blur-[170px] pointer-events-none -z-10" />

      {/* Grille de fond */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e15_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />

      <div>
        {/* HEADER UNIFORMISÉ */}
        <SiteHeader />

        {/* CONTENEUR PRINCIPAL (max-w-2xl) */}
        <div className="max-w-2xl mx-auto px-6 pt-8 pb-16">
          
          <Link 
            href="/help" 
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-purple-400 transition-colors mb-6 group"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
            <span>Retour au centre d'aide</span>
          </Link>

          {/* EN-TÊTE DE LA PAGE */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800/80 text-zinc-300 text-xs mb-3 backdrop-blur-md shadow-inner">
                <LifeBuoy size={14} className="text-purple-400" />
                <span className="font-semibold text-zinc-300">Support client</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                Mes tickets
              </h1>
            </div>

            <Link
              href="/support/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] hover:bg-right px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-md shadow-purple-600/20 shrink-0"
            >
              <MessageSquarePlus size={14} />
              <span>Nouveau ticket</span>
            </Link>
          </div>

          {/* CONTENU / LISTE DES TICKETS */}
          {loading ? (
            <div className="py-16 text-center border border-zinc-800/80 bg-zinc-950/60 rounded-2xl backdrop-blur-xl">
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-zinc-500 text-xs">Chargement de vos tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 px-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mx-auto mb-3">
                <LifeBuoy size={20} />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Aucun ticket pour le moment</h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-5">
                Si vous rencontrez un problème technique ou si vous avez une question, ouvrez une demande d'assistance.
              </p>
              <Link
                href="/support/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700/80 hover:border-purple-500/60 text-xs font-semibold text-zinc-200 hover:text-white transition-all"
              >
                <MessageSquarePlus size={14} className="text-purple-400" />
                <span>Ouvrir une demande</span>
              </Link>
            </div>
          ) : (
            <div ref={listRef} className="space-y-3 scroll-mt-24">
              {pageItems.map((ticket) => (
                <Link
                  key={ticket._id}
                  href={`/support/${ticket._id}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 sm:p-5 hover:border-purple-500/40 hover:bg-zinc-900/40 transition-all duration-200 group backdrop-blur-xl shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <TicketStatusBadge status={ticket.status} />
                      <span className="flex items-center gap-1 text-[11px] text-zinc-500 font-medium">
                        <MessageCircle size={12} />
                        {ticket.messages.length} message{ticket.messages.length > 1 ? "s" : ""}
                      </span>
                    </div>

                    <h2 className="text-xs sm:text-sm font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                      {ticket.subject}
                    </h2>

                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-1">
                      <Clock size={12} />
                      <span>
                        Mis à jour le {new Date(ticket.updatedAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </span>
                    </div>
                  </div>

                  <ChevronRight 
                    size={16} 
                    className="shrink-0 text-zinc-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all duration-200" 
                  />
                </Link>
              ))}

              <Pagination page={page} pageCount={pageCount} onPageChange={setPage} scrollToRef={listRef} className="pt-3" />
            </div>
          )}

        </div>
      </div>

      {/* FOOTER UNIFORMISÉ */}
      <footer className="w-full border-t border-zinc-900/80 bg-black/40 backdrop-blur-md z-20 mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-zinc-300">Twichify</span>
            <span>— © 2026 Tous droits réservés.</span>
          </div>

          <div className="flex items-center gap-4 font-medium">
            <Link href="/" className="hover:text-purple-400 transition-colors">Accueil</Link>
            <Link href="/help" className="hover:text-purple-400 transition-colors">Aide</Link>
            <Link href="/privacy" className="hover:text-purple-400 transition-colors">Confidentialité & CGU</Link>
            <Link href="/mentions-legales" className="hover:text-purple-400 transition-colors">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}