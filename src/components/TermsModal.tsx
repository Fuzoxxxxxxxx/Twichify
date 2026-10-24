"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowRight, FileText, AlertCircle, ExternalLink } from "lucide-react";

// Renseigné quand l'utilisateur avait déjà accepté une version précédente : la fenêtre explique ce qui a changé.
export interface TermsUpdateInfo {
  revisedLabel: string;
  changes: string[];
}

interface TermsModalProps {
  isOpen: boolean;
  onAccept: () => void;
  update?: TermsUpdateInfo | null;
}

const LEGAL_LINK =
  "group flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-purple-500/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

// Fenêtre bloquante : l'acceptation est requise pour continuer, donc ni Échap ni clic sur le fond ne la ferment.
export default function TermsModal({ isOpen, onAccept, update }: TermsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const acceptButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    acceptButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleAccept = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/user/accept-terms", { method: "POST" });
      if (res.ok) {
        onAccept();
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Erreur validation CGU:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [onAccept]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
      aria-describedby="terms-modal-desc"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
        <div className="max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl shadow-black/60 sm:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-purple-300">
            <ShieldCheck size={22} aria-hidden="true" />
          </div>

          <p className="text-sm font-medium text-purple-300">Action requise</p>
          <h2 id="terms-modal-title" className="mb-3 mt-1 font-display text-2xl font-extrabold tracking-tight text-white">
            {update ? "Nos conditions ont évolué" : "Conditions d'utilisation"}
          </h2>
          <p id="terms-modal-desc" className="mb-6 text-[15px] leading-relaxed text-zinc-400">
            {update ? (
              <>
                Nous avons mis à jour nos conditions et notre politique de confidentialité le{" "}
                <span className="font-medium text-zinc-200">{update.revisedLabel}</span>. Pour continuer à utiliser
                Twichify, merci de les relire et de confirmer à nouveau votre accord.
              </>
            ) : (
              <>
                Pour continuer à utiliser vos overlays <span className="font-medium text-zinc-200">Twichify</span>, merci de confirmer votre accord avec nos conditions de service.
              </>
            )}
          </p>

          {update && update.changes.length > 0 && (
            <div className="mb-6 rounded-xl border border-purple-500/30 bg-purple-500/[0.06] p-4">
              <p className="mb-2 text-sm font-semibold text-purple-200">Ce qui a changé</p>
              <ul className="max-h-40 space-y-2 overflow-y-auto pr-1 text-sm leading-relaxed text-zinc-300">
                {update.changes.map((change) => (
                  <li key={change} className="flex gap-2.5">
                    <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-purple-300" />
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-6 space-y-2">
            <Link href="/privacy" target="_blank" className={LEGAL_LINK}>
              <span className="flex items-center gap-3">
                <FileText size={16} className="text-purple-300" aria-hidden="true" />
                Politique de confidentialité
              </span>
              <ExternalLink size={14} aria-hidden="true" className="text-zinc-500 transition-colors group-hover:text-purple-300" />
            </Link>

            <Link href="/privacy" target="_blank" className={LEGAL_LINK}>
              <span className="flex items-center gap-3">
                <FileText size={16} className="text-purple-300" aria-hidden="true" />
                Conditions Générales d'Utilisation
              </span>
              <ExternalLink size={14} aria-hidden="true" className="text-zinc-500 transition-colors group-hover:text-purple-300" />
            </Link>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"
            >
              <AlertCircle size={16} className="shrink-0 text-red-300" aria-hidden="true" />
              <span>Une erreur s'est produite. Veuillez réessayer.</span>
            </div>
          )}

          <button
            ref={acceptButtonRef}
            onClick={handleAccept}
            disabled={loading}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3.5 text-base font-semibold text-white transition-colors hover:bg-purple-500 active:bg-purple-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>Validation en cours...</span>
              </>
            ) : (
              <>
                <span>Accepter et continuer</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <p className="mt-4 text-center text-sm text-zinc-400">
            En cliquant sur accepter, vous validez l'ensemble des documents ci-dessus.
          </p>
        </div>
      </div>
    </div>
  );
}
