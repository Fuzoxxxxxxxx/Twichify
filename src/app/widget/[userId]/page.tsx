"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function SpotifyWidget() {
  const params = useParams();
  const userId = params?.userId;
  const [track, setTrack] = useState<any>(null);

  const fetchTrack = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/spotify/now-playing/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setTrack(data);
      }
    } catch (e) { console.error("Fetch error", e); }
  };

  useEffect(() => {
    if (userId) {
      fetchTrack();
      const interval = setInterval(fetchTrack, 1000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  // --- LOGIQUE DE VISIBILITÉ STRICTE ---
  // On vérifie si track existe ET si isPlaying est vraiment à true
  const isVisible = track !== null && track.isPlaying === true;

  // --- EXTRACTION SÉCURISÉE DES SETTINGS ---
  // On s'assure que même si track.settings est vide, on a des valeurs
  const s = track?.settings || {};
  
  const settings = {
    layout: s.layout || "default",
    fontFamily: s.fontFamily || "font-sans",
    showCover: s.showCover !== false,
    showProgress: s.showProgress !== false,
    showTimestamp: s.showTimestamp !== false,
    showArtist: s.showArtist !== false,
    isRotating: s.isRotating === true || s.isRotating === "true",
    enableGlow: s.enableGlow !== false,
    enableBlurBg: s.enableBlurBg !== false,
    blurAmount: parseInt(s.blurAmount) || 10,
    accentColor: s.accentColor || "#22c55e",
    borderRadius: parseInt(s.borderRadius) || 15,
    bgOpacity: parseInt(s.bgOpacity) || 60,
  };

  const cardWidth = settings.layout === 'minimal' ? 220 : 380;

  return (
    <div className={`flex items-center justify-center min-h-screen bg-transparent ${settings.fontFamily}`}>
      <AnimatePresence>
        {isVisible && (
          <motion.div 
            className="relative flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", transition: { duration: 0.5 } }}
          >
            {/* CARD PRINCIPALE */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: cardWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex items-center overflow-hidden"
              style={{
                height: settings.layout === 'minimal' ? 'auto' : '100px',
                backgroundColor: `rgba(15, 17, 23, ${settings.bgOpacity / 100})`,
                borderRadius: `${settings.borderRadius}px`,
                boxShadow: settings.enableGlow ? `0 20px 50px -10px ${settings.accentColor}55` : 'none',
                border: '1px solid rgba(255,255,255,0.08)',
                paddingLeft: settings.layout === 'minimal' ? '1.5rem' : '85px',
                paddingRight: '1.5rem',
                paddingTop: '1rem',
                paddingBottom: '1rem',
              }}
            >
              {/* BLUR BACKGROUND */}
              {settings.enableBlurBg && (
                <div className="absolute inset-0 z-0 overflow-hidden" style={{ borderRadius: `${settings.borderRadius}px` }}>
                  <div className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage: `url(${track.albumImageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: `blur(${settings.blurAmount}px) brightness(0.4)`,
                      transform: 'scale(1.2)'
                    }}
                  />
                </div>
              )}

              {/* CONTENU TEXTE */}
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.4 }}
                className="relative z-10 flex-1 min-w-0 flex flex-col justify-center whitespace-nowrap"
              >
                {settings.showArtist && (
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-0.5 truncate italic">
                    {track.artist}
                  </p>
                )}
                <h2 className="text-base font-black text-white truncate leading-tight uppercase italic tracking-tighter">
                  {track.title}
                </h2>
                {settings.showProgress && (
                  <div className="mt-2.5 w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-1000 ease-linear" 
                      style={{ 
                        backgroundColor: settings.accentColor, 
                        width: `${(track.progressMs / track.durationMs) * 100}%`,
                        boxShadow: `0 0 8px ${settings.accentColor}`
                      }} 
                    />
                  </div>
                )}
              </motion.div>
            </motion.div>

            {/* COVER */}
            {settings.showCover && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, x: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  x: settings.layout === 'minimal' ? 0 : -(cardWidth / 2) + 15 
                }}
                exit={{ opacity: 0, scale: 0, x: 0 }}
                transition={{ 
                  opacity: { duration: 0.3 },
                  x: { delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }
                }}
                className={`absolute z-30 ${settings.layout === 'minimal' ? '-top-12' : ''}`}
              >
                <img
                  src={track.albumImageUrl}
                  className="w-28 h-28 object-cover shadow-2xl border-2 border-white/10"
                  style={{
                    borderRadius: settings.isRotating ? '999px' : `${Math.max(8, settings.borderRadius - 4)}px`,
                    animation: settings.isRotating ? 'spin-slow 12s linear infinite' : 'none',
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
        body { background: transparent !important; margin: 0; padding: 0; overflow: hidden; }
      `}</style>
    </div>
  );
}