"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BellRing, History, LifeBuoy, Menu, Music, Tv, X } from "lucide-react";

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
  // Mobile : les liens de la barre sont masqués sous `sm`, ils passent dans un menu déroulant (fermé à chaque navigation et avec Échap).
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);
  // Retour sur la page d'où l'on vient après la connexion (sauf depuis l'accueil et les pages de connexion elles-mêmes).
  const connectHref =
    pathname && pathname !== "/" && !pathname.startsWith("/auth")
      ? `/auth/connexion?callbackUrl=${encodeURIComponent(pathname)}`
      : "/auth/connexion";

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 font-black text-xl tracking-wider">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
            <Music size={20} />
          </div>
          <span className="bg-gradient-to-r from-white via-zinc-200 to-purple-400 bg-clip-text text-transparent">
            Twichify
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="site-mobile-menu"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/70 text-zinc-300 transition-colors hover:border-purple-500/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 sm:hidden"
          >
            {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
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
            <Link
              href={connectHref}
              className="flex items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-950/60 px-4 sm:px-5 py-2 text-sm font-semibold text-zinc-200 transition-all hover:border-purple-500/60 hover:text-white hover:bg-purple-500/10 shadow-sm"
            >
              <Tv size={16} className="text-purple-400" />
              <span className="sm:hidden">Connexion</span>
              <span className="hidden sm:inline">Connexion Twitch</span>
            </Link>
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

      {menuOpen && (
        <nav
          id="site-mobile-menu"
          aria-label="Navigation du site"
          className="absolute inset-x-0 top-full border-b border-white/10 bg-zinc-950/95 px-4 py-2 shadow-2xl shadow-black/50 backdrop-blur-xl sm:hidden"
        >
          {NAV_LINKS.map(({ href, label, icon: Icon, match }) => {
            const isActive = match.some((prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`));
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-white/[0.07] text-purple-300" : "text-zinc-300 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
