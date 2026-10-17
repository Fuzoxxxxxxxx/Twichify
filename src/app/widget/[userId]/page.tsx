"use client";
import { useEffect, useRef, useState, CSSProperties } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence, usePresence } from "framer-motion";
import {
  ANIMATION_STYLES,
  ANIMATION_SPEEDS,
  WIDGET_ENTRY_KEYFRAMES,
  entryAnimation,
  exitAnimation,
  exitDurationMs,
  revealCoverAnimation,
  revealCoverExitAnimation,
  speedFactorOf,
  type AnimationStyle,
  type AnimationSpeed,
} from "@/lib/widget-animation";
import { resolveFont, ensureStylesheet } from "@/lib/widget-fonts";

// Mode compact ("minimal") : carte verticale avec pochette qui déborde en haut.
const COMPACT_WIDTH = 232;
const COVER_COMPACT = 96;

// Le widget interroge l'API toutes les POLL_INTERVAL_MS ; la position du morceau est extrapolée entre deux polls.
const POLL_INTERVAL_MS = 1000;
// En cas d'erreur temporaire (réseau, limite Spotify), le dernier morceau reste affiché pendant ce délai.
const ERROR_GRACE_MS = 20000;

// ── MODE TEST (?test=1) ──
// Scénario factice en boucle, joué avec les vrais réglages du streamer : 3 morceaux de 10 s (le 2e a un titre très long pour
// tester le défilement), puis 4 s sans musique pour rejouer l'animation d'entrée. Aucun appel Spotify pour les morceaux.
const TEST_TRACKS = [
  { title: "Blinding Lights", artist: "The Weeknd", colors: ["#7c3aed", "#22c55e", "#ec4899"], startMs: 42000, durationMs: 200000 },
  {
    title: "Un titre vraiment très long pour tester le défilement du texte",
    artist: "Premier artiste, Deuxième artiste, Troisième artiste",
    colors: ["#0ea5e9", "#f59e0b", "#ef4444"],
    startMs: 95000,
    durationMs: 215000,
  },
  { title: "Titre court", artist: "Artiste", colors: ["#111827", "#a855f7", "#14b8a6"], startMs: 5000, durationMs: 180000 },
];
const TEST_TRACK_S = 10;
const TEST_GAP_S = 4;
const TEST_CYCLE_S = TEST_TRACKS.length * TEST_TRACK_S + TEST_GAP_S;

// Pochettes factices : SVG en base64 (pas de parenthèses ni d'apostrophes, donc utilisable dans url(...) sans guillemets).
const testCoverCache = new Map<string, string>();
function testCover(colors: string[]): string {
  const key = colors.join();
  let uri = testCoverCache.get(key);
  if (!uri) {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${colors[0]}"/>` +
      `<circle cx="72" cy="28" r="46" fill="${colors[1]}" opacity="0.75"/><circle cx="24" cy="82" r="36" fill="${colors[2]}" opacity="0.65"/></svg>`;
    uri = `data:image/svg+xml;base64,${btoa(svg)}`;
    testCoverCache.set(key, uri);
  }
  return uri;
}

function buildTestPayload(elapsedMs: number, settings: any): any {
  const cycle = (elapsedMs / 1000) % TEST_CYCLE_S;
  const index = Math.floor(cycle / TEST_TRACK_S);
  if (index >= TEST_TRACKS.length) return { isPlaying: false, settings: settings || {} };
  const t = TEST_TRACKS[index];
  const local = cycle - index * TEST_TRACK_S;
  return {
    isPlaying: true,
    title: t.title,
    artist: t.artist,
    albumImageUrl: testCover(t.colors),
    progressMs: t.startMs + local * 1000,
    durationMs: t.durationMs,
    source: "test",
    settings: settings || {},
  };
}

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
    // Une police Google qui finit de charger change la largeur du texte : on re-mesure.
    const onFontsLoaded = () => measure();
    document.fonts?.addEventListener?.("loadingdone", onFontsLoaded);
    return () => {
      ro.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", onFontsLoaded);
    };
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

/**
 * Conteneur du widget : joue l'animation d'entrée CSS à l'apparition et l'animation de sortie CSS quand AnimatePresence
 * le retire (usePresence retient le retrait le temps que la sortie se joue).
 * `children` reçoit isPresent pour que la carte et la pochette puissent avoir leur propre animation (style "reveal").
 */
function PresenceShell({
  children,
  className,
  style,
  enterAnimation,
  exitAnimation: exitAnim,
  exitMs,
}: {
  children: (isPresent: boolean) => React.ReactNode;
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
    <div className={className} style={{ ...style, animation: isPresent ? enterAnimation : exitAnim }}>
      {children(isPresent)}
    </div>
  );
}

export default function SpotifyWidget() {
  const params = useParams();
  const userId = params?.userId;
  const [track, setTrack] = useState<any>(null);
  const [autoHidden, setAutoHidden] = useState(false);

  // Mode test (?test=1) : null tant que l'URL n'est pas lue (évite un premier poll réel inutile).
  const [testMode, setTestMode] = useState<boolean | null>(null);
  const testSettingsRef = useRef<any>(null);
  const testStartRef = useRef(Date.now());
  useEffect(() => {
    setTestMode(new URLSearchParams(window.location.search).get("test") === "1");
  }, []);

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

    if (testMode) {
      const elapsed = Date.now() - testStartRef.current;
      const st = testSettingsRef.current;
      if (!st && elapsed < 3000) return; // laisse le temps de charger les réglages du streamer
      const data = buildTestPayload(elapsed, st);
      failingSinceRef.current = null;
      if (!data.isPlaying) {
        setTrack(null);
        syncRef.current = null;
        return;
      }
      setTrack(data);
      syncRef.current = { progressMs: data.progressMs ?? 0, at: Date.now() };
      setProgressMs(data.progressMs ?? 0);
      return;
    }
    try {
      // `?w=1` annonce un vrai chargement du widget (assistant d'installation du dashboard) ; le mode test ne l'envoie pas.
      const res = await fetch(`/api/spotify/now-playing/${userId}?w=1`, { cache: "no-store" });
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
    if (!userId || testMode === null) return;
    fetchTrack();
    const interval = setInterval(fetchTrack, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId, testMode]);

  // Mode test : on ne récupère que les réglages du streamer (renvoyés par la route now-playing, même à l'arrêt).
  useEffect(() => {
    if (!userId || !testMode) return;
    const loadSettings = async () => {
      try {
        const res = await fetch(`/api/spotify/now-playing/${userId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.settings) testSettingsRef.current = data.settings;
      } catch {}
    };
    loadSettings();
    const interval = setInterval(loadSettings, 5000);
    return () => clearInterval(interval);
  }, [userId, testMode]);

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
    animationStyle: ((ANIMATION_STYLES as readonly string[]).includes(s.animationStyle) ? s.animationStyle : "expand") as AnimationStyle,
    animationSpeed: (Object.prototype.hasOwnProperty.call(ANIMATION_SPEEDS, s.animationSpeed) ? s.animationSpeed : "normal") as AnimationSpeed,
    trackChangeAnimation: s.trackChangeAnimation !== false,
    glowPulse: !!s.glowPulse,
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

  // Police : classe Tailwind (polices système) ou police Google Fonts chargée à la demande.
  // Au premier affichage on attend (2 s max) qu'elle soit prête, pour ne pas voir le widget changer de police.
  const font = resolveFont(settings.fontFamily);
  const [fontLoadedOnce, setFontLoadedOnce] = useState(false);
  useEffect(() => {
    if (!font.href || !font.family) return;
    ensureStylesheet(`wf-${font.family}`, font.href);
    let cancelled = false;
    const timeout = new Promise((resolve) => setTimeout(resolve, 2000));
    Promise.race([document.fonts.load(`900 16px "${font.family}"`), timeout])
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFontLoadedOnce(true);
      });
    return () => {
      cancelled = true;
    };
  }, [font.href, font.family]);
  const fontReady = !font.href || fontLoadedOnce;

  const isMinimal = settings.layout === "minimal";
  const cardWidth = isMinimal ? COMPACT_WIDTH : 380;
  const hasCoverOverhang = isMinimal && settings.showCover;

  // ── Animation d'entrée : mêmes keyframes et mêmes durées que l'aperçu du dashboard (lib/widget-animation) ──
  const k = speedFactorOf(settings.animationSpeed);
  const entry = entryAnimation(settings.animationStyle, k);
  const exit = exitAnimation(settings.animationStyle, k);
  // "reveal" en mode horizontal : la carte (ouverture) et la pochette (glissement) ont chacune leur animation.
  // Dans tous les autres cas, l'animation s'applique à l'ensemble carte + pochette.
  const revealSplit = settings.animationStyle === "reveal" && !isMinimal;
  const coverX = isMinimal ? 0 : -(cardWidth / 2) + 15; // position finale de la pochette par rapport au centre
  const glowAnimation = settings.enableGlow && settings.glowPulse ? "glow-pulse 3.2s ease-in-out infinite" : undefined;
  // La carte porte l'animation du style "reveal" (entrée ou sortie) et la pulsation du néon ; sinon seule la pulsation.
  const cardAnimationFor = (isPresent: boolean) =>
    [revealSplit ? (isPresent ? entry : exit) : undefined, glowAnimation].filter(Boolean).join(", ") || undefined;

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
    <div
      className={`flex items-center justify-center min-h-screen bg-transparent ${font.className}`}
      style={font.fontFamily ? { fontFamily: font.fontFamily } : undefined}
    >
      <style>{WIDGET_ENTRY_KEYFRAMES}</style>
      {testMode && (
        <div className="fixed left-2 top-2 z-50 rounded bg-amber-500/90 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-widest text-black">
          Mode test
        </div>
      )}
      <AnimatePresence mode="wait">
        {track && track.isPlaying && !autoHidden && fontReady && (
          <PresenceShell
            key="spotify-static-container"
            exitMs={exitDurationMs(settings.animationStyle, k)}
            enterAnimation={revealSplit ? undefined : entry}
            exitAnimation={revealSplit ? undefined : exit}
            className="relative flex items-center justify-center"
            style={{ marginTop: hasCoverOverhang ? COVER_COMPACT / 2 : 0 }}
          >
            {(isPresent) => (
            <>
            {/* LA CARTE */}
            <div
              className={`relative flex items-center overflow-hidden ${isMinimal ? "justify-center" : ""}`}
              style={{
                width: cardWidth,
                height: isMinimal ? "auto" : "100px",
                backgroundColor: `rgba(15, 17, 23, ${parseInt(settings.bgOpacity) / 100})`,
                borderRadius: `${settings.borderRadius}px`,
                boxShadow: settings.enableGlow ? `0 20px 50px -10px ${accent}55` : "none",
                ...(settings.enableGlow &&
                  settings.glowPulse &&
                  ({
                    "--glow-lo": `0 20px 50px -10px ${accent}33`,
                    "--glow-hi": `0 20px 60px -6px ${accent}88`,
                  } as CSSProperties)),
                animation: cardAnimationFor(isPresent),
                border: "1px solid rgba(255,255,255,0.08)",
                paddingLeft: isMinimal ? "0" : "85px",
                paddingTop: hasCoverOverhang ? COVER_COMPACT / 2 + 12 : 0,
              }}
            >
              {settings.enableBlurBg && (
                <div className="absolute inset-0 z-0 overflow-hidden" style={{ borderRadius: `${settings.borderRadius}px` }}>
                  <motion.div
                    initial={false}
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
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.25 } }}
                className={
                  isMinimal
                    ? `relative z-10 flex shrink-0 flex-col items-center px-5 pb-5 text-center ${hasCoverOverhang ? "pt-1" : "pt-5"}`
                    : "relative z-10 flex-1 p-4 min-w-0 flex flex-col justify-center"
                }
                style={isMinimal ? { width: COMPACT_WIDTH } : undefined}
              >
                {/* Titre + artiste : fondu doux à chaque changement de morceau */}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={trackKey}
                    className="w-full min-w-0"
                    initial={settings.trackChangeAnimation ? { opacity: 0, y: 8, filter: "blur(4px)" } : false}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={settings.trackChangeAnimation ? { opacity: 0, y: -8, filter: "blur(4px)" } : undefined}
                    transition={{ duration: 0.28 * k, ease: "easeOut" }}
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
                  </motion.div>
                </AnimatePresence>

                {footer}
              </motion.div>
            </div>

            {/* LA COVER */}
            {settings.showCover && (
              <div
                className="absolute z-30"
                style={{
                  ...(isMinimal ? { top: -COVER_COMPACT / 2 } : {}),
                  // "reveal" : la pochette part du centre (décalage = distance jusqu'à sa position finale) puis glisse.
                  ...(revealSplit
                    ? ({ animation: isPresent ? revealCoverAnimation(k) : revealCoverExitAnimation(k), "--wa-reveal-dx": `${-coverX}px` } as CSSProperties)
                    : {}),
                }}
              >
                <div style={{ transform: `translateX(${coverX}px)` }}>
                  {/* La pochette se fond en douceur quand le morceau change (pas à la première apparition) */}
                  <AnimatePresence initial={false}>
                    <motion.div
                      key={track.albumImageUrl}
                      initial={settings.trackChangeAnimation ? { opacity: 0, scale: 0.88 } : false}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 * k, ease: [0.16, 1, 0.3, 1] }}
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
                  </AnimatePresence>
                </div>
              </div>
            )}
            </>
            )}
          </PresenceShell>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: var(--glow-lo); }
          50% { box-shadow: var(--glow-hi); }
        }
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
