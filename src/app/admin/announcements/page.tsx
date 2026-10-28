"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Megaphone, Send, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardUI";
import { useDialog } from "@/components/DialogProvider";
import NotificationIcon from "@/components/notifications/NotificationIcon";
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_BODY_MAX,
  ANNOUNCEMENT_HREF_MAX,
  ANNOUNCEMENT_TITLE_MAX,
  audienceLabel,
  isInternalPath,
  type AnnouncementAudience,
  type AnnouncementRecord,
} from "@/lib/announcement-types";
import { ROLE_LABELS } from "@/lib/roles";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";
const INPUT =
  "w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function AdminAnnouncementsPage() {
  const { confirm } = useDialog();

  const [audience, setAudience] = useState<AnnouncementAudience>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState("");

  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [history, setHistory] = useState<AnnouncementRecord[] | null>(null);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/announcements", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setHistory(data.announcements ?? []);
      setHistoryFailed(false);
    } catch {
      setHistoryFailed(true);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Nombre de destinataires du groupe choisi (aperçu avant envoi). `cancelled` évite qu'une réponse tardive
  // d'un groupe précédent écrase celle du groupe actuel.
  useEffect(() => {
    let cancelled = false;
    setRecipientCount(null);
    fetch(`/api/admin/announcements?audience=${audience}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        if (!cancelled) setRecipientCount(typeof data.count === "number" ? data.count : null);
      })
      .catch(() => {
        if (!cancelled) setRecipientCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [audience]);

  const trimmedTitle = title.trim();
  const trimmedHref = href.trim();
  const hrefInvalid = trimmedHref !== "" && (trimmedHref.length > ANNOUNCEMENT_HREF_MAX || !isInternalPath(trimmedHref));
  const canSend = trimmedTitle !== "" && !hrefInvalid && !sending && recipientCount !== 0;

  const send = async () => {
    if (!canSend) return;

    const countText = recipientCount === null ? "ce groupe" : `${recipientCount} utilisateur${recipientCount > 1 ? "s" : ""}`;
    const ok = await confirm({
      title: `Envoyer cette annonce à ${countText} ?`,
      description: `Groupe : ${audienceLabel(audience)}. Elle apparaîtra dans le centre de notifications de chaque destinataire. Cette action ne peut pas être annulée.`,
      confirmLabel: "Envoyer",
    });
    if (!ok) return;

    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience, title: trimmedTitle, body: body.trim(), href: trimmedHref || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ ok: false, text: data.error || "L'envoi a échoué." });
        return;
      }
      const sent = data.announcement?.recipientCount ?? 0;
      setFeedback({ ok: true, text: `Annonce envoyée à ${sent} utilisateur${sent > 1 ? "s" : ""}.` });
      setTitle("");
      setBody("");
      setHref("");
      loadHistory();
    } catch {
      setFeedback({ ok: false, text: "Erreur réseau : l'annonce n'a peut-être pas été envoyée. Vérifie l'historique avant de réessayer." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Communauté" title="Annonces" />
      <p className="-mt-6 max-w-2xl text-sm leading-relaxed text-zinc-400">
        Envoie une notification à tous les utilisateurs ou à un groupe. Elle apparaît dans leur cloche de notifications et sur leur page Notifications.
        Réservé au Créateur et aux Co-créateurs.
      </p>

      {feedback && (
        <div
          role={feedback.ok ? "status" : "alert"}
          className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-rose-500/30 bg-rose-500/10 text-rose-200"
          }`}
        >
          {feedback.ok ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />}
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6 lg:col-span-3">
          {/* Destinataires */}
          <div className="space-y-3">
            <p id="audience-label" className="text-sm font-semibold text-zinc-200">
              Destinataires
            </p>
            <div role="radiogroup" aria-labelledby="audience-label" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ANNOUNCEMENT_AUDIENCES.map((a) => {
                const selected = audience === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setAudience(a.id)}
                    className={`cursor-pointer rounded-xl border p-3.5 text-left transition-colors ${FOCUS} ${
                      selected ? "border-purple-500/60 bg-purple-500/10" : "border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className={`block text-sm font-semibold ${selected ? "text-purple-100" : "text-zinc-200"}`}>{a.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-zinc-400">{a.description}</span>
                  </button>
                );
              })}
            </div>
            <p className="flex items-center gap-2 text-sm text-zinc-300" aria-live="polite">
              <Users size={15} className="text-purple-300" aria-hidden="true" />
              {recipientCount === null ? (
                "Calcul du nombre de destinataires..."
              ) : recipientCount === 0 ? (
                <span className="text-amber-300">Aucun destinataire dans ce groupe pour le moment.</span>
              ) : (
                <>
                  <strong className="font-semibold tabular-nums text-white">{recipientCount}</strong> destinataire{recipientCount > 1 ? "s" : ""}
                </>
              )}
            </p>
          </div>

          {/* Contenu */}
          <div className="space-y-2">
            <label htmlFor="ann-title" className="text-sm font-semibold text-zinc-200">
              Titre
            </label>
            <input
              id="ann-title"
              type="text"
              value={title}
              maxLength={ANNOUNCEMENT_TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Nouvelle version disponible"
              className={INPUT}
            />
            <p className="text-right text-xs tabular-nums text-zinc-400">
              {title.length}/{ANNOUNCEMENT_TITLE_MAX}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="ann-body" className="text-sm font-semibold text-zinc-200">
              Message <span className="font-normal text-zinc-400">(optionnel)</span>
            </label>
            <textarea
              id="ann-body"
              value={body}
              maxLength={ANNOUNCEMENT_BODY_MAX}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Quelques lignes pour expliquer ce qui change ou ce qu'on attend d'eux."
              className={`${INPUT} resize-none`}
            />
            <p className="text-right text-xs tabular-nums text-zinc-400">
              {body.length}/{ANNOUNCEMENT_BODY_MAX}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="ann-href" className="text-sm font-semibold text-zinc-200">
              Lien <span className="font-normal text-zinc-400">(optionnel, une page du site)</span>
            </label>
            <input
              id="ann-href"
              type="text"
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="/changelog"
              aria-invalid={hrefInvalid}
              aria-describedby={hrefInvalid ? "ann-href-error" : undefined}
              className={`${INPUT} ${hrefInvalid ? "border-rose-500/60" : ""}`}
            />
            {hrefInvalid && (
              <p id="ann-href-error" role="alert" className="text-sm text-rose-300">
                Utilise une adresse interne qui commence par « / », par exemple /changelog ou /help.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Envoyer l'annonce
          </button>
        </section>

        {/* Aperçu */}
        <aside className="lg:col-span-2">
          <div className="sticky top-6 space-y-3">
            <p className="text-sm font-semibold text-zinc-200">Aperçu dans la cloche</p>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
              <div className="flex items-start gap-3 bg-purple-500/[0.05] px-4 py-3.5">
                <NotificationIcon type="announcement" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug text-white">{trimmedTitle || "Le titre de ton annonce"}</p>
                    <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-purple-400" />
                  </div>
                  {body.trim() ? (
                    <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-zinc-400">{body.trim()}</p>
                  ) : (
                    <p className="mt-0.5 text-sm leading-snug text-zinc-500">Le message apparaîtra ici.</p>
                  )}
                  <p className="mt-1 text-xs text-zinc-400">à l'instant</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-zinc-400">
              {trimmedHref && !hrefInvalid ? `Un clic ouvre ${trimmedHref}.` : "Sans lien, un clic marque simplement l'annonce comme lue."}
            </p>
          </div>
        </aside>
      </div>

      {/* Historique */}
      <section>
        <h2 className="mb-4 flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-white">
          <Megaphone size={18} className="text-purple-300" aria-hidden="true" />
          Dernières annonces envoyées
        </h2>

        {historyFailed ? (
          <div role="alert" className="flex items-center justify-between gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5 text-sm text-amber-100">
            <span>Impossible de charger l'historique.</span>
            <button onClick={loadHistory} className={`cursor-pointer rounded-lg border border-amber-500/30 px-3.5 py-2 font-semibold text-amber-200 hover:bg-amber-500/10 ${FOCUS}`}>
              Réessayer
            </button>
          </div>
        ) : history === null ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-12 text-center" aria-busy="true">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-purple-400" />
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-12 text-center">
            <Megaphone size={26} className="mx-auto mb-2 text-zinc-600" aria-hidden="true" />
            <p className="text-sm text-zinc-300">Aucune annonce envoyée pour le moment.</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
            {history.map((a) => (
              <li key={a.id} className="space-y-1.5 px-5 py-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-base font-semibold text-white">{a.title}</p>
                  <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-200">
                    {audienceLabel(a.audience)}
                  </span>
                </div>
                {a.body && <p className="text-sm leading-relaxed text-zinc-400">{a.body}</p>}
                <p className="text-xs text-zinc-400">
                  {a.recipientCount} destinataire{a.recipientCount > 1 ? "s" : ""} · par {a.sentBy.name} ({ROLE_LABELS[a.sentBy.role] ?? a.sentBy.role}) · {fmtDate(a.createdAt)}
                  {a.href && ` · lien : ${a.href}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
