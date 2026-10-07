"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowRight, FileText, Lock, AlertCircle, ExternalLink } from "lucide-react";

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
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative max-w-md w-full animate-in fade-in zoom-in-95 duration-150">
        
        {/* Conteneur avec effet de gradient de bordure (Glow effet) */}
        <div className="relative rounded-3xl bg-gradient-to-b from-purple-500/20 via-zinc-800/40 to-zinc-900/80 p-[1px] shadow-2xl shadow-purple-950/50">
          
          <div className="bg-zinc-950/95 rounded-[23px] p-6 sm:p-8 relative overflow-hidden">
            
            {/* Lueur d'ambiance discrète en haut */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-purple-600/10 blur-2xl pointer-events-none rounded-full" />

            <div className="relative">
              
              {/* Entête avec badge et icône */}
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-sm">
                  <ShieldCheck size={24} />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-[10px] font-semibold tracking-wider text-purple-300 uppercase">
                  <Lock size={10} />
                  Mise à jour requise
                </span>
              </div>

              {/* Titre & Description */}
              <h2 id="terms-modal-title" className="text-xl font-bold tracking-tight text-white mb-2">
                {update ? "Nos conditions ont évolué" : "Conditions d'utilisation"}
              </h2>
              <p id="terms-modal-desc" className="text-xs text-zinc-400 leading-relaxed mb-6">
                {update ? (
                  <>
                    Nous avons mis à jour nos conditions et notre politique de confidentialité le{" "}
                    <span className="text-zinc-200 font-medium">{update.revisedLabel}</span>. Pour continuer à utiliser
                    Twichify, merci de les relire et de confirmer à nouveau votre accord.
                  </>
                ) : (
                  <>
                    Pour continuer à utiliser vos overlays <span className="text-zinc-200 font-medium">Twichify</span>, merci de confirmer votre accord avec nos conditions de service.
                  </>
                )}
              </p>

              {update && update.changes.length > 0 && (
                <div className="mb-6 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-purple-300">Ce qui a changé</p>
                  <ul className="max-h-40 space-y-2 overflow-y-auto pr-1 text-xs leading-relaxed text-zinc-300">
                    {update.changes.map((change) => (
                      <li key={change} className="flex gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-purple-400" />
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cartes des liens legaux */}
              <div className="space-y-2 mb-6">
                <Link
                  href="/privacy"
                  target="_blank"
                  className="group flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-xs font-medium text-zinc-300 transition-all hover:border-purple-500/40 hover:bg-purple-500/5 hover:text-white"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={15} className="text-purple-400 group-hover:scale-110 transition-transform" />
                    <span>Politique de confidentialité</span>
                  </div>
                  <ExternalLink size={13} className="text-zinc-600 group-hover:text-purple-400 transition-colors" />
                </Link>

                <Link
                  href="/privacy"
                  target="_blank"
                  className="group flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-xs font-medium text-zinc-300 transition-all hover:border-purple-500/40 hover:bg-purple-500/5 hover:text-white"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={15} className="text-purple-400 group-hover:scale-110 transition-transform" />
                    <span>Conditions Générales d'Utilisation</span>
                  </div>
                  <ExternalLink size={13} className="text-zinc-600 group-hover:text-purple-400 transition-colors" />
                </Link>
              </div>

              {/* Message d'erreur */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 mb-4 text-xs text-red-300">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>Une erreur s'est produite. Veuillez réessayer.</span>
                </div>
              )}

              {/* Bouton d'action principal */}
              <button
                ref={acceptButtonRef}
                onClick={handleAccept}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 px-5 py-3.5 text-xs font-bold text-white shadow-lg shadow-purple-600/25 transition-all hover:shadow-purple-600/35 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Validation en cours...</span>
                  </>
                ) : (
                  <>
                    <span>Accepter et continuer</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              <p className="text-center text-[10px] text-zinc-500 mt-4">
                En cliquant sur accepter, vous validez l'ensemble des documents ci-dessus.
              </p>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}