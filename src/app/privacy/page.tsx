import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { TERMS_REVISED_LABEL } from "@/lib/terms";
import type { Metadata } from "next";
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Lock,
  Database,
  UserCheck,
  Mail,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Confidentialité | Twichify",
  description:
    "Conditions générales d'utilisation et politique de confidentialité de Twichify : données collectées, sécurité, durée de conservation et exercice de vos droits.",
};

// Date de la dernière révision matérielle : source unique dans lib/terms.ts (elle déclenche aussi la
// nouvelle demande d'acceptation). À changer uniquement quand le contenu de cette page change sur le fond.
const LAST_UPDATED = TERMS_REVISED_LABEL;

const FEATURES = [
  {
    icon: Lock,
    title: "Sécurité & Chiffrement",
    description:
      "Authentification via OAuth 2.0. Vos clés et jetons Spotify sont chiffrés avec l'algorithme AES-256-GCM en base de données.",
  },
  {
    icon: Database,
    title: "Données Minimales",
    description:
      "Seules les informations strictement nécessaires à la génération des overlays (Spotify & Chat Twitch) et à l'affichage des statistiques de votre chaîne sont traitées. Les données Twitch sont lues en direct, en lecture seule.",
  },
  {
    icon: UserCheck,
    title: "Conformité RGPD",
    description:
      "Contrôle total sur vos informations : exportez vos données et supprimez définitivement votre compte en quelques clics depuis votre tableau de bord.",
  },
] as const;

// Données affichées dans le tableau de la section 3
const DATA_ROWS = [
  {
    data: "Profil Twitch",
    detail: "Nom d'utilisateur, adresse e-mail et image de profil",
    purpose: "Authentification OAuth et affichage dans le tableau de bord",
    retention: "Jusqu'à la suppression du compte",
  },
  {
    data: "Clés et jeton Spotify",
    detail: "Client ID, Client Secret et refresh token, chiffrés (AES-256-GCM)",
    purpose: "Lire le morceau en cours de lecture pour votre widget musique",
    retention: "Jusqu'à la suppression du compte",
  },
  {
    data: "Jeton de connexion Twitch",
    detail:
      "Jeton d'accès et de rafraîchissement, avec des permissions en lecture seule sur votre chaîne (followers, modérateurs, VIPs, éditeurs, abonnés, bits)",
    purpose: "Connexion à votre compte et affichage de vos statistiques Twitch ; révoqué lors de sa suppression",
    retention: "Jusqu'à la suppression du compte",
  },
  {
    data: "Réglages des widgets",
    detail: "Couleurs, opacité, typographies, filtres du chat, disposition",
    purpose: "Générer vos overlays selon vos préférences",
    retention: "Jusqu'à la suppression du compte",
  },
  {
    data: "Statistiques d'écoute",
    detail: "Durée cumulée, nombre de morceaux, dernier morceau (titre, artiste, pochette)",
    purpose: "Page Statistiques ; calculées tant que le widget musique est actif",
    retention: "Jusqu'à réinitialisation ou suppression du compte",
  },
  {
    data: "Support & boîte à idées",
    detail: "Tickets et messages, idées publiées, votes",
    purpose: "Assistance et retours de la communauté",
    retention: "Tickets supprimés avec le compte ; idées conservées de façon anonymisée",
  },
  {
    data: "Flux du chat Twitch",
    detail: "Messages, pseudos et émoticônes reçus via IRC/WebSockets",
    purpose: "Affichage visuel en temps réel de vos overlays",
    retention: "Non conservés sur nos serveurs",
  },
  {
    data: "Statistiques de chaîne Twitch",
    detail:
      "Followers, abonnés, modérateurs, éditeurs, VIPs, top bits, diffusions et clips de votre chaîne, avec les pseudos et avatars publics Twitch des personnes concernées",
    purpose: "Page Dashboard → Twitch ; lues en direct sur Twitch, en lecture seule",
    retention: "Non enregistrées en base de données (simple cache en mémoire : quelques secondes, quelques heures pour les avatars)",
  },
  {
    data: "Suivi des départs (optionnel)",
    detail:
      "Identifiants Twitch des followers de votre chaîne (aucun pseudo, nom ni date ; 5 000 au maximum) et 200 derniers départs détectés (identifiant et date de détection ; le dernier pseudo connu n'est gardé que pour un compte supprimé ou banni)",
    purpose: "Indiquer qui a quitté votre chaîne, en comparant les analyses entre elles ; uniquement si vous activez le suivi",
    retention: "Tant que le suivi est actif ; supprimée à sa désactivation ou à la suppression du compte",
  },
  {
    data: "Statistiques de chat (optionnel)",
    detail:
      "Compteurs par session (messages par minute, messages par spectateur, emotes et commandes les plus utilisées) et pseudos publics Twitch des chatteurs les plus actifs. Le texte des messages n'est jamais envoyé ni enregistré.",
    purpose: "Page Dashboard → Twitch → Chat ; uniquement si vous les activez",
    retention:
      "90 jours après la dernière activité de la session, ou jusqu'à la suppression de l'historique ou du compte",
  },
  {
    data: "Supervision du service",
    detail:
      "Résultats des vérifications de disponibilité (Spotify, Twitch, base de données), compteurs agrégés d'appels réussis ou échoués des widgets, messages d'incident publiés par l'équipe",
    purpose: "Page Statut et information en cas de panne ; aucune donnée personnelle ni identifiant d'utilisateur",
    retention:
      "Résultats détaillés 3 heures, compteurs horaires 48 heures, agrégats journaliers 95 jours ; messages d'incident conservés",
  },
  {
    data: "Session",
    detail: "Cookie de session strictement nécessaire",
    purpose: "Maintenir votre connexion",
    retention: "Durée de la session",
  },
  {
    data: "Horodatages",
    detail: "Synchronisation des services, date d'acceptation des CGU",
    purpose: "Fonctionnement du service et preuve d'acceptation",
    retention: "Jusqu'à la suppression du compte",
  },
] as const;

const SECTIONS = [
  {
    id: 1,
    short: "Objet",
    title: "Objet et Acceptation des Conditions",
    content: (
      <p>
        En accédant à la plateforme{" "}
        <strong className="font-medium text-white">Twichify</strong>, en
        vous connectant via vos comptes Twitch ou Spotify, ou en intégrant
        nos URL d'overlays sur un logiciel de diffusion (OBS Studio,
        Streamlabs, Twitch Studio), vous acceptez pleinement et sans réserve
        les présentes Conditions Générales d'Utilisation.
      </p>
    ),
  },
  {
    id: 2,
    short: "Service & API",
    title: "Description du Service et Utilisation des API",
    content: (
      <div className="space-y-3">
        <p>
          Twichify fournit aux créateurs de contenu une suite d'outils
          d'affichage dynamique en direct. Le service web interroge les API
          officielles pour transmettre l'état de lecture Spotify (titre,
          artiste, pochette) ainsi que le flux du chat Twitch (messages,
          émoticônes, pseudos des spectateurs) sur des widgets personnalisés.
          Twichify ne héberge et ne diffuse aucun fichier audio ou média
          propriétaire.
        </p>
        <p>
          Le tableau de bord affiche aussi les statistiques de votre propre
          chaîne Twitch (followers, abonnés, équipe, diffusions, clips), lues
          en direct via l'API officielle de Twitch avec des permissions en
          lecture seule. Twichify ne modifie rien sur votre chaîne.
        </p>
      </div>
    ),
  },
  {
    id: 3,
    short: "Données",
    title: "Collecte, Chiffrement et Traitement des Données (RGPD)",
    content: (
      <div className="space-y-4">
        <p>
          Conformément au Règlement Général sur la Protection des Données
          (RGPD), nous respectons le principe de minimisation des données
          collectées. Voici, pour chaque type de donnée, pourquoi elle est
          traitée et combien de temps elle est conservée :
        </p>

        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-zinc-900/60">
          <table className="w-full min-w-[640px] text-left text-xs">
            <caption className="sr-only">
              Données traitées par Twichify, finalité et durée de conservation
            </caption>
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <th scope="col" className="px-4 py-3">Donnée</th>
                <th scope="col" className="px-4 py-3">Finalité</th>
                <th scope="col" className="px-4 py-3">Conservation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-400">
              {DATA_ROWS.map((row) => (
                <tr key={row.data} className="align-top">
                  <th scope="row" className="px-4 py-3 font-normal">
                    <span className="block font-semibold text-white">{row.data}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
                      {row.detail}
                    </span>
                  </th>
                  <td className="px-4 py-3 leading-snug">{row.purpose}</td>
                  <td className="px-4 py-3 leading-snug text-zinc-300">{row.retention}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-200">
            Permissions Twitch demandées (lecture seule)
          </p>
          <ul className="space-y-1.5 border-l border-zinc-800 pl-4 text-xs text-zinc-400">
            <li>
              <code className="text-zinc-300">openid</code> et{" "}
              <code className="text-zinc-300">user:read:email</code> : vous identifier et afficher votre profil.
            </li>
            <li>
              <code className="text-zinc-300">moderator:read:followers</code> : nombre et liste de vos followers.
            </li>
            <li>
              <code className="text-zinc-300">moderation:read</code> et{" "}
              <code className="text-zinc-300">channel:read:editors</code> : liste de vos modérateurs et de vos éditeurs.
            </li>
            <li>
              <code className="text-zinc-300">channel:read:vips</code> : liste de vos VIPs.
            </li>
            <li>
              <code className="text-zinc-300">channel:read:subscriptions</code> : nombre et liste de vos abonnés
              (chaînes affiliées ou partenaires).
            </li>
            <li>
              <code className="text-zinc-300">bits:read</code> : classement des bits de votre chaîne.
            </li>
          </ul>
          <p className="text-xs leading-relaxed text-zinc-500">
            Ces permissions ne permettent aucune action sur votre chaîne (ni écriture, ni modération, ni envoi de
            message). Vous pouvez les retirer à tout moment depuis les connexions de votre compte Twitch.
          </p>
        </div>

        <p className="text-xs leading-relaxed text-zinc-400">
          <strong className="text-zinc-200">Suivi des départs :</strong>{" "}
          cette fonction est facultative et désactivée par défaut. Elle traite des données de tiers (les identifiants
          Twitch de vos followers) uniquement pour vous présenter les départs dans votre tableau de bord : seuls les
          identifiants sont enregistrés, les pseudos et avatars sont relus sur Twitch au moment de l'affichage. Ces données ne sont ni partagées,
          ni utilisées à d'autres fins, ni conservées après la désactivation du suivi. Twitch ne fournissant aucun
          historique de désabonnements, Twichify compare des instantanés de votre liste : un départ n'est donc détecté
          qu'à l'analyse suivante, et il n'est pas possible de savoir pourquoi la personne est partie (hors compte
          supprimé ou banni).
        </p>

        <p className="text-xs leading-relaxed text-zinc-400">
          <strong className="text-zinc-200">Statistiques de chat :</strong>{" "}
          cette fonction est facultative et désactivée par défaut. Lorsqu'elle est activée, votre widget chat compte les
          messages du chat de votre chaîne et n'envoie à Twichify que des compteurs agrégés : le contenu des messages n'est
          jamais transmis ni conservé. Les pseudos publics des chatteurs les plus actifs y figurent pour établir les
          classements. Vous pouvez la mettre en pause et supprimer l'historique à tout moment.
        </p>

        <p className="text-xs text-zinc-400">
          Vos données personnelles ne sont{" "}
          <strong className="text-zinc-200">
            jamais vendues, louées ni cédées
          </strong>{" "}
          à des tiers à des fins commerciales ou publicitaires.
        </p>
      </div>
    ),
  },
  {
    id: 4,
    short: "Services tiers",
    title: "Conformité aux Conditions Tierces (Spotify AB & Twitch Interactive)",
    content: (
      <div className="space-y-3">
        <p>
          L'utilisation du service exige le respect des chartes et règles de
          conduite des services tiers intégrés :
        </p>

        <ul className="space-y-2 border-l border-zinc-800 pl-4 text-zinc-400">
          <li>
            Vous vous engagez à respecter le{" "}
            <a
              href="https://developer.spotify.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:underline"
            >
              Spotify Developer Agreement
            </a>
            , les{" "}
            <a
              href="https://legal.twitch.tv/page/developer-agreement"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:underline"
            >
              Conditions Développeurs Twitch
            </a>{" "}
            ainsi que les Consignes de la communauté Twitch.
          </li>

          <li>
            <strong className="text-zinc-200">
              Affichage du Chat :
            </strong>{" "}
            Twichify agit comme un simple relais d'affichage visuel et ne
            modère pas automatiquement le contenu transmis depuis votre
            canal Twitch. Le streamer reste seul responsable de la
            modération de son chat.
          </li>

          <li>
            <strong className="text-zinc-200">
              Clause de non-affiliation :
            </strong>{" "}
            Twichify est une application indépendante. Elle n'est aucunement
            affiliée, approuvée, sponsorisée ni soutenue officiellement par{" "}
            <strong className="text-zinc-200">Spotify AB</strong> ou{" "}
            <strong className="text-zinc-200">
              Twitch Interactive, Inc.
            </strong>
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 5,
    short: "Responsabilité",
    title: "Limitation de Responsabilité et Disponibilité",
    content: (
      <p>
        Twichify est fourni « en l'état ». Bien que nous assurions une
        infrastructure stable pour vos streams, nous ne pouvons garantir une
        disponibilité ininterrompue lors des pannes de serveurs externes ou
        des modifications unilatérales apportées aux API par Twitch ou
        Spotify. L'état des services est consultable en direct sur la page{" "}
        <Link href="/status" className="text-purple-400 hover:underline">
          Statut
        </Link>
        .
      </p>
    ),
  },
  {
    id: 6,
    short: "Vos droits",
    title: "Vos Droits, Conservation des Données et Contact",
    content: (
      <div className="space-y-4">
        <p>
          Vous conservez à tout moment la pleine maîtrise de vos données
          personnelles :
        </p>

        <ul className="space-y-2 border-l border-zinc-800 pl-4 text-zinc-400">
          <li>
            Vous pouvez révoquer l'accès de Twichify depuis la gestion des
            applications autorisées sur vos comptes Twitch et Spotify. Vous
            pouvez aussi désactiver le suivi des départs à tout moment
            (Tableau de bord → Twitch → Followers) : la liste enregistrée et
            l'historique sont alors supprimés immédiatement. Les statistiques
            de chat peuvent être mises en pause et leur historique supprimé
            depuis l'onglet Chat de la page Twitch.
          </li>

          <li>
            <strong className="text-zinc-200">Accès et portabilité :</strong>{" "}
            depuis{" "}
            <Link href="/dashboard/account" className="text-purple-400 hover:underline">
              Tableau de bord → Compte &amp; données
            </Link>
            , vous téléchargez à tout moment une copie de vos données au format
            JSON (les secrets et jetons n'en font jamais partie).
          </li>

          <li>
            <strong className="text-zinc-200">Effacement :</strong>{" "}
            depuis la même page, vous supprimez immédiatement et définitivement
            votre compte. Sont supprimés : votre compte, votre connexion Twitch
            et vos sessions, vos clés et jetons Spotify, vos réglages, vos
            statistiques d'écoute, votre suivi des départs de followers, vos statistiques de chat et vos tickets de support. Les idées publiées
            dans la boîte à idées sont conservées de façon anonymisée et vos
            votes sont retirés.
          </li>

          <li>
            <strong className="text-zinc-200">
              Rectification, limitation et opposition :
            </strong>{" "}
            vos informations de profil proviennent de votre compte Twitch ; pour
            toute autre demande, écrivez-nous à l'adresse indiquée ci-dessous.
          </li>

          <li>
            <strong className="text-zinc-200">Réclamation :</strong>{" "}
            si vous estimez que vos droits ne sont pas respectés, vous pouvez
            saisir la CNIL (cnil.fr).
          </li>
        </ul>

        <p className="text-xs leading-relaxed text-zinc-400">
          <strong className="text-zinc-200">Hébergement des données :</strong>{" "}
          votre base de données est hébergée chez MongoDB Atlas (MongoDB, Inc.), sur un cluster situé dans l'Union
          européenne (région AWS Paris, eu-west-3). Vos données ne sont pas transférées hors de l'UE à ce titre.
          Le site lui-même est hébergé chez Vercel Inc. — voir nos{" "}
          <Link href="/mentions-legales" className="text-purple-400 hover:underline">
            mentions légales
          </Link>
          .
        </p>

        <p className="text-xs leading-relaxed text-zinc-400">
          <strong className="text-zinc-200">Cookies :</strong>{" "}
          Twichify n'utilise aucun cookie de mesure d'audience, publicitaire ou de suivi. Le seul cookie déposé
          est le cookie de session, strictement nécessaire à votre connexion, sans consentement requis au titre
          de la réglementation sur les cookies.
        </p>

        <p className="text-xs leading-relaxed text-zinc-400">
          <strong className="text-zinc-200">Durée de conservation :</strong>{" "}
          vos données sont conservées tant que votre compte existe, puis
          supprimées immédiatement lors de la suppression de celui-ci. Les
          éventuelles sauvegardes techniques de la base de données sont
          écrasées à leur rotation. Aucun message du chat Twitch n'est
          conservé.
        </p>

        <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-950/40 to-zinc-900/80 p-5 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="inline-flex shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 p-2.5 text-purple-400">
              <Mail size={20} aria-hidden="true" />
            </div>

            <div className="space-y-1 text-xs">
              <h3 className="text-sm font-bold text-white">
                Une question ou une demande d'assistance ?
              </h3>

              <p className="leading-relaxed text-zinc-400">
                Contactez notre support par e-mail à{" "}
                <a
                  href="mailto:contact.twichify@gmail.com"
                  className="font-medium text-purple-400 hover:underline"
                >
                  contact.twichify@gmail.com
                </a>{" "}
                ou ouvrez directement un ticket depuis votre tableau de bord.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 7,
    short: "Modifications",
    title: "Modification des Conditions",
    content: (
      <p>
        Nous nous réservons le droit d'adapter les présentes conditions pour
        refléter les évolutions légales et techniques. Toute modification
        sera répercutée sur la date de révision en haut de page. Si une
        évolution nécessite de nouvelles permissions Twitch, elles vous sont
        demandées explicitement lors de votre prochaine connexion.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#030305] font-sans text-zinc-300 selection:bg-purple-500/30 selection:text-purple-200">
      <style>{`
        html { scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
      `}</style>

      {/* Background Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[350px] w-[600px] -translate-x-1/2 rounded-full bg-purple-600/10 blur-[130px]"
      />

      <SiteHeader />

      <div className="relative mx-auto max-w-6xl space-y-12 px-4 py-16 sm:px-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-zinc-900/60 px-4 py-2 text-xs font-medium text-zinc-400 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-white/10 hover:bg-zinc-800/60 hover:text-white"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Retour à l'accueil
          </Link>
        </div>

        <header className="space-y-4 border-b border-white/5 pb-10">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-purple-700/5 text-purple-400 shadow-xl shadow-purple-950/20">
              <ShieldCheck size={30} aria-hidden="true" />
            </div>

            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Conditions Générales & Confidentialité
              </h1>

              <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-400">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                <span>Dernière mise à jour : {LAST_UPDATED}</span>
              </div>
            </div>
          </div>

          <p className="max-w-2xl pt-2 text-sm leading-relaxed text-zinc-400">
            Transparence totale sur le traitement de vos données, la sécurité
            de vos clés API et les conditions d'utilisation de nos widgets
            (Spotify & Chat Twitch) pour vos streams.
          </p>
        </header>

        {/* Points clés */}
        <section aria-label="Points clés de confidentialité" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FEATURES.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={index}
                className="group rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-md transition-all duration-300 hover:border-purple-500/30 hover:bg-zinc-900/70"
              >
                <div className="mb-3 inline-flex items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 p-2.5 text-purple-400 transition-transform duration-300 group-hover:scale-105">
                  <Icon size={20} aria-hidden="true" />
                </div>

                <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                  {item.title}
                </h2>

                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  {item.description}
                </p>
              </div>
            );
          })}
        </section>

        {/* Exercer ses droits */}
        <section
          aria-label="Exercer vos droits"
          className="flex flex-col gap-5 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-950/40 to-zinc-900/60 p-6 shadow-lg sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-white">Exercez vos droits en un clic</h2>
            <p className="max-w-xl text-xs leading-relaxed text-zinc-400">
              Téléchargez une copie de vos données ou supprimez définitivement
              votre compte, directement depuis votre tableau de bord.
            </p>
          </div>

          <Link
            href="/dashboard/account"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-purple-600/25 transition-all hover:bg-purple-500"
          >
            Gérer mes données
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </section>

        <div className="grid gap-10 lg:grid-cols-[210px_minmax(0,1fr)]">
          {/* Sommaire */}
          <aside>
            <nav aria-label="Sommaire" className="lg:sticky lg:top-24">
              <p className="mb-3 hidden text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500 lg:block">
                Sommaire
              </p>
              <ol className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
                {SECTIONS.map((sec) => (
                  <li key={sec.id} className="shrink-0">
                    <a
                      href={`#section-${sec.id}`}
                      className="flex items-center gap-2.5 whitespace-nowrap rounded-full border border-white/5 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-purple-500/30 hover:text-white lg:rounded-lg lg:border-transparent lg:bg-transparent lg:px-2 lg:hover:bg-white/5"
                    >
                      <span className="font-mono text-[10px] text-purple-400">{sec.id}</span>
                      {sec.short}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          {/* Sections */}
          <article className="space-y-8 text-sm leading-relaxed text-zinc-300">
            {SECTIONS.map((sec) => (
              <section
                key={sec.id}
                id={`section-${sec.id}`}
                aria-labelledby={`section-title-${sec.id}`}
                className="scroll-mt-24 space-y-3 rounded-2xl border border-white/5 bg-zinc-900/20 p-6 backdrop-blur-xs transition-colors hover:border-white/10"
              >
                <div className="flex items-center gap-3 text-base font-bold text-white">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-purple-500/20 bg-purple-500/10 font-mono text-xs text-purple-400">
                    {sec.id}
                  </span>

                  <h2 id={`section-title-${sec.id}`}>{sec.title}</h2>
                </div>

                <div className="text-zinc-400 sm:pl-10">{sec.content}</div>
              </section>
            ))}
          </article>
        </div>

        <footer className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-zinc-400 sm:flex-row">
          <p>© 2026 Twichify. Tous droits réservés.</p>

          <p className="text-[11px] text-zinc-400">
            Non affilié à Spotify AB ni Twitch Interactive, Inc.
          </p>

          <div className="flex items-center gap-4">
            <Link
              href="/mentions-legales"
              className="font-medium text-zinc-400 transition-colors hover:text-purple-400"
            >
              Mentions légales
            </Link>
            <Link
              href="/dashboard"
              className="font-medium text-zinc-400 transition-colors hover:text-purple-400"
            >
              Retourner au tableau de bord
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
