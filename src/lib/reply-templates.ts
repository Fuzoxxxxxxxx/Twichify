/**
 * Réponses pré-rédigées pour l'équipe : tickets de support et réponses officielles aux idées.
 * Sans import serveur : utilisable côté client (admin).
 *
 * Un modèle ne s'envoie jamais tout seul : il est inséré dans le champ de réponse, l'agent le relit, l'adapte
 * et l'envoie. Variables : `{pseudo}` (le demandeur) et `{signature}` (« Prénom, équipe Twichify »).
 * Pour ajouter un modèle : l'ajouter dans la bonne liste ci-dessous. Gardez les chemins de menus et les noms de
 * boutons identiques à ceux du site (Intégrations → Spotify, « Associer mon compte », « Régénérer les liens »…).
 */

export interface ReplyTemplate {
  id: string;
  label: string;
  category: string;
  text: string;
  /** Réponses aux idées : statut proposé en même temps que le texte (« en_etude », « planifie »…). */
  status?: string;
}

export const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  general: "Général",
  spotify: "Spotify",
  obs: "OBS & overlays",
  chat: "Widget de chat",
  twitch: "Twitch & stats",
  compte: "Compte & données",
  api: "API & erreurs",
  idees: "Idées",
};

const HELLO = "Bonjour {pseudo},";
const SIGN = "Cordialement,\n{signature}";

const ticket = (id: string, label: string, category: string, body: string): ReplyTemplate => ({
  id,
  label,
  category,
  text: `${HELLO}\n\n${body}\n\n${SIGN}`,
});

export const TICKET_TEMPLATES: ReplyTemplate[] = [
  /* ------------------------------- Général ------------------------------- */
  ticket(
    "accuse",
    "Accusé de réception",
    "general",
    "Merci pour votre message : nous avons bien reçu votre demande et nous nous en occupons. Nous revenons vers vous dès que possible."
  ),
  ticket(
    "infos",
    "Demande de précisions",
    "general",
    "Pour pouvoir vous aider, pourriez-vous nous préciser :\n- ce que vous voyez exactement (message d'erreur, capture d'écran en lien) ;\n- depuis quand le problème apparaît ;\n- ce que vous avez déjà essayé ;\n- le logiciel utilisé (OBS Studio, version) si le problème concerne un overlay."
  ),
  ticket(
    "incident",
    "Incident en cours (page Statut)",
    "general",
    "Un incident est en cours et peut expliquer ce que vous rencontrez. Vous pouvez suivre son évolution en temps réel sur la page Statut (/status). Nous vous informerons ici dès que la situation sera rétablie."
  ),
  ticket(
    "bug",
    "Bug confirmé et transmis",
    "general",
    "Nous avons pu reproduire le problème et l'avons transmis à l'équipe technique. Il sera corrigé dans une prochaine mise à jour : vous pouvez suivre les nouveautés sur la page Changelog. Merci de nous l'avoir signalé !"
  ),
  ticket(
    "fonctionnalite",
    "Fonctionnalité non disponible",
    "general",
    "Cette fonctionnalité n'est pas disponible pour le moment. Si vous souhaitez qu'elle soit étudiée, vous pouvez la proposer sur la page Idées : les autres utilisateurs pourront voter, et l'équipe y répond officiellement."
  ),
  ticket(
    "hors_perimetre",
    "Hors du périmètre du support",
    "general",
    "Ce point dépend d'un service extérieur (Spotify, Twitch ou votre logiciel de stream) sur lequel nous ne pouvons pas intervenir. Nous vous conseillons de vous adresser directement à leur support, en précisant le message exact affiché."
  ),
  ticket(
    "relance",
    "Relance (sans réponse)",
    "general",
    "Nous n'avons pas eu de retour de votre part depuis notre dernier message. Si le problème persiste, répondez simplement ici avec les informations demandées. Sans nouvelles de votre part dans les prochains jours, nous clôturerons ce ticket, et vous pourrez en ouvrir un nouveau à tout moment."
  ),
  ticket(
    "resolu",
    "Ticket résolu",
    "general",
    "Nous considérons ce problème comme résolu. S'il revient ou si vous avez une autre question, répondez ici ou ouvrez un nouveau ticket depuis la rubrique Support : nous serons ravis de vous aider."
  ),

  /* ------------------------------- Spotify ------------------------------- */
  ticket(
    "spotify_connexion",
    "Connexion Spotify pas à pas",
    "spotify",
    "Voici comment associer votre compte Spotify :\n1. Dans Intégrations → Spotify, créez une application sur le Dashboard Spotify Developer (developer.spotify.com/dashboard).\n2. Copiez la Redirect URI affichée par Twichify (bouton Copier) et ajoutez-la exactement telle quelle dans les réglages de votre application Spotify.\n3. Renseignez votre Client ID et votre Client Secret, puis cliquez sur Sauvegarder.\n4. Cliquez sur « Associer mon compte » et autorisez l'accès.\nUn compte Spotify Premium est nécessaire pour récupérer la lecture en temps réel."
  ),
  ticket(
    "spotify_redirect",
    "Redirect URI refusée par Spotify",
    "spotify",
    "Cette erreur signifie que l'adresse enregistrée chez Spotify ne correspond pas exactement à celle de Twichify. Dans Intégrations → Spotify, cliquez sur Copier à côté de la Redirect URI, puis collez-la telle quelle dans les réglages de votre application sur le Dashboard Spotify Developer (sans espace ni caractère en plus) et enregistrez. Réessayez ensuite « Associer mon compte »."
  ),
  ticket(
    "spotify_reassocier",
    "Réassocier le compte Spotify",
    "spotify",
    "Si vous avez changé votre Client Secret ou retiré l'accès à Twichify depuis votre compte Spotify, la connexion n'est plus valide. Vérifiez vos clés dans Intégrations → Spotify et cliquez sur Sauvegarder, puis sur « Se déconnecter » et « Associer mon compte » pour autoriser de nouveau l'accès."
  ),
  ticket(
    "spotify_premium",
    "Spotify Premium obligatoire",
    "spotify",
    "La lecture en temps réel passe par l'API web de Spotify, qui n'est accessible qu'avec un compte Spotify Premium actif. Avec un compte gratuit, Spotify ne renvoie pas les informations du morceau en cours : ce n'est pas un défaut de Twichify."
  ),
  ticket(
    "spotify_retard",
    "Musique en retard ou en pause",
    "spotify",
    "L'API Spotify met parfois quelques secondes à synchroniser la lecture. Vérifiez qu'un morceau est bien en cours de lecture, que l'application Spotify est ouverte sur l'appareil concerné et que votre connexion est stable. Si l'écart persiste plusieurs minutes, dites-nous depuis quand et sur quel appareil vous écoutez."
  ),
  ticket(
    "spotify_429",
    "Erreur 429 (trop de requêtes)",
    "spotify",
    "Spotify limite le nombre de requêtes par application. Twichify réutilise les jetons et regroupe les requêtes rapprochées pour limiter les appels. Évitez de laisser le widget ouvert dans plusieurs onglets ou sources en même temps, puis patientez quelques instants : la situation se rétablit d'elle-même. Si l'erreur revient en continu, répondez-nous ici."
  ),

  /* ------------------------------- OBS ------------------------------- */
  ticket(
    "obs_ajout",
    "Ajouter un widget dans OBS",
    "obs",
    "Pour ajouter un widget :\n1. Copiez votre lien d'overlay depuis l'Accueil du tableau de bord (un lien pour la musique, un autre pour le chat).\n2. Dans OBS Studio, ajoutez une source Navigateur (Browser) et collez l'URL.\n3. Définissez la taille : par défaut 1920 × 1080, ou les valeurs du canevas si vous l'avez modifié dans les réglages du widget."
  ),
  ticket(
    "obs_transparent",
    "Overlay vide ou transparent",
    "obs",
    "Voici quelques vérifications :\n- l'URL de la source Navigateur est celle de l'Accueil du tableau de bord, copiée en entier (le lien musique et le lien chat sont différents) ;\n- clic droit sur la source dans OBS → Propriétés → « Actualiser le cache de la page actuelle » ;\n- votre compte Spotify est bien associé et un morceau est en cours de lecture (pour le widget musique).\nSi cela ne suffit pas, indiquez-nous votre version d'OBS et ce que la source affiche."
  ),
  ticket(
    "obs_regenerer",
    "Régénérer les liens d'overlay",
    "obs",
    "Si votre lien d'overlay a été montré à l'écran ou partagé, sur l'Accueil du tableau de bord, cliquez sur « Régénérer les liens ». Les anciens liens sont désactivés définitivement : pensez ensuite à mettre à jour vos sources Navigateur dans OBS avec les nouveaux liens."
  ),

  /* ------------------------------- Chat ------------------------------- */
  ticket(
    "chat_vide",
    "Le chat n'affiche aucun message",
    "chat",
    "Voici ce qu'il faut vérifier :\n- la source OBS utilise bien le lien du chat (et non celui de la musique) ;\n- dans Widgets → Chat, vous n'avez pas masqué les bots ou les commandes, ni ajouté un filtre ou un utilisateur ignoré qui bloque tout ;\n- la durée de vie des messages n'est pas trop courte (0 = permanents) ;\n- écrivez un message dans votre chat pour tester."
  ),
  ticket(
    "chat_emotes",
    "Emotes manquantes dans le chat",
    "chat",
    "Les emotes BetterTTV, 7TV et FrankerFaceZ viennent de ces services tiers : une emote ne s'affiche que si elle est activée sur votre chaîne. Vous pouvez aussi consulter la section « Émotes du chat » de la page Statut pour savoir si l'un de ces services rencontre un problème. Après un changement, rechargez la source Navigateur dans OBS."
  ),

  /* ------------------------------- Twitch & stats ------------------------------- */
  ticket(
    "twitch_reconnexion",
    "Reconnexion Twitch demandée",
    "twitch",
    "Les statistiques de chaîne demandent des autorisations en lecture seule ajoutées après la création de certains comptes. Un bandeau vous invite à vous reconnecter une seule fois pour les accorder. Twichify ne publie rien et ne modifie rien sur votre chaîne. Sans cette étape, seules les sections concernées restent indisponibles."
  ),
  ticket(
    "stats_vides",
    "Statistiques vides",
    "twitch",
    "Les statistiques ne sont enregistrées que lorsque les widgets sont actifs :\n- statistiques de chat : le widget de chat doit tourner dans OBS et la fonction être activée dans l'onglet Chat de la page Twitch (aucun message n'est enregistré, seulement des compteurs) ;\n- statistiques d'écoute : le widget musique doit être ouvert pendant la lecture.\nAucune période sans widget actif n'est enregistrée."
  ),
  ticket(
    "departs",
    "Suivi des départs expliqué",
    "twitch",
    "Twitch ne fournit aucun historique de désabonnements. Si vous activez le suivi des départs (onglet Followers), Twichify garde uniquement les identifiants de vos followers et les compare à chaque analyse : un départ est donc repéré à l'analyse suivante, pas en temps réel. Un compte supprimé ou banni apparaît comme « Compte introuvable ». Désactiver le suivi supprime la liste et l'historique."
  ),

  /* ------------------------------- Compte & données ------------------------------- */
  ticket(
    "compte_export",
    "Exporter mes données",
    "compte",
    "Dans Compte & données, utilisez l'export : vous téléchargez un fichier JSON contenant vos données personnelles. Les statistiques de chat et le suivi des départs n'y figurent que sous forme de comptages."
  ),
  ticket(
    "compte_suppression",
    "Supprimer mon compte",
    "compte",
    "Vous pouvez supprimer votre compte depuis Compte & données : une confirmation est demandée (vous devrez saisir SUPPRIMER). La suppression est définitive : votre accès Twitch est révoqué, vos tickets sont supprimés et vos idées sont anonymisées. Si vous souhaitez conserver une copie de vos données, utilisez l'export avant de supprimer."
  ),
  ticket(
    "compte_securite",
    "Sécuriser son compte",
    "compte",
    "Dans Compte & données, la liste des sessions actives indique l'appareil et la dernière activité : vous pouvez déconnecter une session ou toutes les autres. Si vos liens d'overlay ont pu fuiter, régénérez-les depuis l'Accueil du tableau de bord. Vos clés Spotify sont chiffrées avant d'être enregistrées et Twichify ne voit jamais vos mots de passe."
  ),

  /* ------------------------------- API ------------------------------- */
  ticket(
    "api_auth",
    "Erreur d'authentification (401 / 403)",
    "api",
    "Ce type d'erreur vient en général d'identifiants incorrects, d'une Redirect URI qui ne correspond pas exactement, ou d'un accès retiré. Vérifiez votre Client ID et votre Client Secret dans Intégrations → Spotify, la Redirect URI enregistrée chez Spotify, puis cliquez sur « Se déconnecter » et « Associer mon compte » pour renouveler l'accès."
  ),
];

/** Réponses officielles aux idées (publiques : pas de formule de politesse personnalisée). */
export const IDEA_TEMPLATES: ReplyTemplate[] = [
  {
    id: "idea_etude",
    label: "À l'étude",
    category: "idees",
    status: "en_etude",
    text: "Merci pour cette idée ! Nous l'étudions et reviendrons vers vous dès que nous aurons évalué sa faisabilité.",
  },
  {
    id: "idea_planifie",
    label: "Planifiée",
    category: "idees",
    status: "planifie",
    text: "Excellente idée : elle est ajoutée à notre feuille de route. Nous ne pouvons pas encore donner de date, mais nous vous tiendrons informés.",
  },
  {
    id: "idea_en_cours",
    label: "En cours de développement",
    category: "idees",
    status: "en_cours",
    text: "Nous travaillons dessus ! Suivez la page Changelog pour être prévenu de sa sortie.",
  },
  {
    id: "idea_termine",
    label: "Terminée",
    category: "idees",
    status: "termine",
    text: "C'est fait : cette idée est maintenant disponible. Vous trouverez les détails dans le Changelog. Merci pour votre contribution !",
  },
  {
    id: "idea_deja",
    label: "Déjà disponible",
    category: "idees",
    status: "termine",
    text: "Cette fonctionnalité existe déjà. Si vous ne la trouvez pas, ouvrez un ticket depuis la rubrique Support et nous vous guiderons.",
  },
  {
    id: "idea_doublon",
    label: "Doublon d'une idée existante",
    category: "idees",
    status: "rejete",
    text: "Cette idée est très proche d'une proposition déjà existante. Pour la soutenir, votez directement pour celle-ci : cela nous aide à prioriser.",
  },
  {
    id: "idea_technique",
    label: "Impossible techniquement",
    category: "idees",
    status: "rejete",
    text: "Merci pour la proposition. Malheureusement, elle n'est pas réalisable pour le moment : Spotify ou Twitch n'exposent pas les données nécessaires via leur API. Nous la réétudierons si cela évolue.",
  },
  {
    id: "idea_rejete",
    label: "Non retenue",
    category: "idees",
    status: "rejete",
    text: "Merci pour la proposition. Nous ne pouvons pas la retenir pour le moment : elle ne correspond pas à l'orientation actuelle du projet ou demande trop de ressources. N'hésitez pas à proposer d'autres idées !",
  },
];

/** Remplace les variables d'un modèle. Sans pseudo, « Bonjour , » devient « Bonjour, ». */
export function fillTemplate(text: string, vars: { pseudo?: string | null; agent?: string | null }): string {
  const pseudo = (vars.pseudo ?? "").trim();
  const agent = (vars.agent ?? "").trim();
  return text
    .replace(/\{signature\}/g, agent ? `${agent}, équipe Twichify` : "L'équipe Twichify")
    .replace(/\{pseudo\}/g, pseudo)
    .replace(/Bonjour ,/g, "Bonjour,");
}
