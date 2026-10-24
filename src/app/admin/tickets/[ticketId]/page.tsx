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
  Lock,
  ArrowRightLeft,
  StickyNote,
  Trash2,
} from "lucide-react";
import LinkifiedText from "@/components/LinkifiedText";
import ReplyTemplatePicker from "@/components/ReplyTemplatePicker";
import { TICKET_TEMPLATES, fillTemplate, type ReplyTemplate } from "@/lib/reply-templates";
import { useDialog } from "@/components/DialogProvider";
import { ROLE_LABELS } from "@/lib/roles";
import { TICKET_NOTE_MAX, TRANSFER_REASON_MAX } from "@/lib/ticket-admin";

const roleLabel = (role?: string | null) =>
  (role && (ROLE_LABELS as Record<string, string>)[role]) || role || "";

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

interface InternalNote {
  _id: string;
  text: string;
  by?: { userId: string | null; name: string | null; role: string | null };
  createdAt: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
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
  const { confirm, notify } = useDialog();

  // Notes internes (jamais visibles du demandeur) et transfert : espace de travail du staff.
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[] | null>(null);
  const [transferTo, setTransferTo] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferBusy, setTransferBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const hasClaimedRef = useRef(false);
  const lastTypingPingRef = useRef(0);

  const fetchTicket = useCallback(() => {
    fetch(`/api/support/tickets/${ticketId}`)
      .then((r) => r.json())
      .then((data) => {
        setTicket(data.ticket || null);
        // Les réponses des autres routes (claim, statut…) ne contiennent pas les notes : on ne les écrase pas.
        if (data.ticket?.internalNotes) setNotes(data.ticket.internalNotes);
      })
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

  // Insère un modèle dans le champ de réponse : jamais envoyé automatiquement, l'agent le relit et l'adapte.
  const insertTemplate = (template: ReplyTemplate) => {
    const filled = fillTemplate(template.text, {
      pseudo: ticket?.userName,
      agent: session?.user?.name,
    });
    // Texte déjà saisi : le modèle est ajouté à la suite, séparé par une ligne vide.
    setReply((current) => (current.trim() ? `${current.replace(/\s+$/, "")}\n\n${filled}` : filled));
    requestAnimationFrame(() => replyRef.current?.focus());
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

  const addNote = async () => {
    const text = noteDraft.trim();
    if (!text || noteBusy) return;
    setNoteBusy(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return notify(data.error || "Impossible d'ajouter la note", "error");
      setNotes(data.notes || []);
      setNoteDraft("");
    } catch {
      notify("Erreur réseau", "error");
    } finally {
      setNoteBusy(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    const ok = await confirm({
      title: "Supprimer cette note ?",
      description: "Elle disparaîtra pour tout le staff.",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/notes?noteId=${noteId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return notify(data.error || "Impossible de supprimer la note", "error");
      setNotes(data.notes || []);
    } catch {
      notify("Erreur réseau", "error");
    }
  };

  const openTransfer = async () => {
    setTransferOpen(true);
    setTransferTo("");
    setTransferReason("");
    if (staffList === null) {
      try {
        const res = await fetch("/api/support/staff");
        const data = await res.json();
        setStaffList(res.ok ? data.staff : []);
      } catch {
        setStaffList([]);
      }
    }
  };

  const doTransfer = async () => {
    if (!transferTo || transferBusy) return;
    setTransferBusy(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: transferTo, reason: transferReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return notify(data.error || "Transfert impossible", "error");
      setTicket(data.ticket);
      if (data.ticket?.internalNotes) setNotes(data.ticket.internalNotes);
      setTransferOpen(false);
      notify(`Ticket transféré à ${data.ticket?.assignedTo?.userName ?? "un collègue"}`, "success");
    } catch {
      notify("Erreur réseau", "error");
    } finally {
      setTransferBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
          <p className="text-sm text-zinc-400">Chargement du ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div role="alert" className="mx-auto mt-10 max-w-md rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
        <AlertTriangle className="mx-auto text-amber-400 mb-3" size={32} />
        <h2 className="mb-2 font-display text-xl font-bold text-white">Ticket non disponible</h2>
        <p className="mb-6 text-sm text-zinc-400">
          Ce ticket n'existe pas ou vous ne disposez pas des permissions requises pour l'afficher.
        </p>
        <Link
          href="/admin/tickets"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
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
        className="mb-6 inline-flex w-fit items-center gap-2 rounded text-sm text-zinc-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 group"
      >
        <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
        <span>Tous les tickets</span>
      </Link>

      {/* Affiché uniquement si pris par un autre ET que le ticket n'est PAS fermé */}
      {isAssignedToOther && !isClosed && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-200">
            <Lock size={14} className="shrink-0" />
            <span>Pris en charge par {ticket.assignedTo?.userName}. Lecture seule.</span>
          </div>
          <button
            onClick={handleTakeover}
            className="shrink-0 cursor-pointer rounded text-sm font-semibold text-amber-200 underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            Reprendre
          </button>
        </div>
      )}

      {/* Affiché uniquement si assigné à moi ET que le ticket n'est PAS fermé */}
      {isAssignedToMe && !isClosed && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-200">
            <CheckCircle2 size={14} className="shrink-0" />
            <span>Tu as pris en charge ce ticket.</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={openTransfer}
              className="flex cursor-pointer items-center gap-1.5 rounded text-sm font-medium text-purple-300 transition-colors hover:text-purple-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
            >
              <ArrowRightLeft size={13} />
              Transférer
            </button>
            <button
              onClick={handleRelease}
              disabled={releasing}
              className="flex cursor-pointer items-center gap-1.5 rounded text-sm font-medium text-zinc-300 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 disabled:opacity-40"
            >
              <LogOut size={13} />
              Se retirer
            </button>
          </div>
        </div>
      )}

      {/* Transfert / escalade : choix du destinataire, motif privé */}
      {transferOpen && isAssignedToMe && !isClosed && (
        <div className="mb-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <ArrowRightLeft size={14} className="text-purple-300" />
            Transférer ou escalader ce ticket
          </p>

          {staffList === null ? (
            <div className="flex justify-center py-3">
              <Loader2 size={16} className="animate-spin text-purple-500" />
            </div>
          ) : staffList.length === 0 ? (
            <p className="text-sm text-zinc-400">Aucun autre membre du staff ne peut prendre en charge des tickets.</p>
          ) : (
            <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {staffList.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTransferTo(m.id)}
                  aria-pressed={transferTo === m.id}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 ${
                    transferTo === m.id
                      ? "border-purple-500/60 bg-purple-500/15 text-purple-100"
                      : "border-white/10 text-zinc-300 hover:border-white/20"
                  }`}
                >
                  <span className="font-semibold">{m.name}</span>
                  <span className="text-xs text-zinc-400">{roleLabel(m.role)}</span>
                </button>
              ))}
            </div>
          )}

          <textarea
            value={transferReason}
            onChange={(e) => setTransferReason(e.target.value)}
            maxLength={TRANSFER_REASON_MAX}
            rows={2}
            aria-label="Motif du transfert"
            placeholder="Motif ou contexte pour la personne qui reprend (visible du staff uniquement)..."
            className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
          />
          <p className="text-xs leading-relaxed text-zinc-400">
            Le demandeur voit seulement « La conversation a été transférée à … ». Le motif est enregistré dans les notes internes.
          </p>

          <div className="flex gap-2">
            <button
              onClick={doTransfer}
              disabled={!transferTo || transferBusy}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 disabled:opacity-50"
            >
              {transferBusy ? <Loader2 size={13} className="animate-spin" /> : <ArrowRightLeft size={13} />}
              Transférer
            </button>
            <button
              onClick={() => setTransferOpen(false)}
              className="cursor-pointer rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Affiché uniquement s'il y a une erreur ET que le ticket n'est PAS fermé */}
      {claimError && !isClosed && (
        <div role="alert" className="mb-4 flex items-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-sm font-medium text-red-200">
          <AlertTriangle size={14} className="shrink-0" />
          {claimError}
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <p className="mb-3 flex items-center gap-2 text-sm text-zinc-400">
          <Shield size={14} className="text-purple-300" />
          <span>Support admin</span>
          <span aria-hidden="true">·</span>
          <span className="capitalize">Catégorie : {ticket.category}</span>
        </p>

        <h1 className="mb-2 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          {ticket.subject}
        </h1>

        <p className="mb-5 flex items-center gap-1.5 text-sm text-zinc-400">
          <User size={14} className="text-zinc-500" />
          <span>Demandeur :</span>
          <span className="font-semibold text-zinc-200">{ticket.userName}</span>
        </p>

        <div className="border-t border-white/10 pt-4">
          <p className="mb-2.5 text-sm font-medium text-zinc-200">Changer le statut du ticket</p>
          <div role="group" aria-label="Statut du ticket" className="flex flex-wrap gap-2">
            {statusOptions.map(({ id, label }) => {
              const isActive = ticket.status === id;
              return (
                <button
                  key={id}
                  onClick={() => handleStatusChange(id)}
                  disabled={updatingStatus || isActive || isAssignedToOther}
                  aria-pressed={isActive}
                  className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 disabled:cursor-default disabled:opacity-70 ${
                    isActive
                      ? "border-purple-500/60 bg-purple-500/20 text-purple-100"
                      : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notes internes : espace de travail du staff, jamais visibles du demandeur */}
      <div className="mb-6 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/[0.04]">
        <button
          onClick={() => setNotesOpen((o) => !o)}
          aria-expanded={notesOpen}
          className="flex w-full cursor-pointer items-center justify-between rounded-2xl px-4 py-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-amber-200">
            <StickyNote size={15} />
            Notes internes
            <span className="font-normal text-zinc-400">invisibles du demandeur</span>
          </span>
          <span className="text-sm tabular-nums text-zinc-400">{notes.length}</span>
        </button>

        {notesOpen && (
          <div className="space-y-3 border-t border-amber-500/20 px-4 py-3">
            {notes.length === 0 ? (
              <p className="text-sm text-zinc-400">Aucune note pour le moment.</p>
            ) : (
              <ul className="space-y-2">
                {notes.map((n) => (
                  <li
                    key={n._id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                        <LinkifiedText text={n.text} />
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {n.by?.name ?? "Staff"}
                        {n.by?.role ? ` (${roleLabel(n.by.role)})` : ""} ·{" "}
                        {new Date(n.createdAt).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteNote(n._id)}
                      className="shrink-0 rounded p-2 text-zinc-400 transition-colors hover:text-red-400"
                      title="Supprimer la note"
                      aria-label="Supprimer la note"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={noteDraft}
                maxLength={TICKET_NOTE_MAX}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNote();
                  }
                }}
                aria-label="Ajouter une note interne"
                placeholder="Ajouter une note pour l'équipe (contexte, piste testée, suite à donner)..."
                className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-amber-500/50"
              />
              <button
                onClick={addNote}
                disabled={!noteDraft.trim() || noteBusy}
                className="shrink-0 cursor-pointer rounded-lg border border-white/15 px-3.5 text-zinc-300 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:opacity-40"
                title="Ajouter la note"
                aria-label="Ajouter la note"
              >
                {noteBusy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-4 mb-6">
        {ticket.messages.map((msg, i) => {
          if (msg.authorRole === "system") {
            return (
              <div key={i} className="flex justify-center">
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
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
                className={`max-w-[85%] rounded-2xl border p-4 sm:max-w-[80%] ${
                  isStaff
                    ? "border-purple-500/30 bg-purple-500/[0.08] text-purple-100"
                    : "border-white/10 bg-white/[0.03] text-zinc-200"
                }`}
              >
                <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
                  <span className={`text-sm font-semibold ${isStaff ? "text-purple-200" : "text-zinc-200"}`}>
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

                <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400">
                  <Clock size={12} className="shrink-0" />
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
        <div role="status" className="mb-3 flex items-center gap-2 px-1 text-sm text-zinc-400">
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
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center text-sm text-zinc-400">
          Ce ticket est classé ({ticket.status === "resolu" ? "Résolu" : "Fermé"}). Les réponses sont désactivées.
        </div>
      ) : isAssignedToOther ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center text-sm text-zinc-400">
          Ce ticket est en lecture seule tant qu'il est pris en charge par {ticket.assignedTo?.userName}.
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
          <ReplyTemplatePicker
            templates={TICKET_TEMPLATES}
            suggestedCategories={["general", ticket.category]}
            onPick={insertTemplate}
          />
          <div className="flex gap-2">
            <textarea
              ref={replyRef}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={handleReplyKeyDown}
              onKeyUp={handleReplyKeyUp}
              aria-label="Réponse"
              placeholder="Rédiger une réponse d'assistance... (Entrée pour envoyer, Entrée+Espace pour envoyer et résoudre, Maj+Entrée pour aller à la ligne)"
              rows={3}
              className="flex-1 resize-none rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
            />
            <div className="flex shrink-0 flex-col gap-2">
              <button
                onClick={() => handleReply(false)}
                disabled={sending || !reply.trim()}
                className="flex cursor-pointer items-center justify-center rounded-lg bg-purple-600 px-4 py-2.5 text-white transition-colors hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 disabled:opacity-40"
                title="Envoyer la réponse"
                aria-label="Envoyer la réponse"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
              <button
                onClick={() => handleReply(true)}
                disabled={sending || !reply.trim() || ticket.status === "resolu"}
                className="flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-emerald-200 transition-colors hover:bg-emerald-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:opacity-30"
                title="Envoyer et marquer comme résolu"
                aria-label="Envoyer et marquer comme résolu"
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