"use client";

import { signIn, signOut, useSession } from "next-auth/react";
 import { Music, Tv, Settings, ArrowRight, ShieldCheck, Zap, Rocket, Sparkles, CheckCircle2, Activity, BellRing, MessageSquareText, LayoutTemplate, BarChart3, Wrench, BookOpenText } from "lucide-react";
import Link from "next/link";

const roadmapItems = [
  {
    title: "Centre d’aide & support",
    desc: "FAQ automatisée et signalement de bugs avec webhooks Discord.",
    icon: BookOpenText,
  },
  {
    title: "Boîte à idées & votes",
    desc: "Proposez vos propres fonctionnalités et votez pour les meilleures idées.",
    icon: BellRing,
  },
  {
    title: "Meilleure personnalisation",
    desc: "Contrôle avancé du design du widget : couleurs, polices et thèmes.",
    icon: Wrench,
  },
  {
    title: "Historique & stats",
    desc: "Récapitulatif des titres les plus joués pendant vos streams.",
    icon: BarChart3,
  },
];

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 overflow-hidden relative flex flex-col justify-between">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[520px] bg-gradient-to-tr from-purple-600/25 via-indigo-500/15 to-emerald-500/15 blur-[170px] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e15_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />

      <div>
        <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3 font-black text-xl tracking-wider">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Music size={20} />
            </div>
            <span className="bg-gradient-to-r from-white via-zinc-200 to-purple-400 bg-clip-text text-transparent">
              Twichify
            </span>
          </div>

          {!session ? (
            <button
              onClick={() => signIn("twitch")}
              className="hidden sm:flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950/60 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-purple-500/60 hover:text-white"
            >
              <Tv size={16} className="text-purple-400" />
              Connexion Twitch
            </button>
          ) : (
            <div className="flex items-center gap-3 rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-2 shadow-lg shadow-black/30">
              <img src={session.user?.image || ""} alt="Profil" className="w-8 h-8 rounded-full border border-zinc-700 object-cover" />
              <div className="hidden sm:block text-left">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Connecté</p>
                <p className="text-sm font-bold text-white">{session.user?.name}</p>
              </div>
            </div>
          )}
        </header>

        <div className="relative max-w-5xl mx-auto px-6 pt-14 pb-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800/80 text-zinc-300 text-sm mb-8 backdrop-blur-md shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-semibold text-zinc-400">Version 2.0 en préparation</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 bg-gradient-to-b from-white via-zinc-100 to-zinc-500 bg-clip-text text-transparent leading-[1.07]">
            Affichez votre musique
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent">
              en direct sur Twitch.
            </span>
          </h1>

          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Liez votre compte Twitch, connectez votre API Spotify, personnalisez votre widget et donnez à votre communauté une expérience immersive.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            {!session ? (
              <button
                onClick={() => signIn("twitch")}
                className="group relative flex items-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(147,51,234,0.45)] active:scale-95"
              >
                <Tv size={24} />
                Se connecter avec Twitch
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-4 p-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl pr-6 backdrop-blur-md shadow-2xl">
                  <img src={session.user?.image || ""} alt="Profil" className="w-12 h-12 rounded-xl border border-zinc-700 object-cover" />
                  <div className="text-left">
                    <p className="text-xs text-zinc-500 font-medium">Connecté en tant que</p>
                    <p className="font-bold text-white">{session.user?.name}</p>
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap justify-center">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/10"
                  >
                    <Settings size={20} />
                    Dashboard
                  </Link>
                  <Link
                    href="/status"
                    className="px-6 py-3 rounded-xl font-bold bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800 transition-all active:scale-95 text-zinc-300 hover:text-white"
                  >
                    Statut API
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="px-6 py-3 rounded-xl font-bold bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800 transition-all active:scale-95 text-zinc-300 hover:text-white"
                  >
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="inline-grid grid-cols-3 gap-6 sm:gap-12 py-4 px-8 rounded-2xl bg-zinc-950/40 border border-zinc-800/50 backdrop-blur-md text-zinc-400 text-xs sm:text-sm font-medium">
            <div>
              <p className="font-bold text-white text-base sm:text-lg">&lt; 50ms</p>
              <p className="text-zinc-500">Temps de réponse</p>
            </div>
            <div className="border-x border-zinc-800/80 px-4 sm:px-8">
              <p className="font-bold text-emerald-400 text-base sm:text-lg">99.9%</p>
              <p className="text-zinc-500">Uptime garanti</p>
            </div>
            <div>
              <p className="font-bold text-white text-base sm:text-lg">100%</p>
              <p className="text-zinc-500">Données sécurisées</p>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8 grid sm:grid-cols-2 gap-6">
          <FeatureCard
            icon={<Zap className="text-emerald-400" />}
            title="Temps réel instantané"
            desc="Mise à jour ultra-rapide du titre, de l'artiste et de l'album directement depuis Spotify."
            accentColor="hover:border-emerald-500/40"
          />
          <FeatureCard
            icon={<ShieldCheck className="text-purple-400" />}
            title="Clés API personnelles"
            desc="Sécurité totale : vous gardez le contrôle complet de vos identifiants développeur."
            accentColor="hover:border-purple-500/40"
          />
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="rounded-[32px] border border-purple-500/20 bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-zinc-950 p-8 shadow-2xl shadow-purple-950/20 relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-600/10 blur-3xl rounded-full pointer-events-none group-hover:bg-purple-600/20 transition-all" />

            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Rocket size={22} />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-purple-400 flex items-center gap-1">
                  <Sparkles size={12} /> Roadmap V2
                </span>
                <h3 className="text-2xl font-bold text-white">Ce qui arrive prochainement</h3>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 text-left">
              {roadmapItems.map(({ title, desc, icon: Icon }) => (
                <RoadmapItem key={title} title={title} desc={desc} icon={<Icon size={16} />} />
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8 pb-12">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 backdrop-blur-md">
              <div className="mb-3 flex items-center gap-3 text-purple-400">
                <LayoutTemplate size={18} />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">UI</span>
              </div>
              <p className="text-sm text-zinc-300">Widget plus propre, plus lisible et plus personnalisable pour les streamers.</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 backdrop-blur-md">
              <div className="mb-3 flex items-center gap-3 text-emerald-400">
                <Activity size={18} />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">Live</span>
              </div>
              <p className="text-sm text-zinc-300">Informations de l’état API et du système pour un meilleur contrôle en direct.</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 backdrop-blur-md">
              <div className="mb-3 flex items-center gap-3 text-amber-400">
                <MessageSquareText size={18} />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">Community</span>
              </div>
              <p className="text-sm text-zinc-300">Interactions plus fortes avec le chat, les votes et la communauté Twitch.</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center py-8 text-zinc-600 text-sm border-t border-zinc-900/80 bg-zinc-950/50">
        © 2026 Twichify — Propulsé par Next.js & Vercel
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, desc, accentColor }: { icon: React.ReactNode, title: string, desc: string, accentColor: string }) {
  return (
    <div className={`p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 transition-all hover:-translate-y-1 shadow-lg backdrop-blur-sm group ${accentColor}`}>
      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-inner">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-zinc-400 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}

function RoadmapItem({ title, desc, icon }: { title: string, desc: string, icon: React.ReactNode }) {
  return (
    <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/60 flex flex-col justify-between transition hover:border-purple-500/30 hover:bg-zinc-900">
      <div>
        <div className="flex items-center gap-2 mb-3 text-purple-400">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">{icon}</span>
          <h4 className="font-bold text-base text-zinc-100">{title}</h4>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed pl-10">{desc}</p>
      </div>
    </div>
  );
}