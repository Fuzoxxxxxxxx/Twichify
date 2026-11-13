import Link from "next/link";
import type { Metadata } from "next";
import { Server, Mail, Copyright, Flag, ShieldCheck, Scale } from "lucide-react";
import PublicShell from "@/components/site/PublicShell";
import PageIntro, { LegalSection } from "@/components/site/PageIntro";

export const metadata: Metadata = {
  title: "Mentions légales | Twichify",
  description:
    "Mentions légales de Twichify : éditeur, hébergement du site et de la base de données, propriété intellectuelle, signalement de contenu et droit applicable.",
};

const LAST_UPDATED = "8 novembre 2026";
const CONTACT = "contact.twichify@gmail.com";

// L'essentiel en un coup d'œil, avant le détail de chaque rubrique.
const AT_A_GLANCE = [
  { label: "Éditeur", value: "Une personne physique, à titre non professionnel" },
  { label: "Hébergement", value: "Vercel Inc. (site) et MongoDB Atlas, dans l'UE (base de données)" },
  { label: "Contact", value: CONTACT, href: `mailto:${CONTACT}` },
] as const;

// Fiche d'un prestataire d'hébergement.
function HostCard({
  role,
  name,
  children,
}: {
  role: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <p className="text-sm font-medium text-purple-300">{role}</p>
      <h3 className="mt-1 text-base font-semibold text-white">{name}</h3>
      <div className="mt-3 space-y-1 text-sm leading-relaxed text-zinc-400">{children}</div>
    </div>
  );
}

export default function MentionsLegalesPage() {
  return (
    <PublicShell>
      <PageIntro title="Mentions légales" meta={`Dernière mise à jour : ${LAST_UPDATED}`}>
        Conformément à l'article 6-III de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie
        numérique (LCEN), voici les informations légales relatives au site Twichify.
      </PageIntro>

      <section aria-label="L'essentiel" className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {AT_A_GLANCE.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-sm text-zinc-400">{item.label}</p>
            <p className="mt-1 break-words text-sm font-medium leading-snug text-zinc-200">
              {"href" in item ? (
                <a href={item.href} className="text-purple-300 hover:underline">
                  {item.value}
                </a>
              ) : (
                item.value
              )}
            </p>
          </div>
        ))}
      </section>

      <div className="mt-4">
        <LegalSection id="editeur" title="Éditeur du site" icon={<Mail size={18} aria-hidden="true" />}>
          <p>
            Le site Twichify est édité par une personne physique, agissant à titre non professionnel et personnel.
            Conformément à l'article 6-III-2 de la LCEN, un éditeur particulier peut ne pas rendre publics son nom et
            son adresse, à condition de les avoir communiqués à son hébergeur.
          </p>
          <p>
            <strong className="text-zinc-200">Directeur de la publication :</strong> l'éditeur du site, joignable à
            l'adresse suivante :{" "}
            <a href={`mailto:${CONTACT}`} className="font-medium">
              {CONTACT}
            </a>
          </p>
        </LegalSection>

        <LegalSection id="hebergement" title="Hébergement" icon={<Server size={18} aria-hidden="true" />}>
          <p>Le service repose sur deux prestataires d'hébergement :</p>
          <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
            <HostCard role="Site et exécution du service" name="Vercel Inc.">
              <p>
                440 N Barranca Ave #4133
                <br />
                Covina, CA 91723, États-Unis
              </p>
              <p>Les fonctions du service sont configurées pour s'exécuter dans la région de Paris.</p>
              <p>
                <a href="https://vercel.com/legal" target="_blank" rel="noopener noreferrer">
                  vercel.com/legal
                </a>
              </p>
            </HostCard>

            <HostCard role="Base de données" name="MongoDB Atlas (MongoDB, Inc.)">
              <p>Cluster situé dans l'Union européenne (région AWS Paris, eu-west-3).</p>
              <p>
                <a href="https://www.mongodb.com/legal" target="_blank" rel="noopener noreferrer">
                  mongodb.com/legal
                </a>
              </p>
            </HostCard>
          </div>
        </LegalSection>

        <LegalSection id="propriete" title="Propriété intellectuelle" icon={<Copyright size={18} aria-hidden="true" />}>
          <p>
            L'ensemble des éléments du site Twichify (textes, graphismes, logo, code source) est protégé par le droit
            d'auteur, sauf mention contraire. Toute reproduction, représentation ou exploitation, totale ou partielle,
            sans autorisation préalable, est interdite.
          </p>
          <p>
            Twichify n'est affilié, approuvé, sponsorisé ni soutenu officiellement par Spotify AB ou Twitch
            Interactive, Inc. Les marques et noms cités sur le site appartiennent à leurs propriétaires respectifs.
          </p>
          <p>
            Les logos de plateformes proposés dans le widget bandeau d'informations (Discord, YouTube, TikTok, Twitch,
            Instagram, X, Kick…) appartiennent à leurs titulaires. Ils servent uniquement à renvoyer vers votre chaîne
            sur ces plateformes, sans aucun lien d'affiliation ni d'approbation.
          </p>
        </LegalSection>

        <LegalSection id="signalement" title="Contenus publiés et signalement" icon={<Flag size={18} aria-hidden="true" />}>
          <p>
            Les idées et commentaires publiés sur le site (boîte à idées) sont de la responsabilité de leurs auteurs.
          </p>
          <p>
            Pour signaler un contenu manifestement illicite, écrivez à{" "}
            <a href={`mailto:${CONTACT}`} className="font-medium">
              {CONTACT}
            </a>{" "}
            en indiquant l'adresse de la page concernée, une description du contenu et le motif du signalement.
          </p>
        </LegalSection>

        <LegalSection id="confidentialite" title="Données personnelles et conditions d'utilisation" icon={<ShieldCheck size={18} aria-hidden="true" />}>
          <p>
            Le traitement de vos données personnelles, les cookies et vos droits sont détaillés dans notre{" "}
            <Link href="/privacy#confidentialite">politique de confidentialité</Link>. Les conditions d'utilisation du
            service figurent dans nos <Link href="/privacy#conditions">conditions générales</Link>.
          </p>
        </LegalSection>

        <LegalSection id="droit" title="Droit applicable" icon={<Scale size={18} aria-hidden="true" />}>
          <p>Le site Twichify est soumis au droit français.</p>
        </LegalSection>
      </div>
    </PublicShell>
  );
}
