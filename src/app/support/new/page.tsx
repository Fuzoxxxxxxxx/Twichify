"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Send, Music, Tv, Key, User as UserIcon, HelpCircle, AlertCircle } from "lucide-react";
import PublicShell from "@/components/site/PublicShell";
import PageIntro from "@/components/site/PageIntro";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

const categories = [
  { id: "spotify", label: "Spotify", icon: Music },
  { id: "obs", label: "OBS / Widget", icon: Tv },
  { id: "api", label: "API / Clés", icon: Key },
  { id: "compte", label: "Compte", icon: UserIcon },
  { id: "autre", label: "Autre", icon: HelpCircle },
];

export default function NewTicketPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("autre");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      setError("Merci de remplir le sujet et le message.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, category, message }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/support/${data.ticket._id}`);
      } else {
        setError(data.error || "Erreur lors de la création du ticket.");
      }
    } catch (e) {
      setError("Erreur réseau, réessaie.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <PublicShell width="max-w-2xl">
        <div className="flex justify-center py-24" aria-busy="true">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      </PublicShell>
    );
  }

  if (status === "unauthenticated" || !session) {
    return (
      <PublicShell width="max-w-md">
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <HelpCircle className="mx-auto mb-3 text-purple-300" size={32} />
          <h1 className="mb-2 font-display text-2xl font-bold text-white">Connexion requise</h1>
          <p className="mb-6 text-sm text-zinc-400">
            Vous devez être connecté à votre compte pour ouvrir un ticket de support.
          </p>
          <button
            onClick={() => signIn("twitch")}
            className={`inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500 ${FOCUS}`}
          >
            Se connecter
          </button>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell width="max-w-2xl">
      <PageIntro title="Ouvrir un nouveau ticket" backHref="/help" backLabel="Retour au centre d'aide">
        Expliquez votre situation ci-dessous. Un membre de l'équipe vous répondra sous peu.
      </PageIntro>

      <div className="mt-8 space-y-7">
        {/* CATÉGORIE */}
        <div className="space-y-3">
          <p id="ticket-category-label" className="text-sm font-medium text-zinc-200">
            Catégorie du problème
          </p>
          <div role="group" aria-labelledby="ticket-category-label" className="flex flex-wrap gap-2">
            {categories.map(({ id, label, icon: Icon }) => {
              const isSelected = category === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCategory(id)}
                  aria-pressed={isSelected}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${FOCUS} ${
                    isSelected
                      ? "border-purple-500/50 bg-purple-500/15 text-purple-200"
                      : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SUJET */}
        <div className="space-y-2">
          <label htmlFor="ticket-subject" className="text-sm font-medium text-zinc-200">
            Sujet
          </label>
          <input
            id="ticket-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex : Le widget musique ne s'affiche plus sur OBS"
            className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-base text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
          />
        </div>

        {/* MESSAGE */}
        <div className="space-y-2">
          <label htmlFor="ticket-message" className="text-sm font-medium text-zinc-200">
            Description détaillée
          </label>
          <textarea
            id="ticket-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Donnez le maximum de détails (étapes pour reproduire le problème, messages d'erreur...)"
            rows={6}
            className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-base text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
          />
        </div>

        {/* ERREUR */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2.5 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200"
          >
            <AlertCircle size={16} className="shrink-0 text-red-300" />
            <span>{error}</span>
          </div>
        )}

        {/* ENVOI */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-50 ${FOCUS}`}
        >
          <Send size={16} />
          <span>{loading ? "Envoi en cours..." : "Créer le ticket"}</span>
        </button>
      </div>
    </PublicShell>
  );
}
