"use client";

import { useState, useEffect, useRef, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Send, 
  Music, 
  ShieldCheck, 
  User as UserIcon, 
  Lock, 
  HelpCircle,
  MessageSquare,
  Clock,
  Loader2
} from "lucide-react";
import TicketStatusBadge from "@/components/TicketStatusBadge";
import LinkifiedText from "@/components/LinkifiedText";
import SiteHeader from "@/components/SiteHeader";

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

  const otherIsTyping =
    ticket?.typing && ticket.typing.userId !== currentUserId ? ticket.typing : null;

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
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
          <p className="text-xs text-zinc-500 font-medium">Chargement du ticket...</p>
        </div>
      </main>
    );
  }

  if (status === "unauthenticated" || !session) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 text-center">
        <div className="max-w-md rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-8 backdrop-blur-xl">
          <HelpCircle className="mx-auto text-purple-400 mb-3" size={32} />
          <h2 className="text-base font-bold text-white mb-2">Connexion requise</h2>
          <p className="text-zinc-400 text-xs mb-6">
            Vous devez être connecté à votre compte pour consulter ce ticket.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] hover:bg-right px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg shadow-purple-600/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            Se connecter
          </Link>
        </div>
      </main>
    );
  }

  if (!ticket) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 text-center">
        <div className="max-w-md rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-8 backdrop-blur-xl">
          <HelpCircle className="mx-auto text-zinc-600 mb-3" size={32} />
          <h2 className="text-base font-bold text-white mb-2">Ticket introuvable</h2>
          <p className="text-zinc-400 text-xs mb-6">
            Ce ticket n'existe pas ou vous n'avez pas l'autorisation d'y accéder.
          </p>
          <Link
            href="/support/my-tickets"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-5 py-2.5 text-xs font-semibold text-zinc-200 hover:text-white hover:border-zinc-700 transition-all"
          >
            <ArrowLeft size={14} />
            <span>Voir mes tickets</span>
          </Link>
        </div>
      </main>
    );
  }

  const isClosed = ticket.status === "ferme" || ticket.status === "resolu";

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 relative flex flex-col justify-between overflow-x-clip">
      {/* Halo de fond */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[520px] bg-gradient-to-tr from-purple-600/25 via-indigo-500/15 to-emerald-500/15 blur-[170px] pointer-events-none -z-10" />

      {/* Grille de fond */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e15_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />

      <div>
        {/* HEADER UNIFORMISÉ */}
        <SiteHeader />

        {/* FIL DE DISCUSSION */}
        <div className="max-w-2xl mx-auto px-6 pt-8 pb-16 flex flex-col min-h-[calc(100vh-140px)]">
          
          <Link 
            href="/support/my-tickets" 
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-purple-400 transition-colors mb-6 group w-fit"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
            <span>Mes tickets</span>
          </Link>

          {/* EN-TÊTE DU TICKET */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 sm:p-6 backdrop-blur-xl mb-6 shadow-lg">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                <MessageSquare size={14} className="text-purple-400" />
                <span>Ticket #{ticket._id.slice(-6)}</span>
                <span className="text-zinc-600">•</span>
                <span className="capitalize text-zinc-400">Catégorie: {ticket.category}</span>
              </div>
              <TicketStatusBadge status={ticket.status} />
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white break-words">
              {ticket.subject}
            </h1>
          </div>

          {/* LISTE DES MESSAGES */}
          <div className="flex-1 space-y-4 mb-6">
            {ticket.messages.map((msg, i) => {
              if (msg.authorRole === "system") {
                return (
                  <div key={i} className="flex justify-center my-2">
                    <span className="text-[10px] text-zinc-500 bg-zinc-900/40 border border-zinc-800/60 rounded-full px-3 py-1">
                      {msg.content}
                    </span>
                  </div>
                );
              }

              const isStaff = msg.authorRole !== "user";

              return (
                <div 
                  key={i} 
                  className={`flex ${isStaff ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 transition-all ${
                      isStaff
                        ? "bg-gradient-to-br from-purple-950/40 to-indigo-950/30 border border-purple-500/30 text-purple-100 shadow-sm"
                        : "bg-zinc-950/80 border border-zinc-800/80 text-zinc-200 backdrop-blur-md"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${isStaff ? "text-purple-300" : "text-zinc-300"}`}>
                        {isStaff ? (
                          <ShieldCheck size={13} className="text-purple-400" />
                        ) : (
                          <UserIcon size={12} className="text-zinc-400" />
                        )}
                        {msg.authorName}
                      </span>

                      {isStaff && (
                        <span className="text-[9px] font-extrabold uppercase tracking-widest bg-purple-500/20 border border-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded-md">
                          Staff
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                      <LinkifiedText text={msg.content} />
                    </p>

                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-3 pt-1">
                      <Clock size={11} className="shrink-0" />
                      <span>{new Date(msg.createdAt).toLocaleString("fr-FR")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* INDICATEUR « EN TRAIN D'ÉCRIRE » */}
          {otherIsTyping && !isClosed && (
            <div className="flex items-center gap-2 mb-3 px-1 text-xs font-medium text-zinc-500">
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" />
              </span>
              <span>
                <span className="text-purple-300 font-semibold">{otherIsTyping.userName}</span> est en train d'écrire...
              </span>
            </div>
          )}

          {/* ZONE DE RÉPONSE / ÉTAT FERMÉ */}
          {isClosed ? (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-center backdrop-blur-xl">
              <div className="flex items-center justify-center gap-2 text-zinc-400 text-xs font-semibold">
                <Lock size={14} className="text-zinc-500" />
                <span>Ce ticket a été {ticket.status === "resolu" ? "résolu" : "fermé"}.</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Si votre problème persiste, veuillez ouvrir une nouvelle demande d'assistance.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-3 sm:p-4 backdrop-blur-xl shadow-lg">
              <div className="flex gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={handleReplyKeyDown}
                  onKeyUp={handleReplyKeyUp}
                  placeholder="Écrire votre réponse... (Entrée pour envoyer, Maj+Entrée pour aller à la ligne)"
                  rows={3}
                  className="flex-1 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/50 transition-all resize-none shadow-inner"
                />
                <button
                  onClick={handleReply}
                  disabled={sending || !reply.trim()}
                  className="flex items-center justify-center self-end rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] hover:bg-right px-4 py-3 text-white transition-all duration-300 disabled:opacity-40 disabled:hover:bg-left hover:scale-[1.02] active:scale-95 shadow-md shadow-purple-600/20 shrink-0"
                  title="Envoyer la réponse"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
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