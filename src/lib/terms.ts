/**
 * Versionnement des Conditions Générales d'Utilisation et de la politique de confidentialité.
 *
 * Un utilisateur doit accepter les CGU en vigueur : s'il les a acceptées AVANT la dernière révision matérielle,
 * la fenêtre d'acceptation s'affiche de nouveau (avec la liste de ce qui a changé).
 *
 * ── Quand modifier ce fichier ? ──
 * À chaque changement MATÉRIEL de la page /privacy : nouvelle donnée collectée, nouvelle permission demandée,
 * nouveau traitement, nouveau tiers, nouvelle durée de conservation…
 * Les corrections de forme (fautes, reformulations) ne justifient PAS de redemander l'acceptation à tout le monde.
 *
 * Marche à suivre : 1) mettre à jour `TERMS_REVISED_AT` et `TERMS_REVISED_LABEL` ; 2) remplacer `TERMS_CHANGES` par
 * la liste des changements de CETTE révision (pas l'historique) ; 3) faire correspondre le contenu de /privacy.
 */

// Date de la dernière révision matérielle. Les acceptations antérieures ne sont plus valables.
export const TERMS_REVISED_AT = new Date("2026-10-04T00:00:00.000Z");

// Même date, formulée pour l'affichage (page /privacy et fenêtre d'acceptation).
export const TERMS_REVISED_LABEL = "4 octobre 2026";

// Ce qui a changé lors de la dernière révision, affiché dans la fenêtre aux utilisateurs qui avaient déjà accepté.
export const TERMS_CHANGES: string[] = [
  "Nouvelles permissions Twitch en lecture seule (followers, modérateurs, éditeurs, VIPs, abonnés, bits) pour afficher les statistiques de votre chaîne.",
  "Suivi des départs de followers : fonction facultative qui enregistre la liste de vos followers pour détecter qui part.",
  "Statistiques de chat : fonction facultative qui enregistre des compteurs d'activité de votre chat (jamais le texte des messages) pendant 90 jours.",
];

/** Vrai si l'acceptation date d'après la dernière révision. */
export function hasAcceptedCurrentTerms(acceptedAt: Date | string | null | undefined): boolean {
  if (!acceptedAt) return false;
  const time = new Date(acceptedAt).getTime();
  return Number.isFinite(time) && time >= TERMS_REVISED_AT.getTime();
}
