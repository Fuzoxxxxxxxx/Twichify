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
    } catch (e) { console.error("Fetch error"); }
  };

  useEffect(() => {
    if (userId) {
      fetchTrack();
      const interval = setInterval(fetchTrack, 1000); 
      return () => clearInterval(interval);
    }
  }, [userId]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // On utilise une constante pour l'animation de sortie
  const isVisible = track && track.isPlaying;

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

  const cardWidth = settings.layout === 'minimal' ? 220 : 380;

  return (
    <div className={`flex items-center justify-center min-h-screen bg-transparent ${settings.fontFamily}`}>
      <AnimatePresence>
        {isVisible && (
          <motion.div 
            key="spotify-widget"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", transition: { duration: 0.5 } }}
            className="relative flex items-center justify-center"
          >
            {/* --- LA CARTE (Conteneur principal qui se déroule) --- */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: cardWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className={`relative flex items-center transition-all duration-700
                ${settings.layout === 'minimal' ? 'flex-col p-6 text-center mt-10' : 'flex-row h-[100px] p-4'}
              `}
              style={{ 
                backgroundColor: `rgba(15, 17, 23, ${parseInt(settings.bgOpacity)/100})`,
                borderRadius: `${settings.borderRadius}px`,
                boxShadow: settings.enableGlow ? `0 20px 50px -10px ${settings.accentColor}55` : 'none',
                border: '1px solid rgba(255,255,255,0.08)',
                paddingLeft: settings.layout === 'minimal' ? '1.5rem' : '85px', // Espace pour la cover décalée
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
                      transform: 'scale(1.2)'
                    }}
                  />
                </div>
              )}

              {/* --- INFOS (Contenu texte) --- */}
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.4 }}
                className="relative z-10 flex-1 min-w-0 flex flex-col justify-center"
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
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden backdrop-blur-sm">
                      <div 
                        className="h-full transition-all duration-1000 ease-linear" 
                        style={{ 
                          backgroundColor: settings.accentColor, 
                          width: `${(track.progressMs / track.durationMs) * 100}%`,
                          boxShadow: `0 0 12px ${settings.accentColor}`
                        }} 
                      />
                    </div>
                    
                    {settings.showTimestamp && (
                      <div className="flex justify-between text-[8px] font-black text-white/40 font-mono italic tracking-tight">
                        <span className="bg-black/40 px-1.5 py-0.5 rounded">{formatTime(track.progressMs)}</span>
                        <span className="bg-black/40 px-1.5 py-0.5 rounded">{formatTime(track.durationMs)}</span>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>

            {/* --- COVER ART (L'élément qui glisse) --- */}
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
                className={`absolute z-30 shrink-0 ${settings.layout === 'minimal' ? '-top-14' : ''}`}
              >
                <img 
                  src={track.albumImageUrl} 
                  className="w-28 h-28 object-cover shadow-[0_15px_35px_rgba(0,0,0,0.6)] border-2 border-white/10"
                  style={{ 
                    borderRadius: settings.isRotating ? '999px' : `${Math.max(8, parseInt(settings.borderRadius))}px`,
                    animation: settings.isRotating ? 'spin-slow 12s linear infinite' : 'none',
                  }} 
                  alt="Album Art"
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes spin-slow { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }
        body { background: transparent !important; overflow: hidden; }
      `}</style>
    </div>
  );
}