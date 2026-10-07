"use client";

import { useEffect, useRef, useState } from "react";

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

export default function CanvasScaler({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      const scaleX = window.innerWidth / CANVAS_WIDTH;
      const scaleY = window.innerHeight / CANVAS_HEIGHT;
      // On prend le plus petit ratio pour que tout le canvas reste visible (letterbox),
      // ou Math.max si on préfère que ça remplisse tout l'écran (crop)
      setScale(Math.min(scaleX, scaleY));
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-transparent">
      <div
        ref={wrapperRef}
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
}