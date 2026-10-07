import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import type { Metadata } from "next";
import { Scale, ArrowLeft, Server, Mail, Copyright } from "lucide-react";

export const metadata: Metadata = {
  title: "Mentions légales | Twichify",
  description: "Mentions légales de Twichify : éditeur, hébergement et propriété intellectuelle.",
};

const LAST_UPDATED = "23 septembre 2026";

export default function MentionsLegalesPage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#030305] font-sans text-zinc-300 selection:bg-purple-500/30 selection:text-purple-200">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-purple-600/10 blur-[130px]"
      />

      <SiteHeader />

      <div className="relative mx-auto max-w-3xl space-y-10 px-4 py-16 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-zinc-900/60 px-4 py-2 text-xs font-medium text-zinc-400 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-white/10 hover:bg-zinc-800/60 hover:text-white"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Retour à l'accueil
        </Link>

        <header className="space-y-3 border-b border-white/5 pb-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-purple-700/5 text-purple-400 shadow-xl shadow-purple-950/20">
              <Scale size={28} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Mentions légales</h1>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-400">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                <span>Dernière mise à jour : {LAST_UPDATED}</span>
              </div>
            </div>
          </div>
          <p className="max-w-xl pt-1 text-sm leading-relaxed text-zinc-400">
            Conformément à l'article 6-III de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie
            numérique (LCEN), voici les informations légales relatives au site Twichify.
          </p>
        </header>

        <section className="space-y-3 rounded-2xl border border-white/5 bg-zinc-900/20 p-6">
          <h2 className="flex items-center gap-2.5 text-base font-bold text-white">
            <Mail size={16} className="text-purple-400" aria-hidden="true" />
            Éditeur du site
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400">
            Le site Twichify est édité par une personne physique, agissant à titre non professionnel et personnel.
            Conformément à l'article 6-III-1 de la LCEN, les éditeurs particuliers n'agissant pas à titre
            professionnel peuvent ne pas rendre publiques leur identité et leur adresse dès lors qu'ils ont
            communiqué ces informations à leur hébergeur.
          </p>
          <p className="text-sm leading-relaxed text-zinc-400">
            Toute demande relative à l'édition du site peut être adressée à :{" "}
            <a
              href="mailto:contact.twichify@gmail.com"
              className="font-medium text-purple-400 hover:underline"
            >
              contact.twichify@gmail.com
            </a>
          </p>
          <p className="text-sm leading-relaxed text-zinc-400">
            <strong className="text-zinc-200">Directeur de la publication :</strong> l'éditeur du site, joignable à
            l'adresse ci-dessus.
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-white/5 bg-zinc-900/20 p-6">
          <h2 className="flex items-center gap-2.5 text-base font-bold text-white">
            <Server size={16} className="text-purple-400" aria-hidden="true" />
            Hébergement
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400">
            Le site est hébergé par :
          </p>
          <p className="text-sm leading-relaxed text-zinc-300">
            Vercel Inc.
            <br />
            440 N Barranca Ave #4133
            <br />
            Covina, CA 91723, États-Unis
            <br />
            <a
              href="https://vercel.com/legal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:underline"
            >
              vercel.com/legal
            </a>
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-white/5 bg-zinc-900/20 p-6">
          <h2 className="flex items-center gap-2.5 text-base font-bold text-white">
            <Copyright size={16} className="text-purple-400" aria-hidden="true" />
            Propriété intellectuelle
          </h2>
          <p className="text-sm leading-relaxed text-zinc-400">
            L'ensemble des éléments du site Twichify (textes, graphismes, logo, code source) est protégé par le
            droit d'auteur, sauf mention contraire. Toute reproduction, représentation ou exploitation, totale ou
            partielle, sans autorisation préalable, est interdite.
          </p>
          <p className="text-sm leading-relaxed text-zinc-400">
            Twichify n'est affilié, approuvé, sponsorisé ni soutenu officiellement par Spotify AB ou Twitch
            Interactive, Inc. Les marques citées sur le site appartiennent à leurs propriétaires respectifs.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-950/40 to-zinc-900/60 p-6">
          <h2 className="text-sm font-bold text-white">Confidentialité et conditions d'utilisation</h2>
          <p className="text-xs leading-relaxed text-zinc-400">
            Le traitement de vos données personnelles et les conditions d'utilisation du service sont détaillés sur
            notre page{" "}
            <Link href="/privacy" className="text-purple-400 hover:underline">
              Confidentialité &amp; CGU
            </Link>
            .
          </p>
        </section>

        <footer className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-zinc-400 sm:flex-row">
          <p>© 2026 Twichify. Tous droits réservés.</p>
          <Link href="/dashboard" className="font-medium text-zinc-400 transition-colors hover:text-purple-400">
            Retourner au tableau de bord
          </Link>
        </footer>
      </div>
    </main>
  );
}
