"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Unlink } from "lucide-react";

// Petit hook local de toast, utilisé indépendamment par chaque page du
// dashboard (Spotify, Design, Chat, Bot...) pour confirmer une sauvegarde.
export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [toastsEnabled, setToastsEnabled] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedToasts = localStorage.getItem("twichify-toasts-enabled");
    if (savedToasts === "false") setToastsEnabled(false);
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (!toastsEnabled) return;
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return { toast, showToast };
}

export function ToastDisplay({ toast }: { toast: { message: string; type: "success" | "error" } | null }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div
        className={`flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur-xl ${
          toast.type === "success"
            ? "border-emerald-500/30 bg-emerald-950/80 text-emerald-200"
            : "border-red-500/30 bg-red-950/80 text-red-200"
        }`}
      >
        {toast.type === "success" ? <CheckCircle2 size={18} /> : <Unlink size={18} />}
        <p className="text-sm font-bold">{toast.message}</p>
      </div>
    </div>
  );
}
