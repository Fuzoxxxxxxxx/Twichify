"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};
type NotifyType = "success" | "error";

interface DialogApi {
  /** Remplace window.confirm : résout true si l'utilisateur confirme, false sinon (annulation, Échap, clic extérieur). */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Remplace window.alert : toast non bloquant, toujours affiché (même si les toasts du dashboard sont désactivés). */
  notify: (message: string, type?: NotifyType) => void;
}

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog doit être utilisé dans <DialogProvider>");
  return ctx;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const [toast, setToast] = useState<{ message: string; type: NotifyType } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setPending(null);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current?.(false); // une confirmation déjà ouverte est annulée
        resolverRef.current = resolve;
        setPending(options);
      }),
    []
  );

  const notify = useCallback((message: string, type: NotifyType = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type });
    timerRef.current = setTimeout(() => setToast(null), type === "error" ? 5000 : 3000);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      resolverRef.current?.(false);
    },
    []
  );

  const onConfirm = useCallback(() => settle(true), [settle]);
  const onCancel = useCallback(() => settle(false), [settle]);
  const api = useMemo(() => ({ confirm, notify }), [confirm, notify]);

  return (
    <DialogContext.Provider value={api}>
      {children}

      <ConfirmDialog
        open={!!pending}
        title={pending?.title ?? ""}
        description={pending?.description}
        confirmLabel={pending?.confirmLabel}
        cancelLabel={pending?.cancelLabel}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-[110] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div
            role={toast.type === "error" ? "alert" : "status"}
            className={`flex max-w-sm items-center gap-3 rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur-xl ${
              toast.type === "success"
                ? "border-emerald-500/30 bg-emerald-950/80 text-emerald-200"
                : "border-red-500/30 bg-red-950/80 text-red-200"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={18} className="shrink-0" />
            ) : (
              <AlertCircle size={18} className="shrink-0" />
            )}
            <p className="text-sm font-bold">{toast.message}</p>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
