import Link from "next/link";
import PublicShell from "@/components/site/PublicShell";
import PageIntro from "@/components/site/PageIntro";
import { TERMS_REVISED_LABEL } from "@/lib/terms";
import type { Metadata } from "next";
import { ArrowRight, Lock, Database, UserCheck, Mail } from "lucide-react";

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
    detail: "Tickets et messages (avec d'éventuelles notes internes de l'équipe), idées publiées, commentaires sur les idées, votes",
    purpose: "Assistance et retours de la communauté",
    retention: "Tickets (et notes internes) supprimés avec le compte ; idées et commentaires conservés de façon anonymisée",
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
      "Résultats des vérifications de disponibilité (Spotify, Twitch, base de données, services d'emotes), compteurs agrégés d'appels réussis ou échoués des widgets, messages d'incident publiés par l'équipe",
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

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
          <table className="w-full min-w-[640px] text-left text-xs">
            <caption className="sr-only">
              Données traitées par Twichify, finalité et durée de conservation
            </caption>
            <thead>
              <tr className="border-b border-white/10 text-sm font-semibold text-zinc-300">
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

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
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
    <PublicShell width="max-w-6xl">
      <style>{`
        html { scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
      `}</style>

      <div className="space-y-12">
        <PageIntro title="Conditions générales et confidentialité" meta={`Dernière mise à jour : ${LAST_UPDATED}`}>
          Transparence totale sur le traitement de vos données, la sécurité de vos clés API et les conditions
          d'utilisation de nos widgets (Spotify &amp; Chat Twitch) pour vos streams.
        </PageIntro>

        {/* Points clés */}
        <section aria-label="Points clés de confidentialité" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FEATURES.map((item, index) => {
            const Icon = item.icon;

            return (
              <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="mb-3 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] p-2.5 text-purple-300">
                  <Icon size={20} aria-hidden="true" />
                </div>

                <h2 className="text-base font-semibold text-white">{item.title}</h2>

                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.description}</p>
              </div>
            );
          })}
        </section>

        {/* Exercer ses droits */}
        <section
          aria-label="Exercer vos droits"
          className="flex flex-col gap-5 rounded-2xl border border-purple-500/30 bg-purple-500/[0.06] p-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white">Exercez vos droits en un clic</h2>
            <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
              Téléchargez une copie de vos données ou supprimez définitivement
              votre compte, directement depuis votre tableau de bord.
            </p>
          </div>

          <Link
            href="/dashboard/account"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
          >
            Gérer mes données
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </section>

        <div className="grid gap-10 lg:grid-cols-[210px_minmax(0,1fr)]">
          {/* Sommaire */}
          <aside>
            <nav aria-label="Sommaire" className="lg:sticky lg:top-24">
              <p className="mb-3 hidden text-sm font-semibold text-zinc-200 lg:block">
                Sommaire
              </p>
              <ol className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
                {SECTIONS.map((sec) => (
                  <li key={sec.id} className="shrink-0">
                    <a
                      href={`#section-${sec.id}`}
                      className="flex items-center gap-2.5 whitespace-nowrap rounded-full border border-white/10 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-purple-500/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 lg:rounded-lg lg:border-transparent lg:px-2 lg:hover:bg-white/5"
                    >
                      <span className="text-xs tabular-nums text-purple-300">{sec.id}</span>
                      {sec.short}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          {/* Sections */}
          {/* Les petits textes (text-xs, gris moyen) des sections sont remontés d'un cran : c'est un texte juridique, il doit être lu. */}
          <article className="space-y-10 text-base leading-relaxed text-zinc-300 [&_.text-xs]:text-sm [&_.text-xs]:leading-relaxed [&_.text-zinc-500]:text-zinc-400">
            {SECTIONS.map((sec) => (
              <section
                key={sec.id}
                id={`section-${sec.id}`}
                aria-labelledby={`section-title-${sec.id}`}
                className="scroll-mt-24 space-y-4 border-t border-white/10 pt-8 first:border-t-0 first:pt-0"
              >
                <h2 id={`section-title-${sec.id}`} className="flex items-baseline gap-3 font-display text-xl font-bold text-white">
                  <span className="text-base tabular-nums text-purple-300">{sec.id}</span>
                  {sec.title}
                </h2>

                <div className="text-zinc-400">{sec.content}</div>
              </section>
            ))}
          </article>
        </div>
      </div>
    </PublicShell>
  );
}
