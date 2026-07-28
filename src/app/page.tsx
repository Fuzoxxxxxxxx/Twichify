"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Music, Tv, Settings, ArrowRight, ShieldCheck, Zap, LifeBuoy, Activity, Bot, MessageSquare, Rocket, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 overflow-hidden relative flex flex-col justify-between">
      {/* Background Glows & Grid Patterns */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-purple-600/25 via-indigo-500/15 to-green-500/20 blur-[150px] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e15_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />

      <div>
        {/* Header Bar */}
        <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-xl tracking-wider">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Music size={20} />
            </div>
            <span className="bg-gradient-to-r from-white via-zinc-200 to-purple-400 bg-clip-text text-transparent">
              Twichify
            </span>
          </div>
        </header>

        {/* Hero Section */}
        <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
          {/* Status Badge Link */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800/80 text-zinc-300 text-sm mb-8 backdrop-blur-md shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-semibold text-zinc-400">Version 1.0 Active</span>
          </div>
          
          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 bg-gradient-to-b from-white via-zinc-100 to-zinc-500 bg-clip-text text-transparent leading-[1.1]">
            Affichez votre musique <br />
            <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-green-400 bg-clip-text text-transparent">
              en direct sur Twitch.
            </span>
          </h1>
          
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Liez votre compte Twitch, connectez votre propre API Spotify et partagez ce que vous écoutez en temps réel avec votre communauté.
          </p>

          {/* Auth / Actions */}
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
                <div className="flex gap-3">
                  <Link 
                    href="/dashboard"
                    className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/10"
                  >
                    <Settings size={20} />
                    Dashboard
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

          {/* Fast Stats / Highlights Strip */}
          <div className="inline-grid grid-cols-3 gap-6 sm:gap-12 py-4 px-8 rounded-2xl bg-zinc-950/40 border border-zinc-800/50 backdrop-blur-md text-zinc-400 text-xs sm:text-sm font-medium">
            <div>
              <p className="font-bold text-white text-base sm:text-lg">&lt; 50ms</p>
              <p className="text-zinc-500">Temps de réponse</p>
            </div>
            <div className="border-x border-zinc-800/80 px-4 sm:px-8">
              <p className="font-bold text-green-400 text-base sm:text-lg">99.9%</p>
              <p className="text-zinc-500">Uptime garanti</p>
            </div>
            <div>
              <p className="font-bold text-white text-base sm:text-lg">100%</p>
              <p className="text-zinc-500">Data sécurisée</p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-5xl mx-auto px-6 py-8 grid sm:grid-cols-2 gap-6">
          <FeatureCard 
            icon={<Zap className="text-green-400" />}
            title="Temps Réel Instantané"
            desc="Mise à jour ultra-rapide du titre, de l'artiste et de l'album directement depuis Spotify."
            accentColor="hover:border-green-500/40"
          />
          <FeatureCard 
            icon={<ShieldCheck className="text-purple-400" />}
            title="Clés API Personnelles"
            desc="Sécurité totale : vous conservez l'entière propriété de vos identifiants Developer."
            accentColor="hover:border-purple-500/40"
          />
        </div>

        {/* Roadmap / Prochainement Card */}
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="p-8 rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-zinc-950 border border-purple-500/20 relative overflow-hidden group shadow-2xl">
            {/* Ambient Card Light */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-600/10 blur-3xl rounded-full pointer-events-none group-hover:bg-purple-600/20 transition-all" />
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Rocket size={22} />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-purple-400 flex items-center gap-1">
                  <Sparkles size={12} /> Roadmap
                </span>
                <h3 className="text-xl font-bold text-white">Prochainement sur Twichify</h3>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 text-left">
              <RoadmapItem 
                title="Commandes Chat Bot" 
                desc="API dédiée pour afficher !musique via Nightbot, Wizebot & StreamElements." 
              />
              <RoadmapItem 
                title="Page de Statut API" 
                desc="Suivi en direct de la latence des services et du statut de votre base." 
              />
              <RoadmapItem 
                title="Centre d'Aide & Support" 
                desc="FAQ automatisée et système de signalement de bugs avec webhooks Discord." 
              />
              <RoadmapItem 
                title="Boîte à idées & Votes" 
                desc="Proposez vos propres fonctionnalités et votez pour les meilleures idées de la communauté." 
              />
              <RoadmapItem 
                title="Meilleure Personnalisation" 
                desc="Contrôle avancé du design de votre widget (couleurs, polices, thèmes et mises en page)." 
              />
              <RoadmapItem 
                title="Historique & Stats" 
                desc="Découvrez le récapitulatif et les statistiques des titres les plus joués pendant vos streams." 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
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

function RoadmapItem({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/60 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 size={16} className="text-purple-400/60 flex-shrink-0" />
          <h4 className="font-bold text-sm text-zinc-200">{title}</h4>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed pl-6">{desc}</p>
      </div>
    </div>
  );
}