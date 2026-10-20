"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { usePresence } from "framer-motion";

/**
 * Conteneur de widget : joue l'animation d'entrée CSS à l'apparition et l'animation de sortie CSS quand AnimatePresence
 * le retire (usePresence retient le retrait le temps que la sortie se joue). Animations : lib/widget-animation.
 *
 * `children` reçoit isPresent pour que la carte et la pochette puissent avoir leur propre animation (style "reveal").
 */
export default function PresenceShell({
  children,
  className,
  style,
  enterAnimation,
  exitAnimation,
  exitMs,
}: {
  children: (isPresent: boolean) => ReactNode;
  className?: string;
  style?: CSSProperties;
  enterAnimation?: string;
  exitAnimation?: string;
  exitMs: number;
}) {
  const [isPresent, safeToRemove] = usePresence();

  useEffect(() => {
    if (isPresent) return;
    const t = setTimeout(() => safeToRemove?.(), exitMs);
    return () => clearTimeout(t);
  }, [isPresent]);

  return (
    <div className={className} style={{ ...style, animation: isPresent ? enterAnimation : exitAnimation }}>
      {children(isPresent)}
    </div>
  );
}
