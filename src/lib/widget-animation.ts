/**
 * Animations du widget musique : source unique, partagée par le widget OBS et l'aperçu du dashboard.
 * Les deux utilisent exactement les mêmes keyframes et les mêmes durées, donc le rendu est identique.
 *
 * - expand / slide / fade / pop : l'animation s'applique à l'ensemble (carte + pochette).
 * - reveal : la pochette apparaît seule au centre, puis glisse vers la gauche pendant que la carte s'ouvre dans son sillage.
 *   À la sortie, c'est l'inverse : la carte se referme, la pochette revient au centre puis s'efface.
 *   Le décalage de la pochette dépend de la mise en page : il est fourni via la variable CSS `--wa-reveal-dx`.
 *
 * Chaque style a une entrée (`wa-in-*`) et une sortie (`wa-out-*`) qui en est le miroir.
 */

export const ANIMATION_STYLES = ["expand", "reveal", "slide", "fade", "pop"] as const;
export type AnimationStyle = (typeof ANIMATION_STYLES)[number];

export const ANIMATION_SPEEDS = { slow: 1.5, normal: 1, fast: 0.65 } as const;
export type AnimationSpeed = keyof typeof ANIMATION_SPEEDS;

/** Durée de base (en secondes, avant le facteur de vitesse) de l'entrée de chaque style. */
const ENTRY_DURATION_S = { expand: 0.9, reveal: 1.6, slide: 0.9, fade: 0.9, pop: 0.9 } as const;
/**
 * Durée de base de la sortie de chaque style. Pour "reveal", c'est la durée totale :
 * la carte se referme en REVEAL_CARD_OUT_S, la pochette revient puis s'efface sur toute la durée.
 */
const EXIT_DURATION_S = { expand: 0.5, reveal: 1.0, slide: 0.5, fade: 0.5, pop: 0.4 } as const;
const REVEAL_CARD_OUT_S = 0.8;

const EASE_DEFAULT = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_REVEAL = "cubic-bezier(0.65, 0, 0.35, 1)";
const EASE_OUT = "cubic-bezier(0.4, 0, 1, 1)";

/** Keyframes (entrées et sorties) à injecter dans une balise <style>. */
export const WIDGET_ENTRY_KEYFRAMES = `
@keyframes wa-in-expand { from { opacity: 0; transform: translateY(20px) scaleX(0.4); } to { opacity: 1; transform: none; } }
@keyframes wa-in-slide { from { opacity: 0; transform: translateX(-60px); } to { opacity: 1; transform: none; } }
@keyframes wa-in-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes wa-in-pop { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: none; } }
/* reveal : la carte reste invisible (largeur nulle) pendant que la pochette apparait seule, puis s'ouvre dans son sillage. */
@keyframes wa-in-reveal {
  0%, 51% { clip-path: inset(-100px 50% -100px 50%); }
  99% { clip-path: inset(-100px 0px -100px 0px); }
  100% { clip-path: inset(-100px -100px -100px -100px); }
}
@keyframes wa-reveal-cover {
  0% { opacity: 0; transform: translateX(var(--wa-reveal-dx, 150px)) scale(0.4); }
  20%, 44% { opacity: 1; transform: translateX(var(--wa-reveal-dx, 150px)) scale(1); }
  100% { opacity: 1; transform: none; }
}

@keyframes wa-out-expand { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(-12px) scaleX(0.4); } }
@keyframes wa-out-slide { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateX(-60px); } }
@keyframes wa-out-fade { from { opacity: 1; } to { opacity: 0; } }
@keyframes wa-out-pop { from { opacity: 1; transform: none; } to { opacity: 0; transform: scale(0.92); } }
/* reveal : la carte se referme vers le centre, la pochette revient au centre puis s'efface. */
@keyframes wa-out-reveal {
  0% { clip-path: inset(-100px -100px -100px -100px); }
  1% { clip-path: inset(-100px 0px -100px 0px); }
  100% { clip-path: inset(-100px 50% -100px 50%); }
}
@keyframes wa-out-reveal-cover {
  0% { opacity: 1; transform: none; }
  70% { opacity: 1; transform: translateX(var(--wa-reveal-dx, 150px)) scale(1); }
  100% { opacity: 0; transform: translateX(var(--wa-reveal-dx, 150px)) scale(0.4); }
}
`;

/** Valeur CSS `animation` d'entrée pour un style donné. `backwards` : aucun état final forcé. */
export function entryAnimation(style: AnimationStyle, speedFactor: number): string {
  const ease = style === "reveal" ? EASE_REVEAL : EASE_DEFAULT;
  return `wa-in-${style} ${ENTRY_DURATION_S[style] * speedFactor}s ${ease} backwards`;
}

/** Animation d'entrée de la pochette pour le style "reveal" (avec la variable `--wa-reveal-dx`). */
export function revealCoverAnimation(speedFactor: number): string {
  return `wa-reveal-cover ${ENTRY_DURATION_S.reveal * speedFactor}s ${EASE_REVEAL} backwards`;
}

/** Valeur CSS `animation` de sortie. `both` : l'état final (invisible) est conservé jusqu'au retrait de l'élément. */
export function exitAnimation(style: AnimationStyle, speedFactor: number): string {
  if (style === "reveal") return `wa-out-reveal ${REVEAL_CARD_OUT_S * speedFactor}s ${EASE_REVEAL} both`;
  return `wa-out-${style} ${EXIT_DURATION_S[style] * speedFactor}s ${EASE_OUT} both`;
}

/** Animation de sortie de la pochette pour le style "reveal" (avec la variable `--wa-reveal-dx`). */
export function revealCoverExitAnimation(speedFactor: number): string {
  return `wa-out-reveal-cover ${EXIT_DURATION_S.reveal * speedFactor}s ${EASE_REVEAL} both`;
}

/** Temps (ms) à attendre avant de retirer le widget : durée de la sortie la plus longue, avec une petite marge. */
export function exitDurationMs(style: AnimationStyle, speedFactor: number): number {
  return Math.round(EXIT_DURATION_S[style] * speedFactor * 1000) + 60;
}

/** Facteur de vitesse à partir de la valeur enregistrée ("slow" | "normal" | "fast"). */
export function speedFactorOf(speed: string | undefined): number {
  return Object.prototype.hasOwnProperty.call(ANIMATION_SPEEDS, speed ?? "")
    ? ANIMATION_SPEEDS[speed as AnimationSpeed]
    : 1;
}
