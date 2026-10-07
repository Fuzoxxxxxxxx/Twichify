"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { ShieldAlert, X } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  /** Contenu supplémentaire sous la description (liste de conséquences, etc.). */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loadingLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// Carte de confirmation du dashboard (même rendu que la modale de réinitialisation de la page Compte).
// Échap et clic sur le fond annulent, sauf pendant l'action en cours. Le scroll du fond est verrouillé
// et le focus est placé sur le bouton de confirmation à l'ouverture.
export default function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  loadingLabel = "En cours...",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => confirmRef.current?.focus());
    return () => {
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => !loading && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-[28px] border border-amber-500/30 bg-zinc-950 p-7 shadow-2xl shadow-amber-950/20"
      >
        <button
          onClick={() => !loading && onCancel()}
          aria-label={cancelLabel}
          className="absolute top-5 right-5 text-zinc-500 transition hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
          <ShieldAlert size={22} />
        </div>

        <h2 id={titleId} className="text-lg font-black text-white">
          {title}
        </h2>
        {description && <p className="mt-2 text-xs leading-relaxed text-zinc-400">{description}</p>}
        {children}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-900/80 py-3 text-[11px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-[11px] font-black uppercase tracking-widest text-black transition hover:bg-amber-400 disabled:opacity-60"
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
