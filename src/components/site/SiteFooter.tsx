import Link from "next/link";
import { Music } from "lucide-react";

// Pied de page unique de toutes les pages publiques (accueil, changelog, aide, mentions légales…).
const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/ideas", label: "Idées" },
  { href: "/changelog", label: "Changelog" },
  { href: "/help", label: "Aide" },
  { href: "/privacy", label: "Confidentialité & CGU" },
  { href: "/mentions-legales", label: "Mentions légales" },
];

export default function SiteFooter() {
  return (
    <footer className="z-20 mt-auto w-full border-t border-white/10 bg-black/40 backdrop-blur-md">
      <div className="mx-auto max-w-7xl space-y-3 px-6 py-6">
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-zinc-400 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-600">
              <Music size={12} className="text-white" />
            </span>
            <span className="font-display font-extrabold text-zinc-200">Twichify</span>
            <span>© 2026 Tous droits réservés.</span>
          </div>

          <nav aria-label="Liens du site" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-medium">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded transition-colors hover:text-purple-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="text-center text-xs text-zinc-500 sm:text-left">
          Non affilié à Spotify AB ni Twitch Interactive, Inc.
        </p>
      </div>
    </footer>
  );
}
