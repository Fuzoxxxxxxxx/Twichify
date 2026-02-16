"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Music, Tv, Settings, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30">
      {/* Background Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-600/20 blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Disponible pour Vercel & OBS
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
          Affichez votre musique <br /> en direct sur Twitch.
        </h1>
        
        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Un widget personnalisé pour vos streams. Connectez Twitch, configurez votre propre API Spotify et récupérez votre lien OBS en 2 minutes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {!session ? (
            <button 
              onClick={() => signIn("twitch")}
              className="group flex items-center gap-3 bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(147,51,234,0.4)]"
            >
              <Tv size={24} />
              Se connecter avec Twitch
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-4 p-2 bg-zinc-900 border border-zinc-800 rounded-2xl pr-6">
                <img src={session.user?.image || ""} alt="Profil" className="w-12 h-12 rounded-xl border border-zinc-700" />
                <div className="text-left">
                  <p className="text-sm text-zinc-500">Connecté en tant que</p>
                  <p className="font-bold">{session.user?.name}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Link 
                  href="/dashboard"
                  className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition"
                >
                  <Settings size={20} />
                  Dashboard
                </Link>
                <button 
                  onClick={() => signOut()}
                  className="px-6 py-3 rounded-xl font-bold bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-5xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-8">
        <FeatureCard 
          icon={<Music className="text-green-500" />}
          title="Données en temps réel"
          desc="Récupère instantanément le titre, l'artiste et la pochette depuis Spotify."
        />
        <FeatureCard 
          icon={<Settings className="text-purple-500" />}
          title="Votre propre API"
          desc="Sécurité maximale : vous utilisez vos propres identifiants Spotify Developer."
        />
        <FeatureCard 
          icon={<Tv className="text-blue-500" />}
          title="Optimisé OBS"
          desc="Une URL unique à copier-coller dans votre source navigateur OBS."
        />
      </div>

      {/* Footer */}
      <footer className="text-center py-10 text-zinc-600 text-sm border-t border-zinc-900">
        © 2026 SpotifyNowPlaying — Propulsé par Next.js & Vercel
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-8 rounded-3xl bg-zinc-950 border border-zinc-900 hover:border-zinc-800 transition shadow-sm">
      <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center mb-6 border border-zinc-800">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-zinc-500 leading-relaxed">{desc}</p>
    </div>
  );
}