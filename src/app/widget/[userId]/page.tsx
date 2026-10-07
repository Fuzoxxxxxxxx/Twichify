"use client";
import { useEffect, useRef, useState, CSSProperties } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// Mode compact ("minimal") : carte verticale avec pochette qui déborde en haut.
const COMPACT_WIDTH = 232;
const COVER_COMPACT = 96;

// Le widget interroge l'API toutes les POLL_INTERVAL_MS ; la position du morceau est extrapolée entre deux polls.
const POLL_INTERVAL_MS = 1000;
// En cas d'erreur temporaire (réseau, limite Spotify), le dernier morceau reste affiché pendant ce délai.
const ERROR_GRACE_MS = 20000;

/** Égaliseur animé (4 barres). */
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

/**
 * Texte qui défile uniquement s'il dépasse de son conteneur.
 * La distance de défilement est mesurée : le texte s'arrête pile sur sa dernière lettre.
 */
function MarqueeText({
  text,
  className = "",
  center = false,
  speed = 32,
}: {
  text: string;
  className?: string;
  center?: boolean;
  speed?: number; // px/s
}) {
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
    <div ref={boxRef} className={`w-full overflow-hidden whitespace-nowrap ${center ? "text-center" : ""}`}>
      <span
        ref={textRef}
        className={`inline-block ${className}`}
        style={
          scrolling
            ? ({
                "--marquee-dist": `${dist}px`,
                animation: `marquee-x ${duration}s ease-in-out infinite alternate`,
              } as CSSProperties)
            : undefined
        }
      >
        {text}
      </span>
    </div>
  );
}

export default function SpotifyWidget() {
  const params = useParams();
  const userId = params?.userId;
  const [track, setTrack] = useState<any>(null);
  const [autoHidden, setAutoHidden] = useState(false);

  const [progressMs, setProgressMs] = useState(0);
  const syncRef = useRef<{ progressMs: number; at: number } | null>(null);
  const failingSinceRef = useRef<number | null>(null);

  // Erreur temporaire (réseau, limite Spotify...) : on garde le dernier morceau affiché pendant
  // ERROR_GRACE_MS au lieu de faire disparaître le widget à la moindre coupure.
  const handleFailure = () => {
    const now = Date.now();
    if (failingSinceRef.current === null) failingSinceRef.current = now;
    if (now - failingSinceRef.current >= ERROR_GRACE_MS) {
      setTrack(null);
      syncRef.current = null;
    }
  };

  const fetchTrack = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/spotify/now-playing/${userId}`, { cache: "no-store" });
      if (!res.ok) {
        handleFailure();
        return;
      }
      const data = await res.json();
      if (data?.error) {
        handleFailure();
        return;
      }
      failingSinceRef.current = null;
      if (!data || data.isPlaying === false) {
        setTrack(null);
        syncRef.current = null;
      } else {
        setTrack(data);
        syncRef.current = { progressMs: data.progressMs ?? 0, at: Date.now() };
        setProgressMs(data.progressMs ?? 0);
      }
    } catch {
      handleFailure();
    }
  };

  useEffect(() => {
    if (userId) {
      fetchTrack();
      const interval = setInterval(fetchTrack, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }
  }, [userId]);

  const s = track?.settings || {};
  const settings = {
    layout: s.layout || "default",
    fontFamily: s.fontFamily || "font-sans",
    showCover: s.showCover !== false,
    showProgress: s.showProgress !== false,
    showTimestamp: s.showTimestamp !== false,
    showArtist: s.showArtist !== false,
    isRotating: !!s.isRotating,
    enableGlow: s.enableGlow !== false,
    enableBlurBg: s.enableBlurBg !== false,
    blurAmount: s.blurAmount || "10",
    accentColor: s.accentColor || "#22c55e",
    borderRadius: s.borderRadius || "15",
    bgOpacity: s.bgOpacity || "60",
    showEqualizer: !!s.showEqualizer,
    autoHide: !!s.autoHide,
    autoHideSeconds: Math.max(3, Number(s.autoHideSeconds) || 10),
  };

  // Progression : entre deux polls, la position est extrapolée côté widget (chaque poll la recale).
  const durationMs = track?.durationMs;
  useEffect(() => {
    if (!durationMs) return;
    const tick = setInterval(() => {
      const sync = syncRef.current;
      if (!sync) return;
      setProgressMs(Math.min(durationMs, sync.progressMs + (Date.now() - sync.at)));
    }, 1000);
    return () => clearInterval(tick);
  }, [durationMs]);

  // Masquage automatique : le widget ne s'affiche que quelques secondes à chaque nouveau morceau
  const trackKey = track ? `${track.title}|${track.artist}` : "";
  useEffect(() => {
    setAutoHidden(false);
    if (!settings.autoHide || !trackKey) return;
    const t = setTimeout(() => setAutoHidden(true), settings.autoHideSeconds * 1000);
    return () => clearTimeout(t);
  }, [trackKey, settings.autoHide, settings.autoHideSeconds]);

  const accent = settings.accentColor;

  const isMinimal = settings.layout === "minimal";
  const cardWidth = isMinimal ? COMPACT_WIDTH : 380;
  const hasCoverOverhang = isMinimal && settings.showCover;

  const cardTransition: any = { type: "spring", stiffness: 90, damping: 18, mass: 1.1 };
  const coverTransition: any = { type: "spring", stiffness: 110, damping: 14, mass: 0.9, delay: 0.35 };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPct = track?.durationMs
    ? Math.min(100, Math.max(0, (progressMs / track.durationMs) * 100))
    : 0;
  const showTimes = settings.showProgress && settings.showTimestamp;

  // Barre de progression + temps + égaliseur (commun aux deux layouts)
  const footer =
    settings.showProgress || settings.showEqualizer ? (
      <div className={`${isMinimal ? "mt-3.5" : "mt-2.5"} w-full space-y-1.5`}>
        {settings.showProgress && (
          <div className={`w-full overflow-hidden rounded-full bg-white/10 ${isMinimal ? "h-1.5" : "h-1"}`}>
            <div
              className="h-full"
              style={{
                backgroundColor: accent,
                width: `${progressPct}%`,
                boxShadow: `0 0 8px ${accent}`,
                transition: "width 1s linear, background-color 0.8s ease, box-shadow 0.8s ease",
              }}
            />
          </div>
        )}
        {(showTimes || settings.showEqualizer) && (
          <div className="grid grid-cols-3 items-center font-mono text-[8px] font-bold italic text-white/40">
            <span className="justify-self-start">{showTimes ? formatTime(progressMs) : ""}</span>
            <span className="justify-self-center">{settings.showEqualizer && <Equalizer color={accent} />}</span>
            <span className="justify-self-end">{showTimes ? formatTime(track?.durationMs ?? 0) : ""}</span>
          </div>
        )}
      </div>
    ) : null;

  return (
    <div className={`flex items-center justify-center min-h-screen bg-transparent ${settings.fontFamily}`}>
      <AnimatePresence mode="wait">
        {track && track.isPlaying && !autoHidden && (
          <motion.div
            key="spotify-static-container"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0, transition: { duration: 0.5, ease: [0.4, 0, 1, 1] } }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex items-center justify-center"
            style={{ marginTop: hasCoverOverhang ? COVER_COMPACT / 2 : 0 }}
          >
            {/* LA CARTE */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: cardWidth, opacity: 1 }}
              exit={{
                width: 0,
                opacity: 0,
                filter: "blur(6px)",
                transition: { duration: 0.55, ease: [0.4, 0, 1, 1], delay: 0.15 },
              }}
              transition={cardTransition}
              className={`relative flex items-center overflow-hidden ${isMinimal ? "justify-center" : ""}`}
              style={{
                height: isMinimal ? "auto" : "100px",
                backgroundColor: `rgba(15, 17, 23, ${parseInt(settings.bgOpacity) / 100})`,
                borderRadius: `${settings.borderRadius}px`,
                boxShadow: settings.enableGlow ? `0 20px 50px -10px ${accent}55` : "none",
                border: "1px solid rgba(255,255,255,0.08)",
                paddingLeft: isMinimal ? "0" : "85px",
                paddingTop: hasCoverOverhang ? COVER_COMPACT / 2 + 12 : 0,
              }}
            >
              {settings.enableBlurBg && (
                <div className="absolute inset-0 z-0 overflow-hidden" style={{ borderRadius: `${settings.borderRadius}px` }}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="absolute inset-0 transition-all duration-1000"
                    style={{
                      backgroundImage: `url(${track.albumImageUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      filter: `blur(${settings.blurAmount}px) brightness(0.4)`,
                      transform: "scale(1.3)",
                    }}
                  />
                </div>
              )}

              {/* Fine lueur d'accent en haut de la carte compacte */}
              {isMinimal && (
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, opacity: 0.6 }}
                />
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.25 } }}
                transition={{ delay: 0.55, duration: 0.5, ease: "easeOut" }}
                className={
                  isMinimal
                    ? `relative z-10 flex shrink-0 flex-col items-center px-5 pb-5 text-center ${hasCoverOverhang ? "pt-1" : "pt-5"}`
                    : "relative z-10 flex-1 p-4 min-w-0 flex flex-col justify-center"
                }
                style={isMinimal ? { width: COMPACT_WIDTH } : undefined}
              >
                {settings.showArtist && (
                  <MarqueeText
                    text={track.artist || ""}
                    center={isMinimal}
                    className="mb-0.5 text-[10px] font-black uppercase italic tracking-[0.25em] text-white/50"
                  />
                )}

                <MarqueeText
                  text={track.title || ""}
                  center={isMinimal}
                  speed={isMinimal ? 28 : 32}
                  className={`font-black uppercase italic leading-tight tracking-tighter text-white ${isMinimal ? "text-[15px]" : "text-base"}`}
                />

                {footer}
              </motion.div>
            </motion.div>

            {/* LA COVER */}
            {settings.showCover && (
              <motion.div
                initial={{ scale: 0, x: 0, opacity: 0, rotate: -10 }}
                animate={{
                  scale: 1,
                  x: isMinimal ? 0 : -(cardWidth / 2) + 15,
                  opacity: 1,
                  rotate: 0,
                }}
                exit={{
                  scale: 0.3,
                  x: 0,
                  opacity: 0,
                  rotate: 10,
                  filter: "blur(8px)",
                  transition: { duration: 0.4, ease: [0.4, 0, 1, 1] },
                }}
                transition={coverTransition}
                className="absolute z-30"
                style={isMinimal ? { top: -COVER_COMPACT / 2 } : undefined}
              >
                <img
                  src={track.albumImageUrl}
                  className={`${isMinimal ? "" : "w-28 h-28"} object-cover border-2 border-white/10`}
                  style={{
                    ...(isMinimal && { width: COVER_COMPACT, height: COVER_COMPACT }),
                    borderRadius: settings.isRotating ? "999px" : `${Math.max(8, parseInt(settings.borderRadius))}px`,
                    animation: settings.isRotating ? "spin-slow 12s linear infinite" : "none",
                    boxShadow: isMinimal
                      ? `0 0 0 4px rgba(10, 12, 18, 0.9), 0 16px 32px rgba(0,0,0,0.65)${
                          settings.enableGlow ? `, 0 0 28px ${accent}66` : ""
                        }`
                      : "0 18px 35px rgba(0,0,0,0.7)",
                  }}
                  alt="Cover"
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
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
          transition: background-color 0.8s ease;
        }
        body { background: transparent !important; overflow: hidden; margin: 0; }
      `}</style>
    </div>
  );
}
