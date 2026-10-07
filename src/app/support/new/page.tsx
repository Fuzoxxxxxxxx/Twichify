"use client";


import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Send, 
  Music, 
  Tv, 
  Key, 
  User as UserIcon, 
  HelpCircle,
  MessageSquarePlus,
  AlertCircle
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

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
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (status === "unauthenticated" || !session) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 text-center">
        <div className="max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8 backdrop-blur-xl">
          <HelpCircle className="mx-auto text-purple-400 mb-3" size={32} />
          <h2 className="text-lg font-bold mb-2">Connexion requise</h2>
          <p className="text-zinc-400 text-xs mb-6">
            Vous devez être connecté à votre compte pour ouvrir un ticket de support.
          </p>
          <button
            onClick={() => signIn("twitch")}
            className="inline-flex items-center justify-center w-full bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg shadow-purple-600/20 hover:brightness-110 transition-all"
          >
            Se connecter
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 relative flex flex-col justify-between overflow-x-clip">
      {/* Halo de fond */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[520px] bg-gradient-to-tr from-purple-600/25 via-indigo-500/15 to-emerald-500/15 blur-[170px] pointer-events-none -z-10" />

      {/* Grille de fond */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e15_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />

      <div>
        {/* HEADER UNIFORMISÉ */}
        <SiteHeader />

        {/* FORMULAIRE DANS CONTENEUR STRUCTURÉ (max-w-2xl) */}
        <div className="max-w-2xl mx-auto px-6 pt-8 pb-16">
          
          <Link 
            href="/help" 
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-purple-400 transition-colors mb-6 group"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
            <span>Retour au centre d'aide</span>
          </Link>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800/80 text-zinc-300 text-xs mb-4 backdrop-blur-md shadow-inner">
              <MessageSquarePlus size={14} className="text-purple-400" />
              <span className="font-semibold text-zinc-300">Support en ligne</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter mb-2 bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              Ouvrir un nouveau ticket
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm">
              Expliquez votre situation ci-dessous. Un membre de l'équipe vous répondra sous peu.
            </p>
          </div>

          {/* CARTE FORMULAIRE */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
            
            {/* SÉLECTION DE LA CATÉGORIE */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-400">
                Catégorie du problème
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map(({ id, label, icon: Icon }) => {
                  const isSelected = category === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setCategory(id)}
                      className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold border transition-all duration-200 ${
                        isSelected
                          ? "bg-purple-600/20 border-purple-500/50 text-purple-300 shadow-sm"
                          : "bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700"
                      }`}
                    >
                      <Icon size={14} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SUJET */}
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-400">
                Sujet
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Le widget musique ne s'affiche plus sur OBS"
                className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/50 transition-all shadow-inner"
              />
            </div>

            {/* MESSAGE */}
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-400">
                Description détaillée
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Donnez le maximum de détails (étapes pour reproduire le problème, messages d'erreur...)"
                rows={5}
                className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/50 transition-all resize-none shadow-inner"
              />
            </div>

            {/* ERREUR */}
            {error && (
              <div className="flex items-center gap-2 text-xs font-medium text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle size={15} className="shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* BOUTON D'ENVOI */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] hover:bg-right px-6 py-3 text-xs font-extrabold uppercase tracking-wider text-white transition-all duration-300 hover:scale-[1.01] active:scale-95 disabled:opacity-50 shadow-md shadow-purple-600/20"
            >
              <Send size={14} />
              <span>{loading ? "Envoi en cours..." : "Créer le ticket"}</span>
            </button>
          </div>

        </div>
      </div>

      {/* FOOTER UNIFORMISÉ */}
      <footer className="w-full border-t border-zinc-900/80 bg-black/40 backdrop-blur-md z-20 mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-zinc-300">Twichify</span>
            <span>— © 2026 Tous droits réservés.</span>
          </div>

          <div className="flex items-center gap-4 font-medium">
            <Link href="/" className="hover:text-purple-400 transition-colors">Accueil</Link>
            <Link href="/help" className="hover:text-purple-400 transition-colors">Aide</Link>
            <Link href="/privacy" className="hover:text-purple-400 transition-colors">Confidentialité & CGU</Link>
            <Link href="/mentions-legales" className="hover:text-purple-400 transition-colors">Mentions légales</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}