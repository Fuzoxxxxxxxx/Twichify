"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, Loader2, MinusCircle, X } from "lucide-react";
import TicketStatusBadge from "@/components/TicketStatusBadge";
import { ROLE_LABELS } from "@/lib/roles";
import { BTN_ICON, FOCUS, STATUS_RAIL, timeAgo } from "@/components/admin/AdminUI";
import { faqCategoryLabel } from "@/lib/faq-categories";
import { TERMS_REVISED_LABEL } from "@/lib/terms";

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  createdAt: string;
  hasAcceptedTerms: boolean;
  acceptedTermsAt: string | null;
  termsCurrent: boolean;
  lastActivityAt: string | null;
  activeSessions: number;
  spotify: { credentialsSet: boolean; connected: boolean };
  widgets: { musicSeenAt: string | null; chatSeenAt: string | null; bannerSeenAt: string | null };
  chatStatsEnabled: boolean;
}

interface TicketRow {
  _id: string;
  subject: string;
  status: string;
  category: string;
  updatedAt: string;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] py-2.5 text-sm last:border-b-0">
      <dt className="shrink-0 text-zinc-400">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-zinc-100">{children}</dd>
    </div>
  );
}

function Yes({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-emerald-300">
      <CheckCircle2 size={14} aria-hidden="true" />
      {children}
    </span>
  );
}

function No({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-zinc-400">
      <MinusCircle size={14} aria-hidden="true" />
      {children}
    </span>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-amber-300">
      <AlertTriangle size={14} aria-hidden="true" />
      {children}
    </span>
  );
}

/**
 * Fiche d'un utilisateur : panneau latéral en lecture seule, ouvert depuis la page Utilisateurs.
 * Aucun secret n'est affiché (identifiants Spotify, jetons) : seulement des états et des dates.
 */
export default function UserProfilePanel({
  user,
  onClose,
}: {
  user: { _id: string; name: string; image?: string | null };
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    fetch(`/api/admin/users?id=${encodeURIComponent(user._id)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setProfile(data.profile);
        setTickets(data.tickets ?? null);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [user._id]);

  // Focus : on entre dans le panneau à l'ouverture, on le garde à l'intérieur (Tab), et on le rend à la fermeture.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [onClose]);

  const spotifyLabel = profile?.spotify.connected
    ? "Relié"
    : profile?.spotify.credentialsSet
      ? "Identifiants saisis, non relié"
      : "Non configuré";

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-profile-title"
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-zinc-950 shadow-2xl shadow-black/60"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
          <div className="flex min-w-0 items-center gap-3">
            {user.image ? (
              <img src={user.image} alt="" className="h-12 w-12 shrink-0 rounded-full border border-white/10 object-cover" />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-purple-500/20 font-display text-lg font-extrabold text-white"
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2 id="user-profile-title" className="truncate font-display text-xl font-bold text-white">
                {user.name}
              </h2>
              {profile && (
                <p className="text-sm text-zinc-400">{(ROLE_LABELS as Record<string, string>)[profile.role] ?? profile.role}</p>
              )}
            </div>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fermer la fiche" className={BTN_ICON}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto p-5">
          {state === "loading" && (
            <div role="status" className="py-16 text-center">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-purple-400" aria-hidden="true" />
              <p className="text-sm text-zinc-400">Chargement de la fiche...</p>
            </div>
          )}

          {state === "error" && (
            <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/[0.08] p-4 text-sm text-red-200">
              Impossible de charger la fiche de cet utilisateur.
            </p>
          )}

          {state === "ready" && profile && (
            <>
              <section aria-labelledby="profile-account">
                <h3 id="profile-account" className="mb-1 text-sm font-semibold text-white">
                  Compte
                </h3>
                <dl>
                  <Row label="E-mail">{profile.email ? <span className="break-all">{profile.email}</span> : "—"}</Row>
                  <Row label="Inscription">{fmtDate(profile.createdAt)}</Row>
                  <Row label="Conditions acceptées">
                    {/* On se fie à la date d'acceptation, pas au booléen : une acceptation antérieure à la dernière révision
                        existe bien en base, mais la fenêtre d'acceptation réapparaît pour l'utilisateur. */}
                    {profile.acceptedTermsAt && profile.termsCurrent ? (
                      <Yes>{fmtDate(profile.acceptedTermsAt)}</Yes>
                    ) : profile.acceptedTermsAt ? (
                      <>
                        <Warn>À reconfirmer</Warn>
                        <span className="mt-0.5 block text-xs font-normal text-zinc-400">
                          Acceptées le {fmtDate(profile.acceptedTermsAt)}, avant la révision du {TERMS_REVISED_LABEL}
                        </span>
                      </>
                    ) : profile.hasAcceptedTerms ? (
                      <Yes>Oui (date inconnue)</Yes>
                    ) : (
                      <No>Pas encore</No>
                    )}
                  </Row>
                  <Row label="Dernière activité">{timeAgo(profile.lastActivityAt)}</Row>
                  <Row label="Sessions actives">{profile.activeSessions}</Row>
                </dl>
              </section>

              <section aria-labelledby="profile-links">
                <h3 id="profile-links" className="mb-1 text-sm font-semibold text-white">
                  Connexions et widgets
                </h3>
                <dl>
                  <Row label="Spotify">{profile.spotify.connected ? <Yes>{spotifyLabel}</Yes> : <No>{spotifyLabel}</No>}</Row>
                  <Row label="Widget musique">
                    {profile.widgets.musicSeenAt ? (
                      <Yes>Vu {timeAgo(profile.widgets.musicSeenAt)}</Yes>
                    ) : (
                      <No>Jamais chargé dans OBS</No>
                    )}
                  </Row>
                  <Row label="Widget chat">
                    {profile.widgets.chatSeenAt ? (
                      <Yes>Vu {timeAgo(profile.widgets.chatSeenAt)}</Yes>
                    ) : (
                      <No>Jamais chargé dans OBS</No>
                    )}
                  </Row>
                  <Row label="Widget bandeau">
                    {profile.widgets.bannerSeenAt ? (
                      <Yes>Vu {timeAgo(profile.widgets.bannerSeenAt)}</Yes>
                    ) : (
                      <No>Jamais chargé dans OBS</No>
                    )}
                  </Row>
                  <Row label="Statistiques du chat">
                    {profile.chatStatsEnabled ? <Yes>Activées</Yes> : <No>Désactivées</No>}
                  </Row>
                </dl>
              </section>

              {tickets !== null && (
                <section aria-labelledby="profile-tickets">
                  <h3 id="profile-tickets" className="mb-2 text-sm font-semibold text-white">
                    Derniers tickets
                  </h3>
                  {tickets.length === 0 ? (
                    <p className="text-sm text-zinc-400">Aucun ticket.</p>
                  ) : (
                    <ul className="space-y-2">
                      {tickets.map((t) => (
                        <li key={t._id}>
                          <Link
                            href={`/admin/tickets/${t._id}`}
                            className={`group flex items-center justify-between gap-3 rounded-xl border border-l-[3px] border-white/10 bg-white/[0.02] px-3.5 py-3 transition-colors hover:border-purple-500/40 hover:bg-white/[0.04] ${
                              STATUS_RAIL[t.status] ?? "border-l-transparent"
                            } ${FOCUS}`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-white">{t.subject}</span>
                              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
                                <TicketStatusBadge status={t.status} />
                                <span>{faqCategoryLabel(t.category)}</span>
                                <span>{timeAgo(t.updatedAt)}</span>
                              </span>
                            </span>
                            <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-zinc-500 transition-colors group-hover:text-purple-300" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              <p className="text-xs leading-relaxed text-zinc-500">
                Lecture seule. Les identifiants Spotify et les jetons ne sont jamais affichés ici.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
