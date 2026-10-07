"use client";

import { useEffect, useRef, useState, CSSProperties } from "react";

// Aperçu statique du widget musique pour la page d'accueil : même design que le vrai widget
// (src/app/widget/[userId]/page.tsx, layout "default"), avec un morceau de démonstration fixe.
// Aucun appel réseau vers Twichify ni vraie donnée Spotify ici.

const ACCENT = "#a855f7";

const DEMO_TRACK = {
  title: "Blinding Lights",
  artist: "The Weeknd",
  // Pochette officielle servie par le CDN de Spotify (même source que le vrai widget).
  albumImageUrl: "https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36",
  durationMs: 200_000, // 3:20
};

function Equalizer({ color }: { color: string }) {
  return (
    <span className="inline-flex h-3 items-end gap-[2px]" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="eq-bar"
          style={{
            backgroundColor: color,
            animationDelay: `${i * 0.13}s`,
            animationDuration: `${0.7 + i * 0.11}s`,
          }}
        />
      ))}
    </span>
  );
}

/** Texte qui défile uniquement s'il dépasse de son conteneur (comme dans le vrai widget). */
function MarqueeText({ text, className = "", speed = 32 }: { text: string; className?: string; speed?: number }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [dist, setDist] = useState(0);

  useEffect(() => {
    const measure = () => {
      const box = boxRef.current;
      const el = textRef.current;
      if (!box || !el) return;
      setDist(Math.max(0, Math.ceil(el.scrollWidth - box.clientWidth)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (boxRef.current) ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, [text]);

  const scrolling = dist > 2;
  const duration = Math.min(14, Math.max(4, dist / speed + 3));

  return (
    <div ref={boxRef} className="w-full overflow-hidden whitespace-nowrap">
      <span
        ref={textRef}
        className={`inline-block ${className}`}
        style={
          scrolling
            ? ({ "--marquee-dist": `${dist}px`, animation: `marquee-x ${duration}s ease-in-out infinite alternate` } as CSSProperties)
            : undefined
        }
      >
        {text}
      </span>
    </div>
  );
}

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export default function MusicWidgetPreview() {
  // Progression simulée : avance toute seule pour que l'aperçu paraisse vivant.
  const [progressMs, setProgressMs] = useState(92_000);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgressMs((p) => (p + 1000 >= DEMO_TRACK.durationMs ? 0 : p + 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const progressPct = (progressMs / DEMO_TRACK.durationMs) * 100;

  return (
    <div className="relative font-sans" style={{ width: "min(380px, 100%)" }}>
      <style jsx global>{`
        @keyframes marquee-x {
          0%, 15% { transform: translateX(0); }
          85%, 100% { transform: translateX(calc(-1 * var(--marquee-dist, 0px))); }
        }
        @keyframes eq-bounce {
          0%, 100% { transform: scaleY(0.25); }
          50% { transform: scaleY(1); }
        }
        .eq-bar {
          display: inline-block;
          width: 3px;
          height: 100%;
          border-radius: 2px;
          transform-origin: bottom;
          animation: eq-bounce 0.9s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .eq-bar { animation: none; transform: scaleY(0.6); }
        }
      `}</style>

      {/* LA CARTE (mêmes styles que le vrai widget, layout "default") */}
      <div
        className="relative flex items-center overflow-hidden"
        style={{
          height: 100,
          backgroundColor: "rgba(15, 17, 23, 0.6)",
          borderRadius: "15px",
          boxShadow: `0 20px 50px -10px ${ACCENT}55`,
          border: "1px solid rgba(255,255,255,0.08)",
          paddingLeft: "85px",
        }}
      >
        <div className="absolute inset-0 z-0 overflow-hidden" style={{ borderRadius: "15px" }}>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${DEMO_TRACK.albumImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(10px) brightness(0.4)",
              transform: "scale(1.3)",
              opacity: 0.6,
            }}
          />
        </div>

        <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-center p-4">
          <MarqueeText text={DEMO_TRACK.artist} className="mb-0.5 text-[10px] font-black uppercase italic tracking-[0.25em] text-white/50" />
          <MarqueeText text={DEMO_TRACK.title} className="text-base font-black uppercase italic leading-tight tracking-tighter text-white" />

          <div className="mt-2.5 w-full space-y-1.5">
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full"
                style={{
                  backgroundColor: ACCENT,
                  width: `${progressPct}%`,
                  boxShadow: `0 0 8px ${ACCENT}`,
                  transition: "width 1s linear",
                }}
              />
            </div>
            <div className="grid grid-cols-3 items-center font-mono text-[8px] font-bold italic text-white/40">
              <span className="justify-self-start">{formatTime(progressMs)}</span>
              <span className="justify-self-center">
                <Equalizer color={ACCENT} />
              </span>
              <span className="justify-self-end">{formatTime(DEMO_TRACK.durationMs)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* LA COVER : centrée à 15px du bord gauche de la carte, elle déborde comme dans le vrai widget */}
      <img
        src={DEMO_TRACK.albumImageUrl}
        alt="Pochette de Blinding Lights (aperçu)"
        className="absolute z-30 h-28 w-28 border-2 border-white/10 object-cover"
        style={{
          left: 15,
          top: "50%",
          transform: "translate(-50%, -50%)",
          borderRadius: "15px",
          boxShadow: "0 18px 35px rgba(0,0,0,0.7)",
        }}
      />
    </div>
  );
}
