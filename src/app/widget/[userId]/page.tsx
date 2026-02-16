"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function SpotifyWidget() {
  const params = useParams();
  const userId = params?.userId; 
  const [track, setTrack] = useState<any>(null);

  // 1. Récupération des données avec gestion de la pause
  const fetchTrack = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/spotify/now-playing/${userId}`);
      if (res.ok) {
        const data = await res.json();
        // Si isPlaying est false, on met track à null pour déclencher l'animation de sortie
        if (!data || data.isPlaying === false) {
          setTrack(null);
        } else {
          setTrack(data);
        }
      }
    } catch (e) { 
      setTrack(null); 
    }
  };

  useEffect(() => {
    if (userId) {
      fetchTrack();
      const interval = setInterval(fetchTrack, 1000); 
      return () => clearInterval(interval);
    }
  }, [userId]);

  // 2. Préparation des réglages (avec ton système de blur)
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
    bgOpacity: s.bgOpacity || "60"
  };

  const isMinimal = settings.layout === 'minimal';
  const cardWidth = isMinimal ? 220 : 380;

  // Transition "Spring" pour l'effet élastique centre -> côté
  const sharedTransition: any = { type: "spring", stiffness: 120, damping: 20 };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center justify-center min-h-screen bg-transparent ${settings.fontFamily}`}>
      <AnimatePresence mode="wait">
        {track && track.isPlaying && (
          <motion.div 
            key="spotify-static-container" // Clé fixe = pas d'anim entre les musiques
            className="relative flex items-center justify-center"
          >
            {/* LA CARTE (S'ouvre depuis le centre) */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: cardWidth, opacity: 1 }}
              exit={{ 
                width: 0, 
                opacity: 0, 
                transition: { duration: 0.4, ease: "easeInOut" } 
              }}
              transition={sharedTransition}
              className="relative flex items-center overflow-hidden"
              style={{ 
                height: isMinimal ? 'auto' : '100px',
                backgroundColor: `rgba(15, 17, 23, ${parseInt(settings.bgOpacity)/100})`,
                borderRadius: `${settings.borderRadius}px`,
                boxShadow: settings.enableGlow ? `0 20px 50px -10px ${settings.accentColor}55` : 'none',
                border: '1px solid rgba(255,255,255,0.08)',
                paddingLeft: isMinimal ? '0' : '85px'
              }}
            >
              {/* --- DYNAMIC BLUR BACKGROUND --- */}
              {settings.enableBlurBg && (
                <div className="absolute inset-0 z-0 overflow-hidden" style={{ borderRadius: `${settings.borderRadius}px` }}>
                  <div 
                    className="absolute inset-0 opacity-60 transition-all duration-1000"
                    style={{
                      backgroundImage: `url(${track.albumImageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: `blur(${settings.blurAmount}px) brightness(0.4)`,
                      transform: 'scale(1.3)'
                    }}
                  />
                </div>
              )}

              {/* --- INFOS TEXTE --- */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{ delay: 0.3 }}
                className="relative z-10 flex-1 p-4 min-w-0 flex flex-col justify-center"
              >
                {settings.showArtist && (
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.25em] mb-0.5 truncate italic">
                    {track.artist}
                  </p>
                )}
                
                <h2 className="text-base font-black text-white truncate leading-tight uppercase italic tracking-tighter">
                  {track.title}
                </h2>

                {settings.showProgress && (
                  <div className="mt-2.5 space-y-1.5">
                    <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-1000 ease-linear" 
                        style={{ 
                          backgroundColor: settings.accentColor, 
                          width: `${(track.progressMs / track.durationMs) * 100}%`,
                          boxShadow: `0 0 8px ${settings.accentColor}`
                        }} 
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>

            {/* --- LA COVER (Pop centre -> Glisse gauche | Inversement à la pause) --- */}
            {settings.showCover && (
              <motion.div 
                initial={{ scale: 0, x: 0, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  x: isMinimal ? 0 : -(cardWidth / 2) + 15,
                  opacity: 1 
                }}
                exit={{ 
                  scale: 0, 
                  x: 0, 
                  opacity: 0,
                  filter: "blur(10px)",
                  transition: { duration: 0.4, ease: "easeInOut" } 
                }}
                transition={sharedTransition}
                className={`absolute z-30 ${isMinimal ? '-top-14' : ''}`}
              > 
                <img 
                  src={track.albumImageUrl} 
                  className="w-28 h-28 object-cover shadow-[0_15px_35px_rgba(0,0,0,0.6)] border-2 border-white/10"
                  style={{ 
                    borderRadius: settings.isRotating ? '999px' : `${Math.max(8, parseInt(settings.borderRadius))}px`,
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
        body { background: transparent !important; overflow: hidden; margin: 0; }
      `}</style>
    </div>
  );
}