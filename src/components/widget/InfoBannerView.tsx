"use client";

import { useEffect, useState } from "react";
import {
  WIDGET_ENTRY_KEYFRAMES,
  entryAnimation,
  exitAnimation,
  exitDurationMs,
  speedFactorOf,
} from "@/lib/widget-animation";
import { resolveFont, ensureStylesheet } from "@/lib/widget-fonts";
import { findBrand } from "@/lib/info-banner-icons";
import {
  hexToRgba,
  type InfoBannerCustomLogo,
  type InfoBannerMessage,
  type InfoBannerSettings,
} from "@/lib/info-banner";

// Affichage du bandeau d'informations, partagé par le widget OBS et l'aperçu du dashboard : les deux utilisent exactement
// le même code, donc le même rendu et les mêmes animations (celles de lib/widget-animation).

function nextIndex(current: number, length: number, shuffle: boolean): number {
  if (length < 2) return 0;
  if (!shuffle) return (current + 1) % length;
  // Ordre aléatoire, sans répéter le message qui vient de s'afficher.
  let next = current;
  while (next === current) next = Math.floor(Math.random() * length);
  return next;
}

const JUSTIFY = { left: "flex-start", center: "center", right: "flex-end" } as const;
const WEIGHT = { normal: 500, bold: 700, black: 900 } as const;

/** Logo d'un message : tracé de plateforme (aux couleurs du texte) ou image personnalisée. */
export function MessageIcon({
  icon,
  logos,
  size,
}: {
  icon: string;
  logos: InfoBannerCustomLogo[];
  size: number;
}) {
  if (!icon) return null;

  if (icon.startsWith("custom:")) {
    const logo = logos.find((l) => `custom:${l.id}` === icon);
    return logo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo.dataUri} alt="" style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} />
    ) : null;
  }

  const brand = findBrand(icon);
  return brand ? (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={brand.path} />
    </svg>
  ) : null;
}

export default function InfoBannerView({
  settings,
  messages,
  emptyHint,
}: {
  settings: InfoBannerSettings;
  /** Remplace les messages des réglages (mode test, aperçu). */
  messages?: InfoBannerMessage[];
  /** Texte affiché quand il n'y a aucun message (aperçu du dashboard). Sans lui, le bandeau n'affiche rien. */
  emptyHint?: string;
}) {
  const list = messages ?? settings.messages;
  const [index, setIndex] = useState(0);
  const [exiting, setExiting] = useState(false);

  const factor = speedFactorOf(settings.animationSpeed);
  const font = resolveFont(settings.fontFamily);

  // Police Google : feuille de style chargée à la demande.
  useEffect(() => {
    if (font.href && font.family) ensureStylesheet(`wf-${font.family}`, font.href);
  }, [font.href, font.family]);

  // Chaque message reste affiché `intervalSeconds`, puis sort avec son animation, puis le suivant entre.
  useEffect(() => {
    if (list.length < 2 || exiting) return;
    const timer = setTimeout(() => setExiting(true), settings.intervalSeconds * 1000);
    return () => clearTimeout(timer);
  }, [index, exiting, list.length, settings.intervalSeconds]);

  useEffect(() => {
    if (!exiting) return;
    const timer = setTimeout(() => {
      setIndex((i) => nextIndex(i, list.length, settings.shuffle));
      setExiting(false);
    }, exitDurationMs(settings.animationStyle, factor));
    return () => clearTimeout(timer);
  }, [exiting, list.length, settings.shuffle, settings.animationStyle, factor]);

  // Si la liste raccourcit pendant l'affichage, on reste dans ses bornes.
  const current = list.length > 0 ? list[index % list.length] : null;
  if (!current && !emptyHint) return null;

  // Design du message affiché : ses couleurs propres, sinon celles du bandeau.
  const textColor = current?.textColor ?? settings.textColor;
  const backgroundColor = current?.backgroundColor ?? settings.backgroundColor;
  const backgroundOpacity = current?.backgroundOpacity ?? settings.backgroundOpacity;
  const accentColor = current?.accentColor ?? settings.accentColor;

  // Accent : épaisseur proportionnelle à la taille du texte, pour rester harmonieux d'un petit à un très grand bandeau.
  const accentThickness = Math.min(16, Math.max(4, Math.round(settings.fontSize * 0.22)));
  const outlineThickness = Math.min(8, Math.max(2, Math.round(settings.fontSize * 0.1)));
  const accentStyle: React.CSSProperties =
    settings.accentStyle === "left"
      ? { borderLeft: `${accentThickness}px solid ${accentColor}` }
      : settings.accentStyle === "bottom"
        ? { borderBottom: `${accentThickness}px solid ${accentColor}` }
        : settings.accentStyle === "outline"
          ? { border: `${outlineThickness}px solid ${accentColor}` }
          : {};

  // Ombre : doux dégradé à deux couches, ou lueur aux couleurs de l'accent. Un fin reflet en haut donne du relief au fond.
  const shadows: string[] = [];
  if (settings.shadow === "soft") shadows.push("0 10px 30px rgba(0, 0, 0, 0.35)", "0 2px 6px rgba(0, 0, 0, 0.25)");
  if (settings.shadow === "glow") shadows.push(`0 0 28px ${hexToRgba(accentColor, 0.55)}`, `0 0 6px ${hexToRgba(accentColor, 0.8)}`);
  if (backgroundOpacity >= 20) shadows.push("inset 0 1px 0 rgba(255, 255, 255, 0.12)");
  const boxShadow = shadows.length > 0 ? shadows.join(", ") : undefined;

  // Verre dépoli : flou et légère saturation de ce qui est derrière le bandeau.
  const backdropFilter = settings.blur > 0 ? `blur(${settings.blur}px) saturate(140%)` : undefined;

  // Sur un fond (presque) transparent, une ombre portée garde le texte lisible sur n'importe quelle scène.
  const textShadow = backgroundOpacity < 35 ? "0 2px 12px rgba(0, 0, 0, 0.55)" : undefined;

  const iconSize = Math.round((settings.fontSize * settings.logoScale) / 100);

  return (
    // Marge autour du bandeau : elle laisse la place à l'ombre et à la lueur, qui sinon seraient coupées par la source OBS.
    <div
      className={font.className}
      style={{ width: "100%", display: "flex", justifyContent: "center", padding: 28, boxSizing: "border-box", fontFamily: font.fontFamily }}
    >
      <style>{`${WIDGET_ENTRY_KEYFRAMES}\n@keyframes ib-progress { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
      {/* Le design (fond, couleurs, logo) est porté par l'élément animé : il change et s'anime avec le message. */}
      <div
        key={current ? `${index}-${current.text}-${current.icon}` : "hint"}
        style={{
          width: settings.fullWidth ? "100%" : `min(${settings.widgetWidth}px, 100%)`,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: settings.logoPosition === "right" ? "row-reverse" : "row",
          alignItems: "center",
          justifyContent: JUSTIFY[settings.align],
          gap: "0.65em",
          position: "relative",
          overflow: "hidden",
          padding: `${settings.paddingY}px ${settings.paddingX}px`,
          backgroundColor: hexToRgba(backgroundColor, backgroundOpacity / 100),
          color: textColor,
          borderRadius: `${settings.borderRadius}px`,
          fontSize: `${settings.fontSize}px`,
          textAlign: settings.align,
          boxShadow,
          backdropFilter,
          WebkitBackdropFilter: backdropFilter,
          ...accentStyle,
          animation: exiting
            ? exitAnimation(settings.animationStyle, factor)
            : entryAnimation(settings.animationStyle, factor),
        }}
      >
        {current ? (
          <>
            {settings.logoStyle === "chip" && current.icon ? (
              // Pastille ronde : sa taille suit le réglage de taille du logo, le logo y est plus petit.
              <span
                aria-hidden="true"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  width: iconSize,
                  height: iconSize,
                  borderRadius: "50%",
                  backgroundColor: hexToRgba(textColor, 0.16),
                  boxShadow: `inset 0 0 0 1px ${hexToRgba(textColor, 0.22)}`,
                }}
              >
                <MessageIcon icon={current.icon} logos={settings.customLogos} size={Math.round(iconSize * 0.58)} />
              </span>
            ) : (
              <MessageIcon icon={current.icon} logos={settings.customLogos} size={iconSize} />
            )}
            <p
              className="m-0 min-w-0 break-words leading-snug"
              style={{
                fontWeight: WEIGHT[settings.fontWeight],
                textTransform: settings.uppercase ? "uppercase" : "none",
                letterSpacing: settings.uppercase ? "0.04em" : undefined,
                textShadow,
              }}
            >
              {current.text}
            </p>
          </>
        ) : (
          <p className="m-0 leading-snug opacity-60">{emptyHint}</p>
        )}
        {/* Barre de progression : se vide pendant `intervalSeconds`, redémarre avec chaque message. */}
        {settings.showProgress && current && list.length > 1 && !exiting && (
          <span
            key={`progress-${index}`}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 3,
              backgroundColor: accentColor,
              opacity: 0.9,
              transformOrigin: "left center",
              animation: `ib-progress ${settings.intervalSeconds}s linear forwards`,
            }}
          />
        )}
      </div>
    </div>
  );
}
