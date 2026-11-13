import Link from "next/link";
import type { Metadata } from "next";
import {
  Music,
  MessageSquare,
  Megaphone,
  Rocket,
  ShieldCheck,
  Scale,
  Eye,
  Server,
  Lightbulb,
  History,
  Activity,
  Mail,
  LifeBuoy,
  BookOpen,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import PublicShell from "@/components/site/PublicShell";
import PageIntro, { LegalSection } from "@/components/site/PageIntro";

export const metadata: Metadata = {
  title: "À propos | Twichify",
  description:
    "Twichify affiche la musique Spotify en cours et le chat Twitch dans votre stream, avec des overlays personnalisables. Découvrez le projet, ses principes et comment y participer.",
  openGraph: {
    title: "À propos de Twichify",
    description:
      "Un projet indépendant et gratuit : musique Spotify, chat Twitch et bandeau d'information pour votre stream, sans rien installer.",
    url: "https://twichify.vercel.app/a-propos",
    siteName: "Twichify",
    type: "website",
  },
};

const CONTACT = "contact.twichify@gmail.com";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

// L'essentiel en un coup d'œil, avant le détail.
const AT_A_GLANCE = [
  { label: "Prix", value: "Gratuit. Seule la musique demande Spotify Premium, payé chez Spotify" },
  { label: "Projet", value: "Indépendant, porté par une personne à titre non professionnel" },
  { label: "Données", value: "Base de données hébergée dans l'Union européenne" },
] as const;

// Ce que propose Twichify aujourd'hui.
const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Music,
    title: "Widget musique",
    desc: "Titre, artiste, pochette et progression de votre morceau Spotify en direct, avec des thèmes, des couleurs et des animations réglables.",
  },
  {
    icon: MessageSquare,
    title: "Widget chat",
    desc: "Les messages du chat de votre chaîne Twitch affichés à l'écran, dans un style assorti à votre stream.",
  },
  {
    icon: Megaphone,
    title: "Bandeau d'information",
    desc: "Vos réseaux et vos messages en rotation, avec logos, polices, couleurs et animations, pour inviter vos viewers à vous suivre.",
  },
];

// Les engagements du projet, formulés à partir de ce que le site fait réellement.
const PRINCIPLES: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: ShieldCheck,
    title: "Vos clés restent les vôtres",
    desc: "Pour la musique, vous connectez votre propre application développeur Spotify : ce sont vos identifiants, pas ceux de Twichify.",
  },
  {
    icon: Rocket,
    title: "Rien à installer",
    desc: "Chaque widget est un lien à coller comme source navigateur dans OBS, Streamlabs ou tout autre logiciel de stream.",
  },
  {
    icon: Scale,
    title: "Indépendant",
    desc: "Twichify n'est affilié, approuvé ni sponsorisé par Spotify AB ou Twitch Interactive, Inc. Leurs marques appartiennent à leurs propriétaires.",
  },
  {
    icon: Eye,
    title: "Transparent",
    desc: "Les nouveautés, l'état du service et la boîte à idées sont publics : vous voyez ce qui change, et ce qui est en préparation.",
  },
];

// Pages utiles pour suivre ou faire évoluer le projet.
const PARTICIPATE: { href: string; icon: LucideIcon; title: string; desc: string }[] = [
  { href: "/ideas", icon: Lightbulb, title: "Boîte à idées", desc: "Proposez une amélioration ou une nouvelle fonction." },
  { href: "/changelog", icon: History, title: "Changelog", desc: "L'historique des nouveautés et des corrections." },
  { href: "/status", icon: Activity, title: "État du service", desc: "Vérifiez que tout fonctionne avant d'ouvrir un ticket." },
];

function InfoCard({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300">
        <Icon size={20} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{desc}</p>
    </div>
  );
}

export default function AProposPage() {
  return (
    <PublicShell width="max-w-4xl">
      <PageIntro title="À propos de Twichify">
        Twichify affiche la musique que vous écoutez sur Spotify et le chat de votre chaîne Twitch directement dans
        votre stream, avec des overlays que vous personnalisez à votre image.
      </PageIntro>

      <section aria-label="L'essentiel" className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {AT_A_GLANCE.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-sm text-zinc-400">{item.label}</p>
            <p className="mt-1 text-sm font-medium leading-snug text-zinc-200">{item.value}</p>
          </div>
        ))}
      </section>

      <div className="mt-4">
        <LegalSection id="projet" title="Le projet" icon={<Rocket size={18} aria-hidden="true" />}>
          <p>
            Montrer à son public la musique en cours ou le chat à l'écran ne devrait pas demander de logiciel
            supplémentaire ni de longues heures de réglages. Twichify part de ce constat : vous connectez vos comptes,
            vous choisissez un style avec un aperçu en direct, puis vous collez un lien dans votre logiciel de stream.
          </p>
          <p>
            Le site est édité à titre personnel et non professionnel. Il évolue grâce aux retours de celles et ceux qui
            l'utilisent : chaque amélioration vient d'un besoin réel de streamers.
          </p>
        </LegalSection>

        <LegalSection id="fonctionnalites" title="Ce que vous y trouvez" icon={<Music size={18} aria-hidden="true" />}>
          <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <InfoCard key={feature.title} {...feature} />
            ))}
          </div>
          <p>
            Tout se règle depuis un tableau de bord, avec un aperçu en direct à chaque changement. Pas à pas, la{" "}
            <Link href="/help">page d'aide</Link> explique l'installation dans OBS.
          </p>
        </LegalSection>

        <LegalSection id="principes" title="Nos principes" icon={<ShieldCheck size={18} aria-hidden="true" />}>
          <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
            {PRINCIPLES.map((principle) => (
              <InfoCard key={principle.title} {...principle} />
            ))}
          </div>
        </LegalSection>

        <LegalSection id="technique" title="Sous le capot" icon={<Server size={18} aria-hidden="true" />}>
          <p>
            Le site est construit avec Next.js et hébergé sur Vercel. La base de données (MongoDB Atlas) est située
            dans l'Union européenne. Le détail des prestataires figure dans les{" "}
            <Link href="/mentions-legales#hebergement">mentions légales</Link>, et celui des données traitées dans la{" "}
            <Link href="/privacy#confidentialite">politique de confidentialité</Link>.
          </p>
        </LegalSection>

        <LegalSection id="participer" title="Suivre et faire évoluer Twichify" icon={<Lightbulb size={18} aria-hidden="true" />}>
          <p>Trois pages pour suivre le projet et y contribuer :</p>
          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-3">
            {PARTICIPATE.map(({ href, icon: Icon, title, desc }) => (
              <Link
                key={href}
                href={href}
                className={`group rounded-2xl border border-white/10 bg-white/[0.02] p-4 !text-inherit no-underline transition-colors hover:border-purple-400/40 hover:bg-white/[0.04] hover:!no-underline ${FOCUS}`}
              >
                <span className="flex items-center justify-between text-purple-300">
                  <Icon size={18} aria-hidden="true" />
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
                <span className="mt-3 block text-base font-semibold text-white">{title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-zinc-400">{desc}</span>
              </Link>
            ))}
          </div>
        </LegalSection>

        <LegalSection id="contact" title="Nous contacter" icon={<Mail size={18} aria-hidden="true" />}>
          <p>
            Une question, un problème ou une suggestion ? Consultez d'abord la{" "}
            <Link href="/help" className="inline-flex items-center gap-1.5">
              <BookOpen size={14} aria-hidden="true" />
              page d'aide
            </Link>
            , puis passez par le{" "}
            <Link href="/support" className="inline-flex items-center gap-1.5">
              <LifeBuoy size={14} aria-hidden="true" />
              support
            </Link>{" "}
            si besoin. Vous pouvez aussi écrire à{" "}
            <a href={`mailto:${CONTACT}`} className="font-medium">
              {CONTACT}
            </a>
            .
          </p>
        </LegalSection>
      </div>
    </PublicShell>
  );
}
