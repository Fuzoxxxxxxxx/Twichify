// Widget « bandeau d'informations » : des messages (réseaux sociaux, commandes du chat, partenaires…) qui défilent
// à intervalle régulier. Source unique des réglages : valeurs par défaut, bornes et validation, partagées par
// l'API, le widget OBS et le tableau de bord. Le schéma Mongoose ne les redéfinit pas (champ libre) : tout passe
// par `sanitizeInfoBanner`, à la lecture comme à l'écriture.
//
// Chaque message peut avoir son propre design : un logo (plateforme ou image personnalisée) et ses couleurs. Une
// couleur à `null` reprend celle du bandeau.

import { isValidFontId, DEFAULT_FONT_ID } from "@/lib/widget-fonts";
import { findBrand, readableTextColor } from "@/lib/info-banner-icons";

export const INFO_BANNER_MAX_MESSAGES = 10;
export const INFO_BANNER_MAX_LENGTH = 140;
export const INFO_BANNER_MAX_CUSTOM_LOGOS = 5;
/** Longueur maximale du data URI d'un logo personnalisé (environ 30 Ko d'image) : le navigateur le réduit avant l'envoi. */
export const INFO_BANNER_LOGO_MAX_CHARS = 40_000;
const LOGO_NAME_MAX = 24;

// Bornes des réglages de taille (le bandeau peut aller jusqu'à une source OBS en pleine largeur).
export const INFO_BANNER_LIMITS = {
  intervalSeconds: { min: 3, max: 60 },
  fontSize: { min: 12, max: 160 },
  widgetWidth: { min: 240, max: 1920 },
  borderRadius: { min: 0, max: 120 },
  paddingY: { min: 4, max: 96 },
  paddingX: { min: 8, max: 160 },
  logoScale: { min: 50, max: 300 },
  blur: { min: 0, max: 40 },
} as const;

// Styles d'animation réutilisés de lib/widget-animation (« reveal » est propre à la pochette du widget musique).
export const INFO_BANNER_ANIMATIONS = ["fade", "slide", "pop", "expand"] as const;
export type InfoBannerAnimation = (typeof INFO_BANNER_ANIMATIONS)[number];

export const INFO_BANNER_SPEEDS = ["slow", "normal", "fast"] as const;
export type InfoBannerSpeed = (typeof INFO_BANNER_SPEEDS)[number];

export const INFO_BANNER_ALIGNS = ["left", "center", "right"] as const;
export type InfoBannerAlign = (typeof INFO_BANNER_ALIGNS)[number];

/** Accent : aucun, barre à gauche, barre en bas ou contour complet. */
export const INFO_BANNER_ACCENTS = ["none", "left", "bottom", "outline"] as const;
export type InfoBannerAccent = (typeof INFO_BANNER_ACCENTS)[number];

export const INFO_BANNER_WEIGHTS = ["normal", "bold", "black"] as const;
export type InfoBannerWeight = (typeof INFO_BANNER_WEIGHTS)[number];

export const INFO_BANNER_SHADOWS = ["none", "soft", "glow"] as const;
export type InfoBannerShadow = (typeof INFO_BANNER_SHADOWS)[number];

export const INFO_BANNER_LOGO_POSITIONS = ["left", "right"] as const;
export type InfoBannerLogoPosition = (typeof INFO_BANNER_LOGO_POSITIONS)[number];

/** Logo seul, ou logo dans une pastille ronde teintée aux couleurs du texte. */
export const INFO_BANNER_LOGO_STYLES = ["plain", "chip"] as const;
export type InfoBannerLogoStyle = (typeof INFO_BANNER_LOGO_STYLES)[number];

export interface InfoBannerMessage {
  text: string;
  /** "" : aucun logo · identifiant d'un logo de plateforme (lib/info-banner-icons) · "custom:<id>" : logo personnalisé. */
  icon: string;
  /** Couleurs propres au message ; null = celles du bandeau. */
  textColor: string | null;
  backgroundColor: string | null;
  /** Opacité du fond, en pourcentage ; null = celle du bandeau. */
  backgroundOpacity: number | null;
  accentColor: string | null;
}

export interface InfoBannerCustomLogo {
  id: string;
  name: string;
  /** Image réduite (PNG, JPEG ou WebP) sous forme de data URI, envoyée par le navigateur. */
  dataUri: string;
}

export interface InfoBannerSettings {
  messages: InfoBannerMessage[];
  customLogos: InfoBannerCustomLogo[];
  /** Durée d'affichage de chaque message, en secondes. */
  intervalSeconds: number;
  /** Ordre aléatoire (sans répéter deux fois de suite le même message). */
  shuffle: boolean;
  fontFamily: string;
  fontSize: number;
  fontWeight: InfoBannerWeight;
  uppercase: boolean;
  textColor: string;
  backgroundColor: string;
  /** Opacité du fond, en pourcentage. */
  backgroundOpacity: number;
  accentColor: string;
  accentStyle: InfoBannerAccent;
  shadow: InfoBannerShadow;
  borderRadius: number;
  /** Marges intérieures, en pixels : elles règlent la hauteur et l'épaisseur du bandeau. */
  paddingY: number;
  paddingX: number;
  align: InfoBannerAlign;
  /** Largeur du bandeau en pixels, ignorée si `fullWidth`. */
  widgetWidth: number;
  /** Le bandeau occupe toute la largeur de la source OBS. */
  fullWidth: boolean;
  /** Taille du logo, en pourcentage de la taille du texte. */
  logoScale: number;
  logoPosition: InfoBannerLogoPosition;
  logoStyle: InfoBannerLogoStyle;
  /** Flou de ce qui se trouve derrière le bandeau (effet verre dépoli), en pixels ; 0 = aucun. */
  blur: number;
  /** Fine barre qui se vide pendant l'affichage de chaque message (temps restant avant le suivant). */
  showProgress: boolean;
  animationStyle: InfoBannerAnimation;
  animationSpeed: InfoBannerSpeed;
}

export const DEFAULT_INFO_BANNER: InfoBannerSettings = {
  messages: [],
  customLogos: [],
  intervalSeconds: 8,
  shuffle: false,
  fontFamily: DEFAULT_FONT_ID,
  fontSize: 22,
  fontWeight: "bold",
  uppercase: false,
  textColor: "#ffffff",
  backgroundColor: "#000000",
  backgroundOpacity: 60,
  accentColor: "#a855f7",
  accentStyle: "left",
  shadow: "none",
  borderRadius: 16,
  paddingY: 16,
  paddingX: 24,
  align: "center",
  widgetWidth: 720,
  fullWidth: false,
  logoScale: 125,
  logoPosition: "left",
  logoStyle: "plain",
  blur: 0,
  showProgress: false,
  animationStyle: "fade",
  animationSpeed: "normal",
};

/**
 * Styles rapides : ils ne changent que l'apparence (jamais les messages, les logos, la durée ni l'animation).
 * Chaque valeur est ensuite nettoyée par `sanitizeInfoBanner` comme tout autre réglage.
 */
export const INFO_BANNER_PRESETS: { id: string; label: string; description: string; values: Partial<InfoBannerSettings> }[] = [
  {
    id: "sobre",
    label: "Sobre",
    description: "Barre noire translucide, discrète.",
    values: {
      fontSize: 22, fontWeight: "bold", uppercase: false, textColor: "#ffffff", backgroundColor: "#000000",
      backgroundOpacity: 60, accentColor: "#a855f7", accentStyle: "left", shadow: "none", borderRadius: 16,
      paddingY: 16, paddingX: 24, widgetWidth: 720, fullWidth: false, logoScale: 125, blur: 0, logoStyle: "plain",
    },
  },
  {
    id: "gros-titre",
    label: "Gros titre",
    description: "Grande bannière en pleine largeur.",
    values: {
      fontSize: 56, fontWeight: "black", uppercase: true, textColor: "#ffffff", backgroundColor: "#0a0a0a",
      backgroundOpacity: 78, accentColor: "#a855f7", accentStyle: "bottom", shadow: "soft", borderRadius: 20,
      paddingY: 30, paddingX: 56, fullWidth: true, logoScale: 120, blur: 0, logoStyle: "plain",
    },
  },
  {
    id: "pastille",
    label: "Pastille",
    description: "Forme arrondie, compacte.",
    values: {
      fontSize: 26, fontWeight: "bold", uppercase: false, textColor: "#ffffff", backgroundColor: "#111827",
      backgroundOpacity: 82, accentColor: "#38bdf8", accentStyle: "none", shadow: "soft", borderRadius: 120,
      paddingY: 12, paddingX: 40, widgetWidth: 640, fullWidth: false, logoScale: 130, blur: 0, logoStyle: "chip",
    },
  },
  {
    id: "neon",
    label: "Néon",
    description: "Contour lumineux sur fond sombre.",
    values: {
      fontSize: 30, fontWeight: "black", uppercase: true, textColor: "#f5d0fe", backgroundColor: "#12001f",
      backgroundOpacity: 85, accentColor: "#d946ef", accentStyle: "outline", shadow: "glow", borderRadius: 14,
      paddingY: 18, paddingX: 32, widgetWidth: 760, fullWidth: false, logoScale: 120, blur: 0, logoStyle: "plain",
    },
  },
  {
    id: "verre",
    label: "Verre",
    description: "Fond clair très transparent.",
    values: {
      fontSize: 28, fontWeight: "bold", uppercase: false, textColor: "#ffffff", backgroundColor: "#ffffff",
      backgroundOpacity: 14, accentColor: "#ffffff", accentStyle: "outline", shadow: "soft", borderRadius: 24,
      paddingY: 18, paddingX: 34, widgetWidth: 760, fullWidth: false, logoScale: 125, blur: 18, logoStyle: "chip",
    },
  },
  {
    id: "epure",
    label: "Épuré",
    description: "Texte seul, souligné d'un trait fin.",
    values: {
      fontSize: 28, fontWeight: "bold", uppercase: false, textColor: "#ffffff", backgroundColor: "#000000",
      backgroundOpacity: 0, accentColor: "#ffffff", accentStyle: "bottom", shadow: "none", borderRadius: 0,
      paddingY: 10, paddingX: 8, widgetWidth: 720, fullWidth: false, logoScale: 120, blur: 0, logoStyle: "plain",
    },
  },
];

/** Un message vide, sans design propre. */
export function newInfoBannerMessage(text = ""): InfoBannerMessage {
  return { text, icon: "", textColor: null, backgroundColor: null, backgroundOpacity: null, accentColor: null };
}

/** Design d'un message aux couleurs d'une plateforme (logo, fond de marque, texte lisible) ; null si la plateforme est inconnue. */
export function brandMessageStyle(
  brandId: string
): Pick<InfoBannerMessage, "icon" | "textColor" | "backgroundColor" | "backgroundOpacity" | "accentColor"> | null {
  const brand = findBrand(brandId);
  if (!brand) return null;
  const readable = readableTextColor(brand.color);
  return {
    icon: brand.id,
    backgroundColor: brand.color,
    backgroundOpacity: 100,
    textColor: readable,
    accentColor: readable,
  };
}

export function messageFromBrand(text: string, brandId: string): InfoBannerMessage {
  return { ...newInfoBannerMessage(text), ...(brandMessageStyle(brandId) ?? {}) };
}

/** Messages d'exemple : mode test du widget quand le streamer n'a encore rien écrit. */
export const INFO_BANNER_SAMPLE_MESSAGES: InfoBannerMessage[] = [
  messageFromBrand("Rejoins la communauté sur Discord", "discord"),
  newInfoBannerMessage("Tape !song pour voir la musique en cours"),
  messageFromBrand("Abonne-toi sur YouTube", "youtube"),
  messageFromBrand("Suis-moi sur TikTok : @tonpseudo", "tiktok"),
];

const HEX = /^#[0-9a-fA-F]{6}$/;
const LOGO_ID = /^[a-z0-9]{4,16}$/;
// Image réduite par le navigateur : PNG, JPEG ou WebP uniquement (jamais de SVG, qui peut embarquer des références externes).
const LOGO_DATA_URI = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(value as string) ? (value as T) : fallback;

const color = (value: unknown, fallback: string) =>
  typeof value === "string" && HEX.test(value) ? value.toLowerCase() : fallback;

const colorOrNull = (value: unknown): string | null =>
  typeof value === "string" && HEX.test(value) ? value.toLowerCase() : null;

/** Texte brut sur une ligne : caractères de contrôle et espaces multiples remplacés, longueur bornée. */
const cleanText = (value: unknown, max: number) =>
  typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
    : "";

function sanitizeCustomLogos(input: unknown): InfoBannerCustomLogo[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const logos: InfoBannerCustomLogo[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const id = typeof r.id === "string" && LOGO_ID.test(r.id) ? r.id : null;
    const dataUri =
      typeof r.dataUri === "string" && r.dataUri.length <= INFO_BANNER_LOGO_MAX_CHARS && LOGO_DATA_URI.test(r.dataUri)
        ? r.dataUri
        : null;
    if (!id || !dataUri || seen.has(id)) continue;
    seen.add(id);
    logos.push({ id, name: cleanText(r.name, LOGO_NAME_MAX) || "Logo", dataUri });
    if (logos.length >= INFO_BANNER_MAX_CUSTOM_LOGOS) break;
  }
  return logos;
}

function sanitizeMessage(raw: unknown, logoIds: Set<string>): InfoBannerMessage | null {
  // Ancien format : un message était une simple chaîne de caractères.
  const r: Record<string, unknown> | null =
    typeof raw === "string" ? { text: raw } : raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!r) return null;

  const text = cleanText(r.text, INFO_BANNER_MAX_LENGTH);
  if (!text) return null;

  const icon = typeof r.icon === "string" ? r.icon : "";
  const validIcon =
    findBrand(icon) || (icon.startsWith("custom:") && logoIds.has(icon.slice("custom:".length))) ? icon : "";

  return {
    text,
    icon: validIcon,
    textColor: colorOrNull(r.textColor),
    backgroundColor: colorOrNull(r.backgroundColor),
    backgroundOpacity:
      r.backgroundOpacity === null || r.backgroundOpacity === undefined || !Number.isFinite(Number(r.backgroundOpacity))
        ? null
        : clampInt(r.backgroundOpacity, 0, 100, 100),
    accentColor: colorOrNull(r.accentColor),
  };
}

/**
 * Valide et complète des réglages (venant du navigateur ou de la base). Toute valeur absente ou hors bornes retombe
 * sur la valeur par défaut ; les messages sont nettoyés (texte brut, une ligne, 140 caractères, 10 au maximum) ;
 * un logo inconnu ou supprimé est retiré du message qui l'utilisait.
 */
export function sanitizeInfoBanner(input: unknown): InfoBannerSettings {
  const r = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const d = DEFAULT_INFO_BANNER;
  const L = INFO_BANNER_LIMITS;

  const customLogos = sanitizeCustomLogos(r.customLogos);
  const logoIds = new Set(customLogos.map((l) => l.id));

  const messages = (Array.isArray(r.messages) ? r.messages : [])
    .map((m) => sanitizeMessage(m, logoIds))
    .filter((m): m is InfoBannerMessage => m !== null)
    .slice(0, INFO_BANNER_MAX_MESSAGES);

  // Ancien réglage : une case « barre d'accent à gauche » (showAccent) a été remplacée par le choix du style d'accent.
  const legacyAccent: InfoBannerAccent = typeof r.showAccent === "boolean" ? (r.showAccent ? "left" : "none") : d.accentStyle;

  return {
    messages,
    customLogos,
    intervalSeconds: clampInt(r.intervalSeconds, L.intervalSeconds.min, L.intervalSeconds.max, d.intervalSeconds),
    shuffle: typeof r.shuffle === "boolean" ? r.shuffle : d.shuffle,
    fontFamily: isValidFontId(r.fontFamily) ? r.fontFamily : d.fontFamily,
    fontSize: clampInt(r.fontSize, L.fontSize.min, L.fontSize.max, d.fontSize),
    fontWeight: pick(r.fontWeight, INFO_BANNER_WEIGHTS, d.fontWeight),
    uppercase: typeof r.uppercase === "boolean" ? r.uppercase : d.uppercase,
    textColor: color(r.textColor, d.textColor),
    backgroundColor: color(r.backgroundColor, d.backgroundColor),
    backgroundOpacity: clampInt(r.backgroundOpacity, 0, 100, d.backgroundOpacity),
    accentColor: color(r.accentColor, d.accentColor),
    accentStyle: pick(r.accentStyle, INFO_BANNER_ACCENTS, legacyAccent),
    shadow: pick(r.shadow, INFO_BANNER_SHADOWS, d.shadow),
    borderRadius: clampInt(r.borderRadius, L.borderRadius.min, L.borderRadius.max, d.borderRadius),
    paddingY: clampInt(r.paddingY, L.paddingY.min, L.paddingY.max, d.paddingY),
    paddingX: clampInt(r.paddingX, L.paddingX.min, L.paddingX.max, d.paddingX),
    align: pick(r.align, INFO_BANNER_ALIGNS, d.align),
    widgetWidth: clampInt(r.widgetWidth, L.widgetWidth.min, L.widgetWidth.max, d.widgetWidth),
    fullWidth: typeof r.fullWidth === "boolean" ? r.fullWidth : d.fullWidth,
    logoScale: clampInt(r.logoScale, L.logoScale.min, L.logoScale.max, d.logoScale),
    logoPosition: pick(r.logoPosition, INFO_BANNER_LOGO_POSITIONS, d.logoPosition),
    logoStyle: pick(r.logoStyle, INFO_BANNER_LOGO_STYLES, d.logoStyle),
    blur: clampInt(r.blur, L.blur.min, L.blur.max, d.blur),
    showProgress: typeof r.showProgress === "boolean" ? r.showProgress : d.showProgress,
    animationStyle: pick(r.animationStyle, INFO_BANNER_ANIMATIONS, d.animationStyle),
    animationSpeed: pick(r.animationSpeed, INFO_BANNER_SPEEDS, d.animationSpeed),
  };
}

/** « #rrggbb » + opacité (0 à 1) → valeur CSS rgba(). */
export function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(HEX.test(hex) ? hex.slice(1) : "000000", 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.min(1, Math.max(0, alpha))})`;
}

/**
 * Taille conseillée de la source navigateur OBS pour ce bandeau (une ligne de texte, avec de la marge pour l'ombre) :
 * à agrandir en hauteur si les messages passent sur deux lignes.
 */
export function recommendedSourceSize(s: Pick<InfoBannerSettings, "fullWidth" | "widgetWidth" | "fontSize" | "paddingY">): {
  width: number;
  height: number;
} {
  return {
    width: s.fullWidth ? 1920 : s.widgetWidth + 80,
    height: Math.ceil(s.fontSize * 1.4 + s.paddingY * 2 + 64),
  };
}
