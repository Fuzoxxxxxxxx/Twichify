"use client";

import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, History, LifeBuoy, Music, Tv } from "lucide-react";

// Liens de la barre. `match` = préfixes d'URL pour lesquels le lien est surligné
// (« Aide » reste actif sur les pages de support, qui en dépendent).
const NAV_LINKS = [
  { href: "/changelog", label: "Changelog", icon: History, match: ["/changelog"] },
  { href: "/ideas", label: "Idées", icon: BellRing, match: ["/ideas"] },
  { href: "/help", label: "Aide", icon: LifeBuoy, match: ["/help", "/support"] },
];

// Barre de navigation commune à l'accueil et aux pages publiques (changelog, idées, aide, support, état des
// services, pages légales). Elle n'est pas affichée dans le dashboard, l'admin, les widgets OBS ni les pages d'erreur.
// Reste connectée à l'état de session : bouton « Connexion Twitch » quand personne n'est connecté, sinon carte
// avec l'avatar et le pseudo qui ouvre le dashboard.
export default function SiteHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 font-black text-xl tracking-wider">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
            <Music size={20} />
          </div>
          <span className="bg-gradient-to-r from-white via-zinc-200 to-purple-400 bg-clip-text text-transparent">
            Twichify
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {NAV_LINKS.map(({ href, label, icon: Icon, match }) => {
            const isActive = match.some((prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`));
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                  isActive ? "text-purple-400" : "text-zinc-500 hover:text-purple-400"
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}

          {!session ? (
            <button
              onClick={() => signIn("twitch")}
              className="flex items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-950/60 px-4 sm:px-5 py-2 text-sm font-semibold text-zinc-200 transition-all hover:border-purple-500/60 hover:text-white hover:bg-purple-500/10 shadow-sm"
            >
              <Tv size={16} className="text-purple-400" />
              <span className="sm:hidden">Connexion</span>
              <span className="hidden sm:inline">Connexion Twitch</span>
            </button>
          ) : (
            <Link
              href="/dashboard"
              title="Ouvrir le dashboard"
              className="flex items-center gap-3 rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1.5 shadow-lg shadow-black/30 transition-all hover:border-purple-500/40"
            >
              <img
                src={session.user?.image || ""}
                alt="Profil"
                className="w-8 h-8 rounded-full border border-zinc-700 object-cover"
              />
              <div className="hidden sm:block text-left pr-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Connecté</p>
                <p className="text-sm font-bold text-white">{session.user?.name}</p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
