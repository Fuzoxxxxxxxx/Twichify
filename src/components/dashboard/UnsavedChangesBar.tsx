"use client";

import { useEffect } from "react";
import { Save, Undo2 } from "lucide-react";
import { ACTION_BTN } from "@/components/dashboard/WidgetUI";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";
const LEAVE_MESSAGE = "Tu as des modifications non enregistrées. Quitter la page sans sauvegarder ?";

/**
 * Protège les modifications non enregistrées d'une page de réglages :
 * - fermeture ou rechargement de l'onglet : confirmation du navigateur ;
 * - navigation interne (liens du menu, de la page) : confirmation avant de quitter.
 * N'a aucun effet tant que `isDirty` est faux.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm(LEAVE_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isDirty]);
}

/**
 * Barre d'enregistrement collée en bas de la page : visible tant que des modifications ne sont pas enregistrées.
 * `canSave` désactive « Enregistrer » quand les réglages actuels ne sont pas valides (ex : message vide).
 */
export default function UnsavedChangesBar({
  isDirty,
  saving,
  onSave,
  onDiscard,
  canSave = true,
}: {
  isDirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  canSave?: boolean;
}) {
  if (!isDirty) return null;

  return (
    <div className="sticky bottom-20 z-30 md:bottom-4">
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-zinc-950/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl"
      >
        <p className="text-sm text-amber-100">Tu as des modifications non enregistrées.</p>
        <div className="flex gap-2">
          <button type="button" onClick={onDiscard} disabled={saving} className={`${ACTION_BTN} disabled:opacity-50`}>
            <Undo2 size={14} />
            Annuler
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !canSave}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`}
          >
            <Save size={14} />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
