/**
 * Polices du widget musique : source unique partagée par le widget OBS, le dashboard et l'API.
 *
 * Valeurs stockées dans `widgetSettings.fontFamily` :
 * - "font-sans" | "font-mono" | "font-serif" : classes Tailwind historiques (polices système), toujours valides ;
 * - "google:<Famille>" : police Google Fonts de la bibliothèque ci-dessous (ex. "google:Orbitron").
 */

export type FontCategory = "sans" | "display" | "mono" | "serif" | "script";

export interface FontOption {
  /** Valeur stockée dans les réglages. */
  id: string;
  label: string;
  category: FontCategory;
  /** Famille Google Fonts (absente pour les polices système). */
  family?: string;
  /** Graisses à charger ; absent = police à graisse unique. */
  weights?: number[];
}

export const FONT_CATEGORY_LABELS: Record<FontCategory | "all", string> = {
  all: "Toutes",
  sans: "Sans",
  display: "Display",
  mono: "Mono",
  serif: "Serif",
  script: "Script",
};

/** Polices système historiques (aucun téléchargement). */
export const SYSTEM_FONTS: FontOption[] = [
  { id: "font-sans", label: "Modern Sans", category: "sans" },
  { id: "font-mono", label: "Retro Mono", category: "mono" },
  { id: "font-serif", label: "Elegant Serif", category: "serif" },
];

const W3 = [400, 700, 900];

/** Bibliothèque Google Fonts. Le widget utilise du texte gras : on charge donc les graisses 700/900 quand elles existent. */
export const GOOGLE_FONTS: FontOption[] = [
  { id: "google:Inter", label: "Inter", category: "sans", family: "Inter", weights: W3 },
  { id: "google:Poppins", label: "Poppins", category: "sans", family: "Poppins", weights: W3 },
  { id: "google:Montserrat", label: "Montserrat", category: "sans", family: "Montserrat", weights: W3 },
  { id: "google:Nunito", label: "Nunito", category: "sans", family: "Nunito", weights: W3 },
  { id: "google:Rubik", label: "Rubik", category: "sans", family: "Rubik", weights: W3 },
  { id: "google:Oswald", label: "Oswald", category: "sans", family: "Oswald", weights: [400, 700] },
  { id: "google:Bebas Neue", label: "Bebas Neue", category: "display", family: "Bebas Neue" },
  { id: "google:Orbitron", label: "Orbitron", category: "display", family: "Orbitron", weights: W3 },
  { id: "google:Audiowide", label: "Audiowide", category: "display", family: "Audiowide" },
  { id: "google:Russo One", label: "Russo One", category: "display", family: "Russo One" },
  { id: "google:Righteous", label: "Righteous", category: "display", family: "Righteous" },
  { id: "google:Bungee", label: "Bungee", category: "display", family: "Bungee" },
  { id: "google:Press Start 2P", label: "Press Start 2P", category: "display", family: "Press Start 2P" },
  { id: "google:JetBrains Mono", label: "JetBrains Mono", category: "mono", family: "JetBrains Mono", weights: [400, 700, 800] },
  { id: "google:Space Mono", label: "Space Mono", category: "mono", family: "Space Mono", weights: [400, 700] },
  { id: "google:VT323", label: "VT323", category: "mono", family: "VT323" },
  { id: "google:Playfair Display", label: "Playfair Display", category: "serif", family: "Playfair Display", weights: W3 },
  { id: "google:Merriweather", label: "Merriweather", category: "serif", family: "Merriweather", weights: W3 },
  { id: "google:Pacifico", label: "Pacifico", category: "script", family: "Pacifico" },
  { id: "google:Lobster", label: "Lobster", category: "script", family: "Lobster" },
  { id: "google:Permanent Marker", label: "Permanent Marker", category: "script", family: "Permanent Marker" },
];

export const ALL_FONTS: FontOption[] = [...SYSTEM_FONTS, ...GOOGLE_FONTS];

export const DEFAULT_FONT_ID = "font-sans";

/** Ajoute une feuille de style dans <head> une seule fois (identifiée par `id`). À appeler côté navigateur uniquement. */
export function ensureStylesheet(id: string, href: string): void {
  if (typeof document === "undefined" || !href || document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

export function findFont(id: string | undefined | null): FontOption | undefined {
  return ALL_FONTS.find((f) => f.id === id);
}

/** Vrai si la valeur est une police connue (utilisé côté API pour ne jamais stocker une valeur arbitraire). */
export function isValidFontId(id: unknown): id is string {
  return typeof id === "string" && !!findFont(id);
}

const GENERIC_BY_CATEGORY: Record<FontCategory, string> = {
  sans: "sans-serif",
  display: "sans-serif",
  mono: "monospace",
  serif: "serif",
  script: "cursive",
};

/** URL Google Fonts (CSS2) pour une liste de polices ; "" s'il n'y a aucune police Google. */
export function googleFontsUrl(fonts: FontOption[]): string {
  const params = fonts
    .filter((f) => f.family)
    .map((f) => {
      const name = encodeURIComponent(f.family!).replace(/%20/g, "+");
      return f.weights?.length ? `family=${name}:wght@${f.weights.join(";")}` : `family=${name}`;
    });
  return params.length ? `https://fonts.googleapis.com/css2?${params.join("&")}&display=swap` : "";
}

export interface ResolvedFont {
  /** Classe Tailwind à appliquer (polices système). */
  className: string;
  /** Valeur `font-family` à appliquer en style (polices Google). */
  fontFamily?: string;
  /** Feuille de style à charger (polices Google). */
  href?: string;
  /** Famille Google, pour attendre son chargement avec document.fonts. */
  family?: string;
}

/** Transforme la valeur enregistrée en classe / style / feuille de style. Valeur inconnue : police système par défaut. */
export function resolveFont(id: string | undefined | null): ResolvedFont {
  const font = findFont(id);
  if (!font) return { className: DEFAULT_FONT_ID };
  if (!font.family) return { className: font.id };
  return {
    className: "",
    fontFamily: `'${font.family}', ${GENERIC_BY_CATEGORY[font.category]}`,
    href: googleFontsUrl([font]),
    family: font.family,
  };
}
