import Link from "next/link";
import type { Metadata } from "next";
import { Server, Mail, Copyright } from "lucide-react";
import PublicShell from "@/components/site/PublicShell";
import PageIntro, { LegalSection } from "@/components/site/PageIntro";

export const metadata: Metadata = {
  title: "Mentions légales | Twichify",
  description: "Mentions légales de Twichify : éditeur, hébergement et propriété intellectuelle.",
};

const LAST_UPDATED = "23 septembre 2026";

export default function MentionsLegalesPage() {
  return (
    <PublicShell>
      <PageIntro title="Mentions légales" meta={`Dernière mise à jour : ${LAST_UPDATED}`}>
        Conformément à l'article 6-III de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie
        numérique (LCEN), voici les informations légales relatives au site Twichify.
      </PageIntro>

      <div className="mt-2">
        <LegalSection id="editeur" title="Éditeur du site" icon={<Mail size={18} aria-hidden="true" />}>
          <p>
            Le site Twichify est édité par une personne physique, agissant à titre non professionnel et personnel.
            Conformément à l'article 6-III-1 de la LCEN, les éditeurs particuliers n'agissant pas à titre
            professionnel peuvent ne pas rendre publiques leur identité et leur adresse dès lors qu'ils ont
            communiqué ces informations à leur hébergeur.
          </p>
          <p>
            Toute demande relative à l'édition du site peut être adressée à :{" "}
            <a href="mailto:contact.twichify@gmail.com" className="font-medium">
              contact.twichify@gmail.com
            </a>
          </p>
          <p>
            <strong className="text-zinc-200">Directeur de la publication :</strong> l'éditeur du site, joignable à
            l'adresse ci-dessus.
          </p>
        </LegalSection>

        <LegalSection id="hebergement" title="Hébergement" icon={<Server size={18} aria-hidden="true" />}>
          <p>Le site est hébergé par :</p>
          <p className="text-zinc-300">
            Vercel Inc.
            <br />
            440 N Barranca Ave #4133
            <br />
            Covina, CA 91723, États-Unis
            <br />
            <a href="https://vercel.com/legal" target="_blank" rel="noopener noreferrer">
              vercel.com/legal
            </a>
          </p>
        </LegalSection>

        <LegalSection id="propriete" title="Propriété intellectuelle" icon={<Copyright size={18} aria-hidden="true" />}>
          <p>
            L'ensemble des éléments du site Twichify (textes, graphismes, logo, code source) est protégé par le
            droit d'auteur, sauf mention contraire. Toute reproduction, représentation ou exploitation, totale ou
            partielle, sans autorisation préalable, est interdite.
          </p>
          <p>
            Twichify n'est affilié, approuvé, sponsorisé ni soutenu officiellement par Spotify AB ou Twitch
            Interactive, Inc. Les marques citées sur le site appartiennent à leurs propriétaires respectifs.
          </p>
        </LegalSection>

        <LegalSection id="confidentialite" title="Confidentialité et conditions d'utilisation">
          <p>
            Le traitement de vos données personnelles et les conditions d'utilisation du service sont détaillés sur
            notre page <Link href="/privacy">Confidentialité &amp; CGU</Link>.
          </p>
        </LegalSection>
      </div>
    </PublicShell>
  );
}
