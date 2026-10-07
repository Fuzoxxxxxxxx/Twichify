// Historique des mises à jour de Twichify — source unique utilisée à la fois
// par la page /changelog et par la pop-up "nouveautés" sur l'accueil.

export type ChangeType = "new" | "improved" | "fixed";

export interface ChangelogEntry {
  version: string;
  date: string; // JJ/MM/AAAA
  title: string;
  changes: { type: ChangeType; text: string }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "3.12.0",
    date: "07/10/2026",
    title: "Statistiques musicales repensées",
    changes: [
      { type: "new", text: "La page Statistiques est organisée en onglets (Vue d'ensemble, Classements, Habitudes, Historique) avec un sélecteur de période (7, 30, 90 jours ou tout) qui s'applique à toute la page." },
      { type: "new", text: "Comparaison avec la période précédente, courbe d'écoute par jour, moyenne par jour, série de jours consécutifs, sessions d'écoute, taux de morceaux ignorés et nouveaux artistes découverts." },
      { type: "new", text: "Onglet Habitudes : carte de chaleur jour × heure, moments de la journée, heure de pointe et jour favori, dans le fuseau horaire de ton navigateur." },
      { type: "improved", text: "Classements avec pochettes et minutes écoutées, dernier morceau avec sa pochette en arrière-plan, historique avec option pour masquer les morceaux ignorés." },
    ],
  },
  {
    version: "3.11.0",
    date: "05/10/2026",
    title: "Conditions d'utilisation versionnées",
    changes: [
      { type: "new", text: "Quand nos conditions ou notre politique de confidentialité changent sur le fond (nouvelle donnée, nouvelle permission, nouveau traitement), une fenêtre te demande de les relire et de les accepter à nouveau, avec la liste de ce qui a changé." },
      { type: "improved", text: "Première application : les permissions Twitch en lecture seule, le suivi des départs de followers et les statistiques de chat ajoutés récemment sont présentés à tous les comptes déjà inscrits." },
    ],
  },
  {
    version: "3.10.0",
    date: "04/10/2026",
    title: "Statistiques de chat",
    changes: [
      { type: "new", text: "Nouvel onglet Chat sur la page Twitch : messages, chatteurs uniques, messages par minute, pic d'activité et courbe d'activité minute par minute pour chaque session de stream, comparés à ta moyenne." },
      { type: "new", text: "Classements des chatteurs les plus actifs (avec avatars), des emotes (Twitch, BTTV, 7TV, FFZ) et des commandes les plus utilisées, plus les plus actifs sur tes 20 derniers streams et l'historique des sessions." },
      { type: "improved", text: "Fonction optionnelle, désactivée par défaut : ton widget chat compte les messages et n'envoie que des compteurs, jamais le texte. Historique conservé 90 jours, mise en pause et suppression possibles à tout moment." },
    ],
  },
  {
    version: "3.9.2",
    date: "03/10/2026",
    title: "Confidentialité mise à jour",
    changes: [
      { type: "improved", text: "La page Confidentialité & CGU détaille désormais les permissions Twitch demandées (toutes en lecture seule), la lecture en direct de tes statistiques de chaîne et le fonctionnement du suivi des départs." },
      { type: "improved", text: "La page Compte & données précise que le suivi des départs est inclus dans l'export (décomptes uniquement) et supprimé avec le compte." },
    ],
  },
  {
    version: "3.9.1",
    date: "03/10/2026",
    title: "Page Twitch : nouveau look",
    changes: [
      { type: "improved", text: "Graphique des followers plus lisible : grille, moyenne par jour et info-bulle au survol de chaque barre. Une mini-courbe apparaît aussi sur la carte des nouveaux followers." },
      { type: "improved", text: "Cartes plus soignées (halo coloré, effet au survol, apparition douce), barre d'onglets fixée en haut pendant le défilement et squelette de chargement au lieu d'un simple indicateur." },
      { type: "improved", text: "Les followers de moins de 24 h sont signalés par une pastille verte, et le classement des bits met en avant le podium. Sans image hors ligne, la bannière reprend les couleurs de l'avatar." },
    ],
  },
  {
    version: "3.9.0",
    date: "03/10/2026",
    title: "Twitch : abonnés, départs et nouvelle carte de chaîne",
    changes: [
      { type: "new", text: "Les photos de profil s'affichent désormais dans toutes les listes : followers, équipe, abonnés, VIPs et classement des bits." },
      { type: "new", text: "Nouvel onglet Communauté : abonnés (total, points, répartition par tier, abonnements offerts), VIPs et top bits du mois. Les abonnés et les bits sont réservés aux chaînes affiliées ou partenaires." },
      { type: "new", text: "Suivi des départs (optionnel) dans l'onglet Followers : Twichify compare ta liste de followers d'une analyse à l'autre et indique qui est parti, avec la mention des comptes supprimés ou bannis. Tu peux le désactiver à tout moment, la liste est alors supprimée." },
      { type: "improved", text: "L'onglet Équipe ne contient plus que le vrai staff (modérateurs et éditeurs), avec leurs avatars et leur ancienneté. Les VIPs, qui ne sont pas un rôle de staff, passent dans Communauté." },
      { type: "improved", text: "Nouvelle carte de chaîne : bannière (l'image hors ligne de Twitch), grand avatar, bio, aperçu du live, boutons pour ouvrir ou copier le lien et chiffres clés." },
      { type: "improved", text: "Barres de défilement plus fines et plus discrètes sur tout le site, avec un accent violet au survol." },
      { type: "improved", text: "La connexion Twitch demande deux permissions de lecture supplémentaires (abonnés et bits). Si elles manquent, un bouton de reconnexion apparaît à l'endroit concerné." },
    ],
  },
  {
    version: "3.8.0",
    date: "02/10/2026",
    title: "Page Twitch repensée",
    changes: [
      { type: "new", text: "La page Twitch est maintenant organisée en onglets : Vue d'ensemble, Followers, Équipe et Contenu, avec un nouvel en-tête de chaîne (badge Partenaire/Affilié, ancienneté, langue, tags, aperçu du live)." },
      { type: "new", text: "Onglet Followers : liste complète et paginée (10 à 100 par page), filtre rapide, gains sur 24 h, 7 et 30 jours, et graphique des nouveaux followers par jour." },
      { type: "new", text: "Onglet Contenu : nombre de diffusions et heures de live sur 30 jours, vues et durée moyennes, meilleure diffusion, clips les plus vus, classement de ceux qui clippent le plus, et prochains streams du planning." },
    ],
  },
  {
    version: "3.7.0",
    date: "02/10/2026",
    title: "Équipe de la chaîne",
    changes: [
      { type: "new", text: "La page Dashboard → Analyse → Twitch affiche désormais l'équipe de ta chaîne : la liste de tes modérateurs, de tes VIPs et de tes éditeurs (avec la date d'ajout pour ces derniers)." },
      { type: "improved", text: "La connexion Twitch demande trois permissions de lecture seule en plus (modérateurs, VIPs, éditeurs). Si elles manquent, chaque liste affiche un bouton de reconnexion." },
    ],
  },
  {
    version: "3.6.0",
    date: "02/10/2026",
    title: "Statistiques Twitch",
    changes: [
      { type: "new", text: "Nouvelle page Dashboard → Analyse → Twitch : nombre de followers, nouveaux followers sur 24 h et 7 jours, et la liste de tes 10 derniers followers." },
      { type: "new", text: "Tu y retrouves aussi ton statut en direct (spectateurs, titre, jeu, durée du live), tes dernières diffusions et tes clips les plus vus des 30 derniers jours." },
      { type: "improved", text: "La connexion Twitch demande désormais une permission en lecture seule sur les followers de ta chaîne. Si tu t'étais connecté avant cette mise à jour, un bouton de reconnexion apparaît sur la page. Rien n'est enregistré par Twichify : les données sont lues en direct sur Twitch." },
    ],
  },
  {
    version: "3.5.0",
    date: "01/10/2026",
    title: "Une navigation commune à tout le site",
    changes: [
      { type: "new", text: "La barre de navigation de l'accueil (Changelog, Idées, Aide, connexion) est désormais présente sur toutes les pages publiques : changelog, boîte à idées, aide, support, état des services, confidentialité et mentions légales." },
      { type: "improved", text: "La barre reste visible en haut de l'écran pendant le défilement, la page en cours est mise en avant, et ton profil connecté ouvre directement le dashboard." },
    ],
  },
  {
    version: "3.4.0",
    date: "30/09/2026",
    title: "Guide de bienvenue et pagination",
    changes: [
      { type: "new", text: "Le guide de bienvenue est de nouveau accessible à tout moment depuis le Centre d'aide (bouton « Revoir le guide »)." },
      { type: "new", text: "Le changelog, la boîte à idées, la FAQ et la liste de tes tickets sont désormais paginés : fini les longues listes à faire défiler." },
      { type: "improved", text: "Un lien direct vers une version du changelog (par exemple #v3.2.1) ouvre automatiquement la bonne page." },
      { type: "improved", text: "Les libellés sont harmonisés entre le dashboard et les pages publiques (Centre d'aide, État des services, Changelog), et le guide de bienvenue décrit les nouveaux liens de widgets personnels." },
    ],
  },
  {
    version: "3.3.0",
    date: "30/09/2026",
    title: "Un dashboard mieux organisé",
    changes: [
      { type: "improved", text: "La navigation du dashboard est regroupée par catégories : Intégrations (Spotify, Bot), Widgets (Musique, Chat) et Analyse (Statistiques), avec l'Accueil en tête." },
      { type: "improved", text: "Les pages ont été renommées pour plus de cohérence : « Design » devient Widgets → Musique, et les titres des pages reprennent ceux de la navigation." },
    ],
  },
  {
    version: "3.2.1",
    date: "30/09/2026",
    title: "Widget musique plus fiable",
    changes: [
      { type: "improved", text: "Le widget musique ne disparaît plus à la moindre coupure (réseau, limite Spotify) : il garde le dernier morceau affiché quelques secondes, puis se masque si le problème dure." },
      { type: "improved", text: "Les statistiques d'écoute sont écrites en base par lots au lieu de deux écritures par seconde, ce qui allège le serveur. La barre de progression reste fluide même si une mise à jour est manquée." },
      { type: "improved", text: "L'historique d'écoute n'enregistre plus de doublons d'un même morceau." },
    ],
  },
  {
    version: "3.2.0",
    date: "30/09/2026",
    title: "Liens de widgets régénérables",
    changes: [
      { type: "new", text: "Les liens des widgets (musique et chat) et des commandes bot utilisent désormais un jeton personnel au lieu de l'identifiant du compte. Si un lien fuite, un clic sur « Régénérer les liens » (accueil du dashboard) révoque l'ancien immédiatement." },
      { type: "improved", text: "Tes anciens liens continuent de fonctionner tant que tu ne régénères pas : rien à changer dans OBS ou ton bot pour l'instant. Après une régénération, mets à jour tes sources OBS et tes commandes bot avec les nouveaux liens." },
    ],
  },
  {
    version: "3.1.3",
    date: "29/09/2026",
    title: "Accueil : appel à l'action et navigation mobile",
    changes: [
      { type: "new", text: "Un bloc d'appel à l'action clôt désormais la page d'accueil (connexion Twitch, ou accès direct au dashboard une fois connecté), et un bouton « Voir l'aperçu des widgets » dans le héros mène directement à la démo." },
      { type: "improved", text: "Le bouton « Connexion » de l'en-tête est maintenant visible sur mobile, et le défilement vers l'aperçu est animé." },
      { type: "improved", text: "Les animations d'entrée et l'effet de brillance de l'accueil sont désactivés pour les personnes qui ont réduit les animations dans leur système." },
    ],
  },
  {
    version: "3.1.2",
    date: "28/09/2026",
    title: "Précision sur les aperçus de l'accueil",
    changes: [
      { type: "improved", text: "Chaque aperçu de widget sur l'accueil précise désormais qu'il ne s'agit que d'un rendu parmi d'autres, avec un lien direct vers le dashboard pour le personnaliser." },
    ],
  },
  {
    version: "3.1.1",
    date: "28/09/2026",
    title: "Accueil : design et disposition retravaillés",
    changes: [
      { type: "improved", text: "L'en-tête reste maintenant visible en défilant (avec un fond flouté), les statistiques du héros ont chacune une icône, et les 3 étapes affichent une icône dédiée en plus du numéro." },
      { type: "improved", text: "Le rythme vertical entre les sections est uniformisé, et un séparateur discret marque la transition après l'aperçu des widgets." },
    ],
  },
  {
    version: "3.1.0",
    date: "28/09/2026",
    title: "Les aperçus de l'accueil utilisent le vrai moteur de rendu",
    changes: [
      { type: "improved", text: "L'aperçu du widget chat sur l'accueil utilise désormais le vrai moteur de rendu du widget (le vrai thème, la vraie animation, les vrais badges Twitch officiels et le découpage des emotes) au lieu d'un rendu simplifié." },
      { type: "improved", text: "Le code de rendu du widget chat (thèmes, animations, découpage des emotes) est désormais partagé entre le vrai widget, le dashboard et l'aperçu de l'accueil, pour garantir qu'ils ne divergent jamais." },
    ],
  },
  {
    version: "3.0.5",
    date: "27/09/2026",
    title: "Aperçu des widgets sur l'accueil",
    changes: [
      { type: "new", text: "La page d'accueil présente désormais un aperçu animé du widget musique et du widget chat, avec des données de démonstration, pour voir le rendu avant même de se connecter." },
      { type: "improved", text: "La roadmap de l'accueil reflète maintenant l'historique d'écoute détaillé et la modération du chat, et le badge de version en haut de page affiche toujours la dernière version publiée (il indiquait encore 2.1)." },
      { type: "fixed", text: "Le pied de page de l'accueil affichait « Confidentialité » et « CGU » comme deux liens identiques : ils sont fusionnés." },
    ],
  },
  {
    version: "3.0.4",
    date: "27/09/2026",
    title: "Correctif : le tutoriel d'accueil ne s'enregistrait jamais",
    changes: [
      { type: "fixed", text: "Une erreur JavaScript empêchait l'enregistrement du tutoriel d'accueil terminé avant même l'envoi de la requête au serveur, ce qui provoquait sa réapparition en boucle. Corrigé." },
    ],
  },
  {
    version: "3.0.3",
    date: "27/09/2026",
    title: "Correctif : la pop-up d'accueil se réaffichait sans fin",
    changes: [
      { type: "fixed", text: "L'enregistrement côté serveur de « tutoriel d'accueil terminé » pouvait échouer silencieusement, ce qui faisait réapparaitre la pop-up d'accueil à chaque nouvelle visite. Corrigé." },
    ],
  },
  {
    version: "3.0.2",
    date: "27/09/2026",
    title: "Onboarding synchronisé sur le compte",
    changes: [
      { type: "fixed", text: "Le tutoriel d'accueil et le suivi « dernière version du changelog vue » étaient stockés uniquement dans le navigateur : ils se réaffichaient à chaque changement d'appareil ou de navigateur. Ils sont désormais rattachés au compte, comme l'acceptation des CGU." },
      { type: "fixed", text: "Corrigé un cas où la pop-up « Quoi de neuf » pouvait se retrouver empilée derrière le tutoriel d'accueil chez un tout nouveau compte." },
    ],
  },
  {
    version: "3.0.1",
    date: "27/09/2026",
    title: "Surveillance réelle des services & sessions identifiées",
    changes: [
      { type: "fixed", text: "« Overlays Server », sur la page Statut, n'était en réalité jamais vérifié et s'affichait toujours comme opérationnel faute de données. Le service est désormais réellement testé à chaque vérification." },
      { type: "new", text: "La page Statut affiche maintenant la disponibilité sur 30 jours de chaque service, en plus des 24 heures déjà affichées." },
      { type: "improved", text: "Dans Compte & données, la liste des sessions actives indique désormais l'appareil (« Chrome sur Windows », « Safari sur iPhone »...) et la dernière activité, au lieu d'un simple « Autre appareil »." },
    ],
  },
  {
    version: "3.0.0",
    date: "27/09/2026",
    title: "Twichify 3.0 : espace propriétaire & accueil repensé",
    changes: [
      { type: "new", text: "Nouvelle section « Espace propriétaire » dans le panneau admin, réservée au Créateur et aux Co-créateurs : annonce globale programmable (immédiate ou planifiée, avec fin automatique), vue d'ensemble des utilisateurs et services, matrice des permissions par rôle, et journal d'audit des actions sensibles (changements de rôle, suppressions de compte)." },
      { type: "new", text: "Toutes les pages du panneau admin redirigent désormais vers la page 403 si le compte n'a pas la permission requise, avec un message qui indique la page demandée et propose de se connecter avec un autre compte." },
      { type: "new", text: "Petit tutoriel d'accueil pour les nouveaux comptes : 4 étapes pour connecter Spotify, personnaliser les widgets, les ajouter dans OBS et configurer le chat, avec des liens directs vers chaque réglage." },
      { type: "new", text: "La pop-up « Quoi de neuf » sait désormais reconnaître une grosse mise à jour (comme celle-ci) et affiche un récapitulatif complet de tout ce qui a changé depuis la dernière fois, avec le détail de chaque version dépliable, plutôt que de ne montrer que le tout dernier correctif." },
    ],
  },
  {
    version: "2.0.20",
    date: "26/09/2026",
    title: "Indicateur « en train d'écrire » dans les tickets",
    changes: [
      { type: "new", text: "Dans un ticket de support, un indicateur discret montre désormais quand l'autre personne (vous ou un membre du staff) est en train de rédiger une réponse, avec son nom affiché." },
    ],
  },
  {
    version: "2.0.19",
    date: "26/09/2026",
    title: "Modération du chat : mode censure",
    changes: [
      { type: "new", text: "Le filtre de mots du widget chat propose maintenant deux comportements au choix : masquer le message entier comme avant, ou ne censurer que le(s) mot(s) concerné(s) (remplacés par des astérisques) en gardant le reste du message visible." },
    ],
  },
  {
    version: "2.0.18",
    date: "25/09/2026",
    title: "Historique d'écoute détaillé",
    changes: [
      { type: "new", text: "La page Statistiques affiche désormais un historique détaillé des morceaux écoutés, avec les titres et artistes les plus joués, l'activité par heure et la liste des écoutes récentes, filtrable sur 7, 30, 90 jours ou depuis le début." },
      { type: "improved", text: "Le bouton « Réinitialiser » des statistiques efface maintenant aussi cet historique détaillé, et l'export de vos données personnelles l'inclut." },
    ],
  },
  {
    version: "2.0.17",
    date: "24/09/2026",
    title: "Pages d'erreur repensées",
    changes: [
      { type: "improved", text: "Refonte complète des pages 403, 404 et 500 : halo qui suit le curseur, couleur distincte selon le type d'erreur, page précédemment demandée affichée, suggestions de pages populaires sur la 404, et ID de diagnostic copiable en un clic sur la 500." },
      { type: "new", text: "Une page dédiée gère désormais les erreurs critiques du site (avant, ces cas n'affichaient aucune page de secours)." },
    ],
  },
  {
    version: "2.0.16",
    date: "23/09/2026",
    title: "Titres de page et mentions légales unifiés",
    changes: [
      { type: "improved", text: "Chaque page du site a désormais un titre d'onglet unique et court plutôt qu'un titre générique répété partout." },
      { type: "improved", text: "Le lien « Mentions légales » est présent dans le pied de page de chaque page du site (au lieu d'un bandeau séparé), et les pieds de page qui affichaient « Confidentialité » et « CGU » comme deux liens distincts ont été fusionnés en un seul." },
    ],
  },
  {
    version: "2.0.15",
    date: "22/09/2026",
    title: "Annonce globale du site",
    changes: [
      { type: "new", text: "Un bandeau d'annonce peut désormais être affiché en haut de tout le site (hors overlays OBS), avec un niveau (info, avertissement, critique), fermable ou non selon la gravité." },
    ],
  },
  {
    version: "2.0.14",
    date: "22/09/2026",
    title: "Performance du widget musique",
    changes: [
      { type: "fixed", text: "Le widget musique redemandait un nouveau jeton Spotify à chaque actualisation (une fois par seconde et par widget ouvert), au lieu de le réutiliser tant qu'il restait valide. Cela pouvait provoquer des blocages temporaires par Spotify quand plusieurs widgets étaient ouverts en même temps. Corrigé." },
      { type: "improved", text: "Les actualisations rapprochées du widget musique (aperçu du dashboard + widget réel ouverts en même temps, par exemple) sont désormais regroupées pour réduire la charge sur l'API Spotify." },
    ],
  },
  {
    version: "2.0.13",
    date: "22/09/2026",
    title: "Politique de confidentialité mise à jour",
    changes: [
      { type: "improved", text: "La page Confidentialité & CGU détaille désormais, donnée par donnée, pourquoi elle est collectée et combien de temps elle est conservée (profil, clés Spotify, réglages, statistiques d'écoute, tickets, boîte à idées)." },
      { type: "improved", text: "Un sommaire cliquable et une section dédiée à vos droits (accès, effacement, réclamation auprès de la CNIL) ont été ajoutés, avec un lien direct vers la page Compte & données." },
    ],
  },
  {
    version: "2.0.12",
    date: "22/09/2026",
    title: "Nouvelle page « Compte & données »",
    changes: [
      { type: "new", text: "Vous pouvez désormais télécharger une copie complète de vos données (profil, réglages des widgets, statistiques d'écoute, tickets, idées) au format JSON, depuis Tableau de bord → Compte & données." },
      { type: "new", text: "Suppression définitive du compte en quelques clics, avec double confirmation : jeton Twitch révoqué, clés Spotify et réglages supprimés, tickets effacés ; vos idées publiées sont conservées de façon anonymisée." },
      { type: "new", text: "Liste de vos sessions actives, avec possibilité de déconnecter un appareil précis ou tous les autres d'un coup." },
      { type: "new", text: "Outil de diagnostic : vérifie en direct votre connexion Twitch, votre connexion Spotify et si vos widgets sont bien activés, pour comprendre rapidement pourquoi quelque chose ne s'affiche pas." },
      { type: "new", text: "Réinitialisation en un clic des réglages de widgets (musique, chat, bot) ou de vos statistiques d'écoute, indépendamment l'une de l'autre." },
    ],
  },
  {
    version: "2.0.11",
    date: "22/09/2026",
    title: "Widgets musique & chat enrichis",
    changes: [
      { type: "improved", text: "Refonte du mode compact du widget musique : la pochette déborde proprement au-dessus de la carte et les titres trop longs défilent jusqu'à leur dernière lettre." },
      { type: "new", text: "Nouvelles options pour le widget musique : égaliseur animé et masquage automatique (le widget ne s'affiche que quelques secondes à chaque nouveau morceau)." },
      { type: "new", text: "Nouvelles options pour le widget chat : durée d'affichage des messages réglable (ou permanente), affichage des réponses à un message, mise en avant du tout premier message d'un viewer, et liste d'utilisateurs à masquer." },
    ],
  },
  {
    version: "2.0.10",
    date: "22/09/2026",
    title: "Page « État des services » repensée",
    changes: [
      { type: "improved", text: "La page de statut distingue désormais clairement une erreur de chargement d'une vraie panne, avec un bouton pour réessayer." },
      { type: "new", text: "Chiffres clés en un coup d'œil : services opérationnels, disponibilité moyenne sur 24 h, latence de la base de données, incidents en cours." },
      { type: "improved", text: "Les incidents en cours sont séparés de l'historique, avec l'impact affiché et un détail dépliable de toutes les mises à jour." },
      { type: "fixed", text: "L'historique horaire de chaque service était calculé sur les 24 premiers relevés plutôt que sur les 24 dernières heures, ce qui faussait l'affichage. Corrigé." },
    ],
  },
  {
    version: "2.0.9",
    date: "21/09/2026",
    title: "Refonte de la pop up « Nouveautés »",
    changes: [
      { type: "new", text: "La pop up affiche désormais uniquement la dernière version, avec un lien vers les versions précédentes si vous en avez manqué." },
      { type: "new", text: "Un résumé en badges (nouveautés, améliorations, corrections) apparaît sous l'en-tête pour repérer l'essentiel d'un coup d'œil." },
      { type: "new", text: "Chaque changement est marqué d'un liseré coloré à gauche selon son type : vert pour les nouveautés, bleu pour les améliorations, ambre pour les corrections." },
      { type: "new", text: "Les changements apparaissent en cascade, avec une animation d'entrée fluide." },
      { type: "new", text: "Des dégradés de fondu en haut et en bas de la liste indiquent qu'il reste du contenu à faire défiler." },
    ],
  },
    {
    version: "2.0.8",
    date: "20/09/2026",
    title: "Mise à jour de la pop up « Nouveautés »",
    changes: [
      { type: "improved", text: "Amélioration de l'interface de la pop up « Nouveautés »." },
    ],
  },
  {
    version: "2.0.7",
    date: "20/09/2026",
    title: "Correctif bot & mise à jour roadmap",
    changes: [
      { type: "fixed", text: "Les commandes de bot chat (Nightbot, Wizebot, StreamElements) ne fonctionnaient plus : les identifiants Spotify chiffrés n'étaient pas déchiffrés avant l'appel à l'API. Corrigé." },
      { type: "improved", text: "La roadmap de la page d'accueil reflète désormais l'état réel des fonctionnalités : emotes BTTV/7TV/FFZ, centre d'aide (FAQ + tickets) et statistiques d'écoute Spotify sont marqués comme disponibles ; seules les statistiques de chat Twitch restent à venir." },
    ],
  },
  {
    version: "2.0.6",
    date: "19/09/2026",
    title: "Boîte à idées & votes",
    changes: [
      { type: "new", text: "Nouvelle page « Boîte à idées » : proposez une fonctionnalité et votez pour celles des autres (▲ / ▼)." },
      { type: "new", text: "Réponses officielles de l'équipe directement affichées sous chaque idée." },
      { type: "new", text: "Panneau de modération dédié dans le dashboard admin pour changer le statut et répondre aux idées." },
    ],
  },
  {
    version: "2.0.5",
    date: "12/09/2026",
    title: "Permissions par rôle",
    changes: [
      { type: "new", text: "Système de permissions granulaire : chaque rôle du staff dispose désormais de son propre ensemble de droits (tickets, FAQ, utilisateurs, rôles)." },
      { type: "new", text: "Tri des utilisateurs par nom, rôle, date d'inscription ou statut Spotify dans le panneau admin." },
      { type: "improved", text: "Les sections FAQ et Tickets du panneau admin sont désormais masquées pour le staff qui n'a pas la permission correspondante." },
    ],
  },
  {
    version: "2.0.4",
    date: "05/09/2026",
    title: "Amélioration des tickets support",
    changes: [
      { type: "new", text: "Les liens (http/https) dans les messages de tickets sont désormais cliquables automatiquement." },
      { type: "improved", text: "Nouveaux raccourcis clavier dans les tickets : Entrée pour envoyer, Maj + Entrée pour aller à la ligne, Entrée + Espace pour envoyer et résoudre (staff)." },
    ],
  },
  {
    version: "2.0.0",
    date: "01/09/2026",
    title: "Lancement de Twichify",
    changes: [
      { type: "new", text: "Connexion Twitch et Spotify, widgets « now playing » et chat séparés pour OBS." },
      { type: "new", text: "8 thèmes visuels personnalisables." },
    ],
  },
];

export const LATEST_VERSION = CHANGELOG[0].version;

/** Numéro de version majeure (le premier chiffre) : 2 pour "2.0.14", 3 pour "3.0.0"... */
export function getMajorVersion(version: string): number {
  return parseInt(version.split(".")[0], 10) || 0;
}
