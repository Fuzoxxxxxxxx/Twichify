"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Send, 
  Shield, 
  User, 
  Clock, 
  AlertTriangle,
  Loader2,
  CheckCircle2,
  LogOut,
  Lock
} from "lucide-react";
import LinkifiedText from "@/components/LinkifiedText";

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
  userName: string;
  category: string;
  status: string;
  messages: Message[];
  assignedTo?: { userId: string | null; userName: string | null; assignedAt: string | null };
  typing?: TypingState | null;
}

const statusOptions = [
  { id: "en_attente", label: "En attente" },
  { id: "en_cours", label: "En cours" },
  { id: "resolu", label: "Résolu" },
  { id: "ferme", label: "Fermé" },
];

const POLL_INTERVAL_MS = 3000;
// Ping « en train d'écrire » : au plus un toutes les 2s pendant la saisie (évite de spammer l'API à chaque frappe)
const TYPING_PING_INTERVAL_MS = 2000;

export default function AdminTicketThreadPage() {
  const params = useParams();
  const ticketId = params?.ticketId as string;
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasClaimedRef = useRef(false);
  const lastTypingPingRef = useRef(0);

  const fetchTicket = useCallback(() => {
    fetch(`/api/support/tickets/${ticketId}`)
      .then((r) => r.json())
      .then((data) => setTicket(data.ticket || null))
      .catch(() => setTicket(null))
      .finally(() => setLoading(false));
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId || hasClaimedRef.current) return;
    hasClaimedRef.current = true;

    fetch(`/api/support/tickets/${ticketId}/claim`, { method: "POST" })
      .then(async (r) => {
        const data = await r.json();
        if (r.ok) {
          setTicket(data.ticket);
        } else {
          setClaimError(data.error || "Impossible de rejoindre ce ticket.");
          fetchTicket();
        }
      })
      .catch(() => fetchTicket())
      .finally(() => setLoading(false));
  }, [ticketId, fetchTicket]);

  useEffect(() => {
    if (!ticketId) return;
    const interval = setInterval(fetchTicket, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [ticketId, fetchTicket]);

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

  const isAssignedToMe = ticket?.assignedTo?.userId === currentUserId;
  const isAssignedToOther = !!ticket?.assignedTo?.userId && !isAssignedToMe;
  const isClosed = ticket?.status === "ferme" || ticket?.status === "resolu";

  const handleReply = async (autoResolve = false) => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply }),
      });
      const data = await res.json();
      if (res.ok) {
        setReply("");
        setClaimError(null);
        if (autoResolve) {
          await fetch(`/api/support/tickets/${ticketId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "resolu" }),
          });
        }
        fetchTicket();
      } else {
        setClaimError(data.error || "Erreur lors de l'envoi.");
      }
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchTicket();
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRelease = async () => {
    setReleasing(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/release`, { method: "POST" });
      if (res.ok) fetchTicket();
    } finally {
      setReleasing(false);
    }
  };

  const isSpaceHeldRef = useRef(false);

  const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    pingTyping();
    if (e.key === " ") {
      isSpaceHeldRef.current = true;
      return;
    }
    if (e.key === "Enter") {
      if (e.shiftKey) return;
      e.preventDefault();
      handleReply(isSpaceHeldRef.current);
    }
  };

  const handleReplyKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === " ") isSpaceHeldRef.current = false;
  };

  const handleTakeover = async () => {
    setClaimError(null);
    const res = await fetch(`/api/support/tickets/${ticketId}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: true }),
    });
    const data = await res.json();
    if (res.ok) {
      setTicket(data.ticket);
    } else {
      setClaimError(data.error || "Impossible de reprendre ce ticket.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
          <p className="text-xs text-zinc-500 font-medium">Chargement du ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-md mx-auto text-center rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-8 backdrop-blur-xl mt-10">
        <AlertTriangle className="mx-auto text-amber-500 mb-3" size={32} />
        <h2 className="text-base font-bold text-white mb-2">Ticket non disponible</h2>
        <p className="text-xs text-zinc-400 mb-6">
          Ce ticket n'existe pas ou vous ne disposez pas des permissions requises pour l'afficher.
        </p>
        <Link
          href="/admin/tickets"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:text-white transition-all"
        >
          <ArrowLeft size={14} />
          <span>Retour à la liste des tickets</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col">
      <Link 
        href="/admin/tickets" 
        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-purple-400 transition-colors mb-6 group w-fit"
      >
        <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
        <span>Tous les tickets</span>
      </Link>

      {/* Affiché uniquement si pris par un autre ET que le ticket n'est PAS fermé */}
      {isAssignedToOther && !isClosed && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 mb-4">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
            <Lock size={14} className="shrink-0" />
            <span>Pris en charge par {ticket.assignedTo?.userName}. Lecture seule.</span>
          </div>
          <button
            onClick={handleTakeover}
            className="text-[10px] font-black uppercase tracking-widest text-amber-300 hover:text-amber-200 underline shrink-0"
          >
            Reprendre
          </button>
        </div>
      )}

      {/* Affiché uniquement si assigné à moi ET que le ticket n'est PAS fermé */}
      {isAssignedToMe && !isClosed && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 mb-4">
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
            <CheckCircle2 size={14} className="shrink-0" />
            <span>Tu as pris en charge ce ticket.</span>
          </div>
          <button
            onClick={handleRelease}
            disabled={releasing}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors disabled:opacity-40"
          >
            <LogOut size={11} />
            Se retirer
          </button>
        </div>
      )}

      {/* Affiché uniquement s'il y a une erreur ET que le ticket n'est PAS fermé */}
      {claimError && !isClosed && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 mb-4 text-red-300 text-xs font-semibold">
          <AlertTriangle size={14} className="shrink-0" />
          {claimError}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-5 sm:p-6 mb-6 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-wider">
            <Shield size={12} className="text-purple-400" />
            <span>Support Admin</span>
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400 capitalize font-medium">Catégorie: {ticket.category}</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
          {ticket.subject}
        </h1>

        <p className="text-xs text-zinc-400 mb-5 flex items-center gap-1.5">
          <User size={13} className="text-zinc-500" />
          <span>Demandeur :</span>
          <span className="text-zinc-200 font-semibold">{ticket.userName}</span>
        </p>

        <div className="pt-4 border-t border-zinc-800/80">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 mb-2.5">
            Changer le statut du ticket
          </p>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map(({ id, label }) => {
              const isActive = ticket.status === id;
              return (
                <button
                  key={id}
                  onClick={() => handleStatusChange(id)}
                  disabled={updatingStatus || isActive || isAssignedToOther}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold border transition-all duration-200 disabled:opacity-70 disabled:cursor-default ${
                    isActive
                      ? "border-purple-500 bg-purple-500/20 text-purple-300 shadow-sm"
                      : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:text-white hover:border-zinc-700"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 mb-6">
        {ticket.messages.map((msg, i) => {
          if (msg.authorRole === "system") {
            return (
              <div key={i} className="flex justify-center">
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
              className={`flex ${isStaff ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 transition-all ${
                  isStaff
                    ? "bg-gradient-to-br from-purple-950/40 to-indigo-950/30 border border-purple-500/30 text-purple-100 shadow-sm"
                    : "bg-zinc-950/80 border border-zinc-800/80 text-zinc-200 backdrop-blur-md"
                }`}
              >
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                  <span className={`text-xs font-bold ${isStaff ? "text-purple-300" : "text-zinc-300"}`}>
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
      {otherIsTyping && !isClosed && !isAssignedToOther && (
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

      {/* Masquer le formulaire de réponse si le ticket est résolu ou fermé */}
      {isClosed ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4 text-center text-xs text-zinc-500">
          Ce ticket est classé ({ticket.status === "resolu" ? "Résolu" : "Fermé"}). Les réponses sont désactivées.
        </div>
      ) : isAssignedToOther ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4 text-center text-xs text-zinc-500">
          Ce ticket est en lecture seule tant qu'il est pris en charge par {ticket.assignedTo?.userName}.
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-3 sm:p-4 backdrop-blur-xl shadow-lg">
          <div className="flex gap-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={handleReplyKeyDown}
              onKeyUp={handleReplyKeyUp}
              placeholder="Rédiger une réponse d'assistance... (Entrée pour envoyer, Entrée+Espace pour envoyer et résoudre, Maj+Entrée pour aller à la ligne)"
              rows={3}
              className="flex-1 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/50 transition-all resize-none shadow-inner"
            />
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => handleReply(false)}
                disabled={sending || !reply.trim()}
                className="flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] hover:bg-right px-4 py-2.5 text-white transition-all duration-300 disabled:opacity-40 disabled:hover:bg-left hover:scale-[1.02] active:scale-95 shadow-md shadow-purple-600/20"
                title="Envoyer la réponse"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
              <button
                onClick={() => handleReply(true)}
                disabled={sending || !reply.trim() || ticket.status === "resolu"}
                className="flex items-center justify-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-300 text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-30"
                title="Envoyer et marquer comme résolu"
              >
                <CheckCircle2 size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}