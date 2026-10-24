"use client";

import { useState, useEffect, useRef, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Send, ShieldCheck, User as UserIcon, Lock, HelpCircle, Clock, Loader2 } from "lucide-react";
import TicketStatusBadge from "@/components/TicketStatusBadge";
import LinkifiedText from "@/components/LinkifiedText";
import PublicShell from "@/components/site/PublicShell";
import PageIntro from "@/components/site/PageIntro";

interface Message {
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

interface TypingState {
  userId: string;
  userName: string;
  role: string;
  at: string;
}

interface Ticket {
  _id: string;
  subject: string;
  category: string;
  status: string;
  messages: Message[];
  userId: string;
  typing?: TypingState | null;
}

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

// Intervalle de rafraîchissement automatique (polling) en ms
const POLL_INTERVAL_MS = 3000;
// Ping « en train d'écrire » : au plus un toutes les 2s pendant la saisie (évite de spammer l'API à chaque frappe)
const TYPING_PING_INTERVAL_MS = 2000;

export default function TicketThreadPage() {
  const params = useParams();
  const ticketId = params?.ticketId as string;
  const { data: session, status } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTypingPingRef = useRef(0);

  const fetchTicket = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        setTicket(data.ticket || null);
      } else {
        setTicket(null);
      }
    } catch {
      setTicket(null);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Chargement initial
  useEffect(() => {
    if (ticketId) {
      fetchTicket(true);
    }
  }, [ticketId]);

  // Polling automatique pour récupérer les nouveaux messages
  useEffect(() => {
    if (!ticketId || ticket?.status === "ferme" || ticket?.status === "resolu") return;

    const interval = setInterval(() => {
      fetchTicket(false); // Rafraîchissement silencieux en arrière-plan
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [ticketId, ticket?.status]);

  // Scroll automatique en bas lors d'un nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages.length]);

  // Signale qu'on est en train d'écrire, avec un throttle côté client (indépendant du polling).
  const pingTyping = () => {
    const now = Date.now();
    if (now - lastTypingPingRef.current < TYPING_PING_INTERVAL_MS) return;
    lastTypingPingRef.current = now;
    fetch(`/api/support/tickets/${ticketId}/typing`, { method: "POST" }).catch(() => {});
  };

  const otherIsTyping = ticket?.typing && ticket.typing.userId !== currentUserId ? ticket.typing : null;

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply }),
      });
      if (res.ok) {
        setReply("");
        await fetchTicket(false);
      }
    } finally {
      setSending(false);
    }
  };

  // Raccourcis clavier : Entrée envoie, Maj+Entrée va à la ligne.
  // (Entrée + Espace maintenu envoie aussi — l'action "résolu" n'existe pas côté utilisateur.)
  const isSpaceHeldRef = useRef(false);

  const handleReplyKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    pingTyping();
    if (e.key === " ") {
      isSpaceHeldRef.current = true;
      return;
    }
    if (e.key === "Enter") {
      if (e.shiftKey) return; // Maj+Entrée : saut de ligne, comportement par défaut
      e.preventDefault();
      handleReply();
    }
  };

  const handleReplyKeyUp = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === " ") isSpaceHeldRef.current = false;
  };

  if (status === "loading" || loading) {
    return (
      <PublicShell width="max-w-2xl">
        <div className="flex flex-col items-center gap-3 py-24" aria-busy="true">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          <p className="text-sm text-zinc-400">Chargement du ticket...</p>
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
          <p className="mb-6 text-sm text-zinc-400">Vous devez être connecté à votre compte pour consulter ce ticket.</p>
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

  if (!ticket) {
    return (
      <PublicShell width="max-w-md">
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <HelpCircle className="mx-auto mb-3 text-zinc-500" size={32} />
          <h1 className="mb-2 font-display text-2xl font-bold text-white">Ticket introuvable</h1>
          <p className="mb-6 text-sm text-zinc-400">
            Ce ticket n'existe pas ou vous n'avez pas l'autorisation d'y accéder.
          </p>
          <Link
            href="/support/my-tickets"
            className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:text-white ${FOCUS}`}
          >
            <ArrowLeft size={14} />
            Voir mes tickets
          </Link>
        </div>
      </PublicShell>
    );
  }

  const isClosed = ticket.status === "ferme" || ticket.status === "resolu";

  return (
    <PublicShell width="max-w-2xl">
      <PageIntro
        title={ticket.subject}
        backHref="/support/my-tickets"
        backLabel="Mes tickets"
        action={<TicketStatusBadge status={ticket.status} />}
      >
        Ticket #{ticket._id.slice(-6)}, catégorie {ticket.category}
      </PageIntro>

      {/* LISTE DES MESSAGES */}
      <ul className="mt-8 space-y-4" aria-label="Messages du ticket">
        {ticket.messages.map((msg, i) => {
          if (msg.authorRole === "system") {
            return (
              <li key={i} className="my-2 flex justify-center">
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">{msg.content}</span>
              </li>
            );
          }

          const isStaff = msg.authorRole !== "user";

          return (
            <li key={i} className={`flex ${isStaff ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[88%] rounded-2xl border p-4 sm:max-w-[82%] ${
                  isStaff ? "border-purple-500/30 bg-purple-500/[0.08]" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
                  <span
                    className={`flex items-center gap-1.5 text-sm font-semibold ${isStaff ? "text-purple-200" : "text-zinc-200"}`}
                  >
                    {isStaff ? (
                      <ShieldCheck size={14} className="text-purple-300" />
                    ) : (
                      <UserIcon size={13} className="text-zinc-400" />
                    )}
                    {msg.authorName}
                  </span>

                  {isStaff && (
                    <span className="rounded-md border border-purple-500/30 bg-purple-500/15 px-1.5 py-0.5 text-xs font-semibold text-purple-200">
                      Staff
                    </span>
                  )}
                </div>

                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-200">
                  <LinkifiedText text={msg.content} />
                </p>

                <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400">
                  <Clock size={12} className="shrink-0" />
                  {new Date(msg.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
            </li>
          );
        })}
        <div ref={bottomRef} />
      </ul>

      {/* INDICATEUR « EN TRAIN D'ÉCRIRE » */}
      {otherIsTyping && !isClosed && (
        <div role="status" className="mt-4 flex items-center gap-2 px-1 text-sm text-zinc-400">
          <span className="flex gap-0.5" aria-hidden="true">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400" />
          </span>
          <span>
            <span className="font-semibold text-purple-200">{otherIsTyping.userName}</span> est en train d'écrire...
          </span>
        </div>
      )}

      {/* ZONE DE RÉPONSE / ÉTAT FERMÉ */}
      <div className="mt-6">
        {isClosed ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center">
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-zinc-300">
              <Lock size={15} className="text-zinc-500" />
              Ce ticket a été {ticket.status === "resolu" ? "résolu" : "fermé"}.
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Si votre problème persiste, veuillez ouvrir une nouvelle demande d'assistance.
            </p>
          </div>
        ) : (
          <div className="flex gap-3">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={handleReplyKeyDown}
              onKeyUp={handleReplyKeyUp}
              aria-label="Votre réponse"
              placeholder="Écrire votre réponse... (Entrée pour envoyer, Maj+Entrée pour aller à la ligne)"
              rows={3}
              className="flex-1 resize-none rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-base text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
            />
            <button
              onClick={handleReply}
              disabled={sending || !reply.trim()}
              aria-label="Envoyer la réponse"
              title="Envoyer la réponse"
              className={`flex shrink-0 cursor-pointer items-center justify-center self-end rounded-xl bg-purple-600 px-4 py-3.5 text-white transition-colors hover:bg-purple-500 disabled:opacity-40 ${FOCUS}`}
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
