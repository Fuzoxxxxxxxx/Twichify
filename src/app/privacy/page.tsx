import Link from "next/link";
import PublicShell from "@/components/site/PublicShell";
import PageIntro from "@/components/site/PageIntro";
import LegalToc, { type TocGroup } from "@/components/site/LegalToc";
import { TERMS_REVISED_LABEL, TERMS_CHANGES } from "@/lib/terms";
import type { Metadata } from "next";
import { ArrowRight, Lock, Database, UserCheck, EyeOff, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Confidentialité & CGU | Twichify",
  description:
    "Conditions générales d'utilisation et politique de confidentialité de Twichify : ce que fait le service, données collectées, durées de conservation, prestataires et exercice de vos droits.",
};

// Date de la dernière révision matérielle : source unique dans lib/terms.ts (elle déclenche aussi la
// nouvelle demande d'acceptation). À changer uniquement quand le contenu de cette page change sur le fond.
const LAST_UPDATED = TERMS_REVISED_LABEL;

// Dernière clarification de forme (structure, reformulations) : elle ne redemande pas l'acceptation.
const LAST_CLARIFIED = "8 novembre 2026";

const FEATURES = [
  {
    icon: Lock,
    title: "Sécurité et chiffrement",
    description:
      "Connexion par OAuth 2.0. Vos clés et jetons Spotify sont chiffrés (AES-256-GCM) dans la base de données.",
  },
  {
    icon: Database,
    title: "Données minimales",
    description:
      "Seul ce qui sert vos widgets et vos statistiques est traité. Les données Twitch sont lues en direct, en lecture seule.",
  },
  {
    icon: EyeOff,
    title: "Jamais revendues",
    description:
      "Vos données ne sont ni vendues, ni louées, ni cédées. Aucun cookie publicitaire ni de suivi d'audience.",
  },
  {
    icon: UserCheck,
    title: "Vous gardez la main",
    description:
      "Exportez vos données et supprimez votre compte en quelques clics depuis votre tableau de bord.",
  },
] as const;

// ───────────────────────── Tableau des données ─────────────────────────
// `optional` : fonction facultative, à votre initiative. `notStored` : la donnée n'est pas enregistrée sur nos serveurs.
type DataRow = {
  data: string;
  detail: string;
  purpose: string;
  retention: string;
  optional?: boolean;
  notStored?: boolean;
};

const DATA_GROUPS: { label: string; rows: DataRow[] }[] = [
  {
    label: "Votre compte",
    rows: [
      {
        data: "Profil Twitch",
        detail: "Nom d'utilisateur, adresse e-mail et image de profil",
        purpose: "Authentification OAuth et affichage dans le tableau de bord",
        retention: "Jusqu'à la suppression du compte",
      },
      {
        data: "Jeton de connexion Twitch",
        detail:
          "Jeton d'accès et de rafraîchissement, avec des permissions en lecture seule sur votre chaîne (followers, modérateurs, VIPs, éditeurs, abonnés, bits, spectateurs connectés au chat)",
        purpose: "Connexion à votre compte et affichage de vos statistiques Twitch ; révoqué lors de sa suppression",
        retention: "Jusqu'à la suppression du compte",
      },
      {
        data: "Clés et jeton Spotify",
        detail: "Client ID, Client Secret et refresh token, chiffrés (AES-256-GCM)",
        purpose: "Lire le morceau en cours de lecture pour votre widget musique",
        retention: "Jusqu'à la suppression du compte",
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
    ],
  },
  {
    label: "Vos widgets",
    rows: [
      {
        data: "Réglages des widgets",
        detail: "Couleurs, opacité, typographies, filtres du chat (dont votre liste de bots masqués), disposition, textes de votre bandeau d'informations (avec les logos personnalisés que vous y ajoutez)",
        purpose: "Générer vos overlays selon vos préférences",
        retention: "Jusqu'à la suppression du compte",
      },
      {
        data: "Statistiques d'écoute",
        detail: "Durée cumulée, nombre de morceaux, dernier morceau (titre, artiste, pochette)",
        purpose: "Totaux de la page Statistiques ; calculés quand un morceau est détecté en lecture",
        retention: "Jusqu'à réinitialisation ou suppression du compte",
      },
      {
        data: "Historique d'écoute détaillé",
        detail: "Chaque écoute détectée : titre, artiste, pochette, date et durée écoutée",
        purpose: "Page Statistiques (classements, activité, historique des morceaux) ; enregistré quand un morceau est détecté en lecture",
        retention:
          "180 jours après chaque écoute, puis supprimée automatiquement ; supprimable avant avec le bouton Réinitialiser (Compte & données) ou avec le compte",
      },
      {
        data: "Flux du chat Twitch",
        detail: "Messages, pseudos et émoticônes reçus via IRC/WebSockets",
        purpose: "Affichage visuel en temps réel de vos overlays",
        retention: "Non conservés sur nos serveurs",
        notStored: true,
      },
    ],
  },
  {
    label: "Statistiques de votre chaîne Twitch",
    rows: [
      {
        data: "Statistiques de chaîne Twitch",
        detail:
          "Followers, abonnés, modérateurs, éditeurs, VIPs, top bits, diffusions et clips de votre chaîne, avec les pseudos et avatars publics Twitch des personnes concernées",
        purpose: "Page Dashboard → Twitch ; lues en direct sur Twitch, en lecture seule",
        retention:
          "Non enregistrées en base de données (simple cache en mémoire : quelques secondes, quelques heures pour les avatars)",
        notStored: true,
      },
      {
        data: "Spectateurs connectés au chat (à la demande)",
        detail:
          "Pseudos publics Twitch des spectateurs connectés au chat de votre chaîne, lus quand vous cliquez sur « Détecter » dans le réglage Masquer Bots du widget chat",
        purpose:
          "Repérer les bots de votre chat pour les masquer ; seuls les pseudos de bots que vous ajoutez à vos réglages sont enregistrés",
        retention:
          "Liste lue en direct et non enregistrée (cache en mémoire de quelques secondes) ; les pseudos de bots ajoutés sont conservés jusqu'à la suppression du compte",
        optional: true,
        notStored: true,
      },
      {
        data: "Suivi des départs",
        detail:
          "Identifiants Twitch des followers de votre chaîne (aucun pseudo, nom ni date ; 5 000 au maximum) et 200 derniers départs détectés (identifiant et date de détection ; le dernier pseudo connu n'est gardé que pour un compte supprimé ou banni)",
        purpose: "Indiquer qui a quitté votre chaîne, en comparant les analyses entre elles ; uniquement si vous activez le suivi",
        retention: "Tant que le suivi est actif ; supprimée à sa désactivation ou à la suppression du compte",
        optional: true,
      },
      {
        data: "Statistiques de chat",
        detail:
          "Compteurs par session (messages par minute, messages par spectateur, emotes et commandes les plus utilisées) et pseudos publics Twitch des chatteurs les plus actifs. Le texte des messages n'est jamais envoyé ni enregistré.",
        purpose: "Page Dashboard → Twitch → Chat ; uniquement si vous les activez",
        retention:
          "90 jours après la dernière activité de la session, ou jusqu'à la suppression de l'historique ou du compte",
        optional: true,
      },
    ],
  },
  {
    label: "Support et communauté",
    rows: [
      {
        data: "Support et boîte à idées",
        detail:
          "Tickets et messages (avec d'éventuelles notes internes de l'équipe), idées publiées, commentaires sur les idées, votes",
        purpose: "Assistance et retours de la communauté",
        retention:
          "Tickets (et notes internes) supprimés avec le compte ; idées et commentaires conservés de façon anonymisée",
      },
    ],
  },
  {
    label: "Fonctionnement du service",
    rows: [
      {
        data: "Supervision du service",
        detail:
          "Résultats des vérifications de disponibilité (Spotify, Twitch, base de données, services d'emotes), compteurs agrégés d'appels réussis ou échoués des widgets, messages d'incident publiés par l'équipe",
        purpose: "Page Statut et information en cas de panne ; aucune donnée personnelle ni identifiant d'utilisateur",
        retention:
          "Résultats détaillés 3 heures, compteurs horaires 48 heures, agrégats journaliers 95 jours ; messages d'incident conservés",
      },
    ],
  },
];

// ───────────────────────── Petits composants ─────────────────────────
function Badge({ tone, children }: { tone: "purple" | "green"; children: React.ReactNode }) {
  const styles =
    tone === "purple"
      ? "border-purple-500/30 bg-purple-500/10 text-purple-200"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  return <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles}`}>{children}</span>;
}

function DataCard({ row }: { row: DataRow }) {
  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 print:break-inside-avoid">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h5 className="text-base font-semibold text-white">{row.data}</h5>
        {(row.optional || row.notStored) && (
          <div className="flex flex-wrap gap-1.5">
            {row.optional && <Badge tone="purple">Facultatif</Badge>}
            {row.notStored && <Badge tone="green">Non enregistré</Badge>}
          </div>
        )}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{row.detail}</p>
      <dl className="mt-4 grid gap-4 border-t border-white/10 pt-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-zinc-400">Pourquoi</dt>
          <dd className="mt-1 leading-relaxed text-zinc-300">{row.purpose}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-zinc-400">Combien de temps</dt>
          <dd className="mt-1 leading-relaxed text-zinc-300">{row.retention}</dd>
        </div>
      </dl>
    </li>
  );
}

function Bullets({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-2 border-l border-white/10 pl-4 text-zinc-400">{children}</ul>;
}

const LINK = "text-purple-300 hover:underline";

// ───────────────────────── Contenu : deux parties ─────────────────────────
const PARTS = [
  {
    id: "conditions",
    label: "Partie A",
    title: "Conditions d'utilisation",
    summary: "Ce que fait Twichify, les règles du jeu et les limites du service.",
    sections: [
      {
        id: "objet",
        short: "Objet",
        title: "Objet et acceptation",
        content: (
          <div className="space-y-3">
            <p>
              Ces conditions encadrent l'utilisation de <strong className="font-medium text-white">Twichify</strong> : le
              site, le tableau de bord et les widgets que vous ajoutez dans votre logiciel de diffusion (OBS Studio,
              Streamlabs, Twitch Studio).
            </p>
            <p>
              En vous connectant avec votre compte Twitch, en reliant votre compte Spotify ou en utilisant un lien de
              widget, vous acceptez ces conditions. Si vous n'êtes pas d'accord, n'utilisez pas le service ; vous
              pouvez à tout moment supprimer votre compte (voir <a href="#droits" className={LINK}>Vos droits</a>).
            </p>
          </div>
        ),
      },
      {
        id: "service",
        short: "Le service",
        title: "Ce que fait Twichify",
        content: (
          <div className="space-y-3">
            <Bullets>
              <li>
                <strong className="text-zinc-200">Widget musique :</strong> affiche le morceau en cours de lecture sur
                Spotify (titre, artiste, pochette) dans votre diffusion, via l'API officielle de Spotify.
              </li>
              <li>
                <strong className="text-zinc-200">Widget chat :</strong> affiche le chat de votre chaîne Twitch
                (messages, émoticônes, pseudos des spectateurs) dans votre diffusion.
              </li>
              <li>
                <strong className="text-zinc-200">Bandeau d'informations :</strong> affiche dans votre diffusion les
                messages que vous saisissez (vos réseaux, vos commandes, vos partenaires), avec leurs logos et leurs
                couleurs.
              </li>
              <li>
                <strong className="text-zinc-200">Tableau de bord :</strong> réglages des widgets, statistiques
                d'écoute et statistiques de votre chaîne Twitch (followers, abonnés, équipe, diffusions, clips), lues
                en direct avec des permissions en lecture seule.
              </li>
              <li>
                <strong className="text-zinc-200">Commandes de bot :</strong> des liens permettent à un bot de chat
                (Nightbot, StreamElements, WizeBot…) d'annoncer le morceau en cours.
              </li>
            </Bullets>
            <p>
              Twichify ne modifie rien sur votre chaîne et ne héberge ni ne diffuse aucun fichier audio ou média
              propriétaire.
            </p>
          </div>
        ),
      },
      {
        id: "services-tiers",
        short: "Services tiers",
        title: "Services tiers : Spotify et Twitch",
        content: (
          <div className="space-y-3">
            <p>L'utilisation du service suppose de respecter les règles des services tiers qu'il relie :</p>
            <Bullets>
              <li>
                Vous vous engagez à respecter le{" "}
                <a href="https://developer.spotify.com/terms" target="_blank" rel="noopener noreferrer" className={LINK}>
                  Spotify Developer Agreement
                </a>
                , les{" "}
                <a
                  href="https://legal.twitch.tv/page/developer-agreement"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LINK}
                >
                  Conditions Développeurs Twitch
                </a>{" "}
                ainsi que les Consignes de la communauté Twitch.
              </li>
              <li>
                <strong className="text-zinc-200">Règles d'accès de Spotify et de Twitch :</strong> ces services peuvent
                modifier leurs API ou leurs conditions d'accès (par exemple, Spotify peut exiger un compte Premium pour
                utiliser son API). Twichify n'a aucun contrôle sur ces règles.
              </li>
              <li>
                <strong className="text-zinc-200">Affichage du chat :</strong> Twichify agit comme un simple relais
                d'affichage et ne modère pas automatiquement le contenu venant de votre chaîne Twitch. Le streamer
                reste seul responsable de la modération de son chat.
              </li>
              <li>
                <strong className="text-zinc-200">Non-affiliation :</strong> Twichify est une application indépendante.
                Elle n'est ni affiliée, ni approuvée, ni sponsorisée, ni soutenue officiellement par{" "}
                <strong className="text-zinc-200">Spotify AB</strong> ou{" "}
                <strong className="text-zinc-200">Twitch Interactive, Inc.</strong>
              </li>
            </Bullets>
          </div>
        ),
      },
      {
        id: "responsabilite",
        short: "Responsabilité",
        title: "Disponibilité et limitation de responsabilité",
        content: (
          <div className="space-y-3">
            <p>
              Twichify est fourni « en l'état ». Nous veillons à ce que le service reste stable pour vos streams, mais
              nous ne pouvons pas garantir une disponibilité ininterrompue en cas de panne d'un service externe ou de
              modification, par Twitch ou Spotify, de leurs API. L'état des services est consultable en direct sur la
              page{" "}
              <Link href="/status" className={LINK}>
                Statut
              </Link>
              .
            </p>
            <p>
              Vos liens de widgets contiennent un jeton personnel : nous vous conseillons de ne pas les montrer à
              l'écran ni de les partager. Vous pouvez les régénérer à tout moment depuis l'accueil de votre tableau de
              bord.
            </p>
          </div>
        ),
      },
      {
        id: "modification",
        short: "Modifications",
        title: "Modification des conditions",
        content: (
          <div className="space-y-3">
            <p>
              Nous pouvons adapter ces conditions pour suivre les évolutions légales et techniques. La date de révision
              est indiquée en haut de page.
            </p>
            <p>
              En cas de changement important (nouvelle donnée collectée, nouvelle permission, nouveau prestataire…),
              une fenêtre vous demande de relire et de confirmer à nouveau votre accord lors de votre prochaine
              connexion, avec la liste de ce qui a changé. Si une évolution nécessite de nouvelles permissions Twitch,
              elles vous sont demandées explicitement. Les simples corrections de forme ne déclenchent pas cette
              demande.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    id: "confidentialite",
    label: "Partie B",
    title: "Confidentialité et données personnelles (RGPD)",
    summary: "Quelles données sont traitées, pourquoi, pour combien de temps, et comment exercer vos droits.",
    sections: [
      {
        id: "responsable",
        short: "Responsable",
        title: "Responsable du traitement",
        content: (
          <p>
            Le responsable du traitement de vos données personnelles est l'éditeur de Twichify, une personne physique
            (voir les{" "}
            <Link href="/mentions-legales" className={LINK}>
              mentions légales
            </Link>
            ). Pour toute question ou demande relative à vos données, écrivez à{" "}
            <a href="mailto:contact.twichify@gmail.com" className={LINK}>
              contact.twichify@gmail.com
            </a>
            .
          </p>
        ),
      },
      {
        id: "donnees",
        short: "Données",
        title: "Données traitées, finalités et durées",
        content: (
          <div className="space-y-6">
            <p>
              Twichify applique le principe de minimisation : seules les données nécessaires au service sont traitées.
              Voici, pour chacune, pourquoi elle l'est et combien de temps elle est conservée.
            </p>

            <div className="space-y-8">
              {DATA_GROUPS.map((group) => (
                <div key={group.label} className="space-y-3">
                  <h4 className="text-sm font-semibold text-zinc-200">{group.label}</h4>
                  <ul className="space-y-3">
                    {group.rows.map((row) => (
                      <DataCard key={row.data} row={row} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-zinc-200">Permissions Twitch demandées (lecture seule)</h4>
              <Bullets>
                <li>
                  <code className="text-zinc-200">openid</code> et <code className="text-zinc-200">user:read:email</code> :
                  vous identifier et afficher votre profil.
                </li>
                <li>
                  <code className="text-zinc-200">moderator:read:followers</code> : nombre et liste de vos followers.
                </li>
                <li>
                  <code className="text-zinc-200">moderation:read</code> et{" "}
                  <code className="text-zinc-200">channel:read:editors</code> : liste de vos modérateurs et de vos
                  éditeurs.
                </li>
                <li>
                  <code className="text-zinc-200">channel:read:vips</code> : liste de vos VIPs.
                </li>
                <li>
                  <code className="text-zinc-200">channel:read:subscriptions</code> : nombre et liste de vos abonnés
                  (chaînes affiliées ou partenaires).
                </li>
                <li>
                  <code className="text-zinc-200">bits:read</code> : classement des bits de votre chaîne.
                </li>
                <li>
                  <code className="text-zinc-200">moderator:read:chatters</code> : liste des spectateurs connectés à
                  votre chat, lue à la demande pour détecter vos bots.
                </li>
              </Bullets>
              <p className="text-sm leading-relaxed text-zinc-400">
                Ces permissions ne permettent aucune action sur votre chaîne (ni écriture, ni modération, ni envoi de
                message). Vous pouvez les retirer à tout moment depuis les connexions de votre compte Twitch.
              </p>
            </div>

            <div className="space-y-3 text-sm leading-relaxed text-zinc-400">
              <p>
                <strong className="text-zinc-200">Suivi des départs :</strong> fonction facultative, désactivée par
                défaut. Elle traite des données de tiers (les identifiants Twitch de vos followers) uniquement pour vous
                présenter les départs dans votre tableau de bord : seuls les identifiants sont enregistrés, les pseudos
                et avatars sont relus sur Twitch au moment de l'affichage. Ces données ne sont ni partagées, ni utilisées
                à d'autres fins, ni conservées après la désactivation du suivi. Twitch ne fournissant aucun historique de
                désabonnements, Twichify compare des instantanés de votre liste : un départ n'est donc détecté qu'à
                l'analyse suivante, et il n'est pas possible de savoir pourquoi la personne est partie (hors compte
                supprimé ou banni).
              </p>
              <p>
                <strong className="text-zinc-200">Statistiques de chat :</strong> fonction facultative, désactivée par
                défaut. Lorsqu'elle est activée, votre widget chat compte les messages du chat de votre chaîne et
                n'envoie à Twichify que des compteurs agrégés : le contenu des messages n'est jamais transmis ni
                conservé. Les pseudos publics des chatteurs les plus actifs y figurent pour établir les classements.
                Vous pouvez la mettre en pause et supprimer l'historique à tout moment.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "bases-legales",
        short: "Bases légales",
        title: "Pourquoi nous avons le droit de traiter ces données",
        content: (
          <div className="space-y-3">
            <p>Chaque traitement repose sur l'une des bases légales prévues par le RGPD :</p>
            <Bullets>
              <li>
                <strong className="text-zinc-200">Fournir le service que vous demandez (exécution du contrat) :</strong>{" "}
                compte, connexion Twitch et Spotify, réglages, widgets, statistiques d'écoute, support.
              </li>
              <li>
                <strong className="text-zinc-200">Votre choix (consentement) :</strong> les fonctions facultatives, c'est-à-dire
                le suivi des départs, les statistiques de chat et la détection des bots. Elles sont désactivées par défaut
                ou lancées à votre demande, et vous pouvez les arrêter à tout moment.
              </li>
              <li>
                <strong className="text-zinc-200">Fonctionnement et sécurité du service (intérêt légitime) :</strong>{" "}
                supervision de la disponibilité (sans donnée personnelle), cookie de session, date d'acceptation des
                conditions conservée comme preuve.
              </li>
            </Bullets>
          </div>
        ),
      },
      {
        id: "destinataires",
        short: "Prestataires",
        title: "Qui reçoit vos données : prestataires et services tiers",
        content: (
          <div className="space-y-4">
            <p>
              Vos données ne sont <strong className="text-zinc-200">jamais vendues, louées ni cédées</strong> à des
              tiers à des fins commerciales ou publicitaires. Pour fonctionner, Twichify s'appuie sur les services
              suivants :
            </p>
            <Bullets>
              <li>
                <strong className="text-zinc-200">MongoDB Atlas (MongoDB, Inc.) :</strong> base de données, sur un
                cluster situé dans l'Union européenne (région AWS Paris, eu-west-3). Vos données ne sont pas transférées
                hors de l'UE à ce titre.
              </li>
              <li>
                <strong className="text-zinc-200">Vercel Inc. :</strong> hébergement du site et exécution du service
                (voir les{" "}
                <Link href="/mentions-legales#hebergement" className={LINK}>
                  mentions légales
                </Link>
                ).
              </li>
              <li>
                <strong className="text-zinc-200">Spotify AB et Twitch Interactive, Inc. :</strong> Spotify fournit l'état
                de lecture, Twitch la connexion, les statistiques de chaîne et le chat, via leurs API officielles.
              </li>
              <li>
                <strong className="text-zinc-200">BetterTTV, 7TV et FrankerFaceZ (emotes) :</strong> pour afficher les
                emotes de votre chaîne, nos serveurs leur envoient l'identifiant public de votre chaîne Twitch. Les images
                sont ensuite chargées depuis leurs réseaux de diffusion par le navigateur ou OBS qui affiche le widget.
              </li>
              <li>
                <strong className="text-zinc-200">Google Fonts :</strong> si vous choisissez une police Google pour un
                widget, elle est téléchargée depuis les serveurs de Google par le navigateur ou OBS qui affiche le widget
                (et par le tableau de bord pour l'aperçu). Les polices système ne contactent aucun serveur.
              </li>
            </Bullets>
            <p className="text-sm leading-relaxed text-zinc-400">
              Plusieurs de ces services sont établis hors de l'Union européenne, notamment aux États-Unis : reportez-vous
              à leurs politiques de confidentialité respectives.
            </p>
          </div>
        ),
      },
      {
        id: "securite",
        short: "Sécurité",
        title: "Sécurité de vos données",
        content: (
          <Bullets>
            <li>Vos clés et jetons Spotify sont chiffrés avec l'algorithme AES-256-GCM avant d'être enregistrés.</li>
            <li>La connexion passe par OAuth 2.0 : Twichify ne voit jamais votre mot de passe Twitch ou Spotify.</li>
            <li>Les permissions Twitch demandées sont en lecture seule et révocables à tout moment.</li>
            <li>
              Vos liens de widgets sont personnels et régénérables : régénérer un lien désactive immédiatement l'ancien.
            </li>
            <li>Les messages du chat ne sont pas conservés sur nos serveurs.</li>
          </Bullets>
        ),
      },
      {
        id: "cookies",
        short: "Cookies",
        title: "Cookies et stockage local",
        content: (
          <div className="space-y-3">
            <p>
              Twichify n'utilise aucun cookie de mesure d'audience, publicitaire ou de suivi. Le seul cookie déposé est
              le cookie de session, strictement nécessaire à votre connexion : il ne demande pas de consentement au titre
              de la réglementation sur les cookies.
            </p>
            <p>
              Votre navigateur conserve aussi quelques préférences d'affichage (par exemple le format des dates des
              statistiques) dans son stockage local. Elles restent sur votre appareil et ne servent à aucun suivi.
            </p>
          </div>
        ),
      },
      {
        id: "droits",
        short: "Vos droits",
        title: "Vos droits",
        content: (
          <div className="space-y-4">
            <p>Vous gardez à tout moment la maîtrise de vos données :</p>
            <Bullets>
              <li>
                <strong className="text-zinc-200">Accès et portabilité :</strong> depuis{" "}
                <Link href="/dashboard/account" className={LINK}>
                  Tableau de bord → Compte &amp; données
                </Link>
                , vous téléchargez à tout moment une copie de vos données au format JSON (les secrets et jetons n'en font
                jamais partie).
              </li>
              <li>
                <strong className="text-zinc-200">Effacement :</strong> depuis la même page, vous supprimez immédiatement
                et définitivement votre compte. Sont supprimés : votre compte, votre connexion Twitch et vos sessions,
                vos clés et jetons Spotify, vos réglages, vos statistiques et votre historique d'écoute, votre suivi des départs de
                followers, vos statistiques de chat et vos tickets de support. Les idées publiées dans la boîte à idées
                sont conservées de façon anonymisée et vos votes sont retirés.
              </li>
              <li>
                <strong className="text-zinc-200">Retrait de votre accord et révocation :</strong> vous pouvez révoquer
                l'accès de Twichify depuis la gestion des applications autorisées de vos comptes Twitch et Spotify,
                désactiver le suivi des départs (Tableau de bord → Twitch → Followers : la liste enregistrée et
                l'historique sont alors supprimés immédiatement), et mettre en pause les statistiques de chat ou en
                supprimer l'historique (onglet Chat de la page Twitch).
              </li>
              <li>
                <strong className="text-zinc-200">Rectification, limitation et opposition :</strong> vos informations de
                profil proviennent de votre compte Twitch ; pour toute autre demande, écrivez-nous à l'adresse
                ci-dessous.
              </li>
              <li>
                <strong className="text-zinc-200">Réclamation :</strong> si vous estimez que vos droits ne sont pas
                respectés, vous pouvez saisir la CNIL (
                <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className={LINK}>
                  cnil.fr
                </a>
                ).
              </li>
            </Bullets>
            <p className="text-sm leading-relaxed text-zinc-400">
              <strong className="text-zinc-200">Durée de conservation :</strong> vos données sont conservées tant que
              votre compte existe, puis supprimées lors de sa suppression. Les éventuelles sauvegardes techniques de la
              base de données sont écrasées à leur rotation. Aucun message du chat Twitch n'est conservé.
            </p>
          </div>
        ),
      },
      {
        id: "contact",
        short: "Contact",
        title: "Nous contacter",
        content: (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-start gap-4">
              <div className="inline-flex shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 p-2.5 text-purple-300">
                <Mail size={20} aria-hidden="true" />
              </div>
              <div className="space-y-1.5 text-sm">
                <h4 className="text-base font-semibold text-white">Une question ou une demande ?</h4>
                <p className="leading-relaxed text-zinc-400">
                  Écrivez-nous à{" "}
                  <a href="mailto:contact.twichify@gmail.com" className="font-medium text-purple-300 hover:underline">
                    contact.twichify@gmail.com
                  </a>{" "}
                  ou ouvrez un ticket depuis votre tableau de bord. Nous répondons aux demandes relatives à vos données
                  dans le délai légal d'un mois.
                </p>
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
];

// Numérotation continue des sections à travers les deux parties.
let counter = 0;
const NUMBERED_PARTS = PARTS.map((part) => ({
  ...part,
  sections: part.sections.map((section) => ({ ...section, num: ++counter })),
}));

const TOC_GROUPS: TocGroup[] = NUMBERED_PARTS.map((part) => ({
  label: `${part.label} : ${part.title}`,
  items: part.sections.map((s) => ({ id: s.id, num: s.num, short: s.short })),
}));

export default function PrivacyPage() {
  return (
    <PublicShell width="max-w-6xl">
      <style>{`
        html { scroll-behavior: smooth; }
        @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
      `}</style>

      <div className="space-y-12">
        <PageIntro
          title="Conditions générales et confidentialité"
          meta={`Version du ${LAST_UPDATED}, texte clarifié le ${LAST_CLARIFIED}`}
        >
          Ce document réunit nos conditions d'utilisation (partie A) et notre politique de confidentialité (partie B). Il
          explique ce que fait Twichify, quelles données sont traitées, combien de temps elles sont conservées et comment
          exercer vos droits.
        </PageIntro>

        {/* L'essentiel */}
        <section aria-label="L'essentiel" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="mb-3 inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] p-2.5 text-purple-300">
                  <Icon size={20} aria-hidden="true" />
                </div>
                <h2 className="text-base font-semibold text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.description}</p>
              </div>
            );
          })}
        </section>

        {/* Dernière révision : source unique dans lib/terms.ts */}
        {TERMS_CHANGES.length > 0 && (
          <section
            aria-labelledby="changes-title"
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6"
          >
            <h2 id="changes-title" className="text-base font-semibold text-white">
              Ce qui a changé le {LAST_UPDATED}
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-300">
              {TERMS_CHANGES.map((change) => (
                <li key={change} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-purple-300" />
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Exercer ses droits */}
        <section
          aria-label="Exercer vos droits"
          className="flex flex-col gap-5 rounded-2xl border border-purple-500/30 bg-purple-500/[0.06] p-6 sm:flex-row sm:items-center sm:justify-between print:hidden"
        >
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white">Exercez vos droits en un clic</h2>
            <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
              Téléchargez une copie de vos données ou supprimez définitivement votre compte, directement depuis votre
              tableau de bord.
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

        <div className="grid gap-10 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside>
            <LegalToc groups={TOC_GROUPS} />
          </aside>

          <article className="space-y-16 text-base leading-relaxed text-zinc-300">
            {NUMBERED_PARTS.map((part) => (
              <div key={part.id} id={part.id} className="scroll-mt-24 space-y-10">
                <header className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.05] px-6 py-5">
                  <p className="text-sm font-medium text-purple-300">{part.label}</p>
                  <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white">{part.title}</h2>
                  <p className="mt-1.5 text-sm text-zinc-400">{part.summary}</p>
                </header>

                {part.sections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    aria-labelledby={`${section.id}-title`}
                    className="scroll-mt-24 space-y-4 border-t border-white/10 pt-8 first-of-type:border-t-0 first-of-type:pt-0"
                  >
                    <h3 id={`${section.id}-title`} className="flex items-baseline gap-3 font-display text-xl font-bold text-white">
                      <span className="text-base tabular-nums text-purple-300">{section.num}</span>
                      {section.title}
                    </h3>
                    <div className="text-zinc-400">{section.content}</div>
                  </section>
                ))}
              </div>
            ))}
          </article>
        </div>
      </div>
    </PublicShell>
  );
}
