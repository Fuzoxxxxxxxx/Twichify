"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { LifeBuoy, MessageSquarePlus, ChevronRight, Clock, MessageCircle, HelpCircle } from "lucide-react";
import TicketStatusBadge from "@/components/TicketStatusBadge";
import PublicShell from "@/components/site/PublicShell";
import PageIntro from "@/components/site/PageIntro";
import Pagination, { usePagination } from "@/components/Pagination";

interface Ticket {
  _id: string;
  subject: string;
  category: string;
  status: string;
  updatedAt: string;
  messages: any[];
}

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

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
      <PublicShell width="max-w-2xl">
        <div className="flex justify-center py-24" aria-busy="true">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      </PublicShell>
    );
  }

  if (status === "unauthenticated" || !session) {
    return (
      <PublicShell width="max-w-md">
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <HelpCircle className="mx-auto mb-3 text-purple-300" size={32} />
          <h1 className="mb-2 font-display text-2xl font-bold text-white">Connexion requise</h1>
          <p className="mb-6 text-sm text-zinc-400">
            Vous devez être connecté à votre compte pour consulter vos tickets.
          </p>
          <Link
            href="/login"
            className={`inline-flex w-full items-center justify-center rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500 ${FOCUS}`}
          >
            Se connecter
          </Link>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell width="max-w-2xl">
      <PageIntro
        title="Mes tickets"
        backHref="/help"
        backLabel="Retour au centre d'aide"
        action={
          <Link
            href="/support/new"
            className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500 ${FOCUS}`}
          >
            <MessageSquarePlus size={16} />
            Nouveau ticket
          </Link>
        }
      />

      <div className="mt-8">
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center" aria-busy="true">
            <div className="mx-auto mb-2 h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            <p className="text-sm text-zinc-400">Chargement de vos tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
            <LifeBuoy size={28} className="mx-auto mb-3 text-zinc-600" />
            <h2 className="mb-1 text-base font-semibold text-white">Aucun ticket pour le moment</h2>
            <p className="mx-auto mb-5 max-w-xs text-sm text-zinc-400">
              Si vous rencontrez un problème technique ou si vous avez une question, ouvrez une demande d'assistance.
            </p>
            <Link
              href="/support/new"
              className={`inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:text-white ${FOCUS}`}
            >
              <MessageSquarePlus size={16} className="text-purple-300" />
              Ouvrir une demande
            </Link>
          </div>
        ) : (
          <div ref={listRef} className="scroll-mt-24">
            <ul className="space-y-3">
              {pageItems.map((ticket) => (
                <li key={ticket._id}>
                  <Link
                    href={`/support/${ticket._id}`}
                    className={`group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-purple-500/40 hover:bg-white/[0.04] ${FOCUS}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-3">
                        <TicketStatusBadge status={ticket.status} />
                        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <MessageCircle size={12} />
                          {ticket.messages.length} message{ticket.messages.length > 1 ? "s" : ""}
                        </span>
                      </div>

                      <h2 className="truncate text-base font-semibold text-white transition-colors group-hover:text-purple-200">
                        {ticket.subject}
                      </h2>

                      <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-400">
                        <Clock size={13} />
                        Mis à jour le{" "}
                        {new Date(ticket.updatedAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <ChevronRight
                      size={18}
                      className="shrink-0 text-zinc-500 transition-all group-hover:translate-x-1 group-hover:text-purple-300"
                    />
                  </Link>
                </li>
              ))}
            </ul>

            <Pagination page={page} pageCount={pageCount} onPageChange={setPage} scrollToRef={listRef} className="pt-6" />
          </div>
        )}
      </div>
    </PublicShell>
  );
}
