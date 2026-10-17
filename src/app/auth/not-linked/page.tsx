"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Tv, UserX, RefreshCw, Home, HelpCircle, X, Lock, Eye, CheckCircle2, ExternalLink } from "lucide-react";

/**
 * Page affichée quand NextAuth renvoie l'erreur OAuthAccountNotLinked : un compte existe déjà avec cet e-mail,
 * mais il a été créé avec un autre compte Twitch. On y arrive via /auth/signin (voir pages.signIn dans la config NextAuth).
 * Même structure que /auth/cancelled, avec un accent ambre au lieu de violet.
 */
export default function AuthNotLinked() {
  const [showModal, setShowModal] = useState(false);

  // Fermeture de la modal avec la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowModal(false);
    };
    if (showModal) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal]);

  return (
    <main className="min-h-screen bg-[#030305] text-zinc-100 font-sans flex flex-col justify-between overflow-hidden relative selection:bg-purple-500/30">
      <style jsx global>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.35; transform: scale(1) translate(-50%, -50%); }
          50% { opacity: 0.65; transform: scale(1.1) translate(-48%, -52%); }
        }
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-glow {
          animation: pulseGlow 8s ease-in-out infinite;
        }
        .animate-shine {
          animation: shine 3.5s infinite;
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>

      {/* Halo Ambiant */}
      <div className="fixed top-1/2 left-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-amber-500/15 via-purple-600/15 to-rose-500/10 blur-[160px] pointer-events-none -z-10 animate-glow" />

      {/* Grille Tactique */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] -z-10" />

      {/* HEADER */}
      <header className="max-w-7xl w-full mx-auto px-6 py-8 flex items-center justify-between z-20">
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-700 flex items-center justify-center text-white shadow-lg shadow-purple-600/20 group-hover:scale-105 transition-all duration-300">
            <Tv size={20} />
          </div>
          <span className="font-extrabold text-xl tracking-wide bg-gradient-to-r from-white via-zinc-200 to-purple-400 bg-clip-text text-transparent">
            Twichify
          </span>
        </Link>
      </header>

      {/* CONTENU CENTRAL */}
      <div className="max-w-xl mx-auto px-6 text-center flex flex-col items-center my-auto relative z-10 py-12">

        {/* Badge d'état */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold mb-6 backdrop-blur-xl shadow-[0_0_20px_rgba(245,158,11,0.12)] animate-float">
          <UserX size={14} className="text-amber-400" />
          <span className="tracking-wider uppercase">Compte déjà associé</span>
        </div>

        {/* Visuel Icone */}
        <div className="relative flex items-center justify-center my-4 w-full select-none">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-zinc-950/80 border border-amber-500/30 p-2 shadow-[0_0_50px_rgba(245,158,11,0.2)] backdrop-blur-2xl flex items-center justify-center relative">
            <UserX size={48} className="text-amber-400" />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full blur-xs" />
          </div>
        </div>

        {/* Titres & Textes */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">
          Ce n'est pas le bon compte
        </h1>

        <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-md mx-auto mb-4 font-normal">
          Un compte Twichify existe déjà avec cette adresse e-mail, mais il a été créé avec un autre compte Twitch.
        </p>
        <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-md mx-auto mb-10 font-normal">
          Pour confirmer ton identité, connecte-toi avec le <span className="text-white font-semibold">même compte Twitch que lors de ta première connexion</span>.
        </p>

        {/* Actions CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
          <button
            onClick={() => signIn("twitch", { callbackUrl: "/dashboard" })}
            className="group relative w-full sm:w-auto flex items-center justify-center gap-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] hover:bg-right text-white px-7 py-3.5 rounded-2xl font-bold text-sm transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(147,51,234,0.35)] active:scale-95 overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-white/20 -skew-x-12 -translate-x-full animate-shine" />
            <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
            Réessayer avec Twitch
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all text-zinc-300 hover:text-white backdrop-blur-xl active:scale-95"
          >
            <Home size={18} />
            Accueil
          </Link>
        </div>

        {/* Astuce : Twitch réutilise la session ouverte dans le navigateur */}
        <div className="mt-8 w-full max-w-md rounded-2xl bg-zinc-950/70 border border-zinc-800/80 p-4 text-left text-xs text-zinc-400 leading-relaxed backdrop-blur-xl">
          <p className="mb-1 font-semibold text-zinc-200">Ça recommence à chaque essai ?</p>
          Twitch réutilise le compte déjà ouvert dans ton navigateur. Déconnecte-toi de{" "}
          <a
            href="https://www.twitch.tv/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-purple-300 hover:text-purple-200 underline decoration-purple-500/40 underline-offset-2"
          >
            twitch.tv <ExternalLink size={11} />
          </a>
          , puis reconnecte-toi avec le bon compte avant de réessayer.
        </div>

        {/* Bouton Ouverture Modal */}
        <div className="mt-14 pt-8 border-t border-zinc-900/80 w-full flex items-center justify-center text-xs text-zinc-500 font-medium">
          <button
            onClick={() => setShowModal(true)}
            className="hover:text-purple-400 transition-colors flex items-center gap-1.5 cursor-pointer group"
          >
            <HelpCircle size={14} className="group-hover:scale-110 transition-transform" />
            Pourquoi ce message ?
          </button>
        </div>

      </div>

      {/* MODAL EXPLICATIF */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-opacity duration-200"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-md bg-zinc-950 border border-amber-500/30 rounded-3xl p-6 shadow-2xl shadow-amber-900/20 text-left"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Bouton fermer */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 p-2 rounded-xl transition-all cursor-pointer"
              aria-label="Fermer la fenêtre"
            >
              <X size={16} />
            </button>

            {/* En-tête Modal */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Lock size={20} />
              </div>
              <div>
                <h3 id="modal-title" className="text-lg font-bold text-white">Protection de ton compte</h3>
                <p className="text-xs text-zinc-400">Pourquoi la connexion est-elle refusée ?</p>
              </div>
            </div>

            {/* Liste des explications */}
            <div className="space-y-3.5 my-6 text-xs text-zinc-300">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold mb-0.5">Une sécurité volontaire</strong>
                  Un compte existe déjà avec ton adresse e-mail. Pour éviter qu'un autre compte ne s'en empare, on refuse de lier automatiquement un nouveau compte Twitch.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
                <Eye size={18} className="text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold mb-0.5">Quel compte utiliser ?</strong>
                  Celui de ta toute première connexion à Twichify. Si tu as plusieurs comptes Twitch, essaie l'autre.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
                <Lock size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-semibold mb-0.5">Tu as changé de compte Twitch ?</strong>
                  Si tu n'as plus accès à l'ancien, passe par la page d'aide pour nous contacter : on regardera ta situation.
                </div>
              </div>
            </div>

            {/* Bouton de confirmation dans la modal */}
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-white font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}

      {/* FOOTER UNIVERSEL */}
      <footer className="w-full border-t border-zinc-900/80 bg-black/40 backdrop-blur-md z-20 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">

          {/* Copyright & Marque */}
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-zinc-300">Twichify</span>
            <span>— © 2026 Tous droits réservés.</span>
          </div>

          {/* Liens de navigation */}
          <div className="flex items-center gap-6 font-medium">
            <Link href="/" className="hover:text-purple-400 transition-colors">
              Accueil
            </Link>
            <Link href="/help" className="hover:text-purple-400 transition-colors">
              Aide
            </Link>
            <Link href="/privacy" className="hover:text-purple-400 transition-colors">
              Confidentialité & CGU
            </Link>
            <Link href="/mentions-legales" className="hover:text-purple-400 transition-colors">
              Mentions légales
            </Link>
          </div>

        </div>
      </footer>
    </main>
  );
}
