"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence, Transition } from "framer-motion";

export default function SpotifyWidget() {
  const params = useParams();
  const userId = params?.userId; 
  const [track, setTrack] = useState<any>(null);

  // --- RÉCUPÉRATION DES RÉGLAGES ---
  // On regarde dans track.settings (ce que ton API envoie)
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
    blurAmount: parseInt(s.blurAmount) || 10,
    accentColor: s.accentColor || "#22c55e",
    borderRadius: parseInt(s.borderRadius) || 15,
    bgOpacity: parseInt(s.bgOpacity) || 60
  };

  const fetchTrack = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/spotify/now-playing/${userId}`);
      if (res.ok) {
        const data = await res.json();
        // Ton API renvoie data.isPlaying
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

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isVisible = !!(track && track.isPlaying);
  const cardWidth = settings.layout === 'minimal' ? 220 : 380;

  const sharedTransition: Transition = {
    duration: 0.8,
    ease: [0.16, 1, 0.3, 1]
  };

  return (
    <div className={`flex items-center justify-center min-h-screen bg-transparent ${settings.fontFamily}`}>
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div 
            key={track.title} 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.9 }}
            className="relative flex items-center justify-center"
          >
            
            {/* LA CARTE */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: cardWidth, opacity: 1 }}
              transition={{ ...sharedTransition, delay: 0.1 }}
              className={`relative flex items-center overflow-hidden
                ${settings.layout === 'minimal' ? 'flex-col p-6 mt-10' : 'flex-row h-[100px] p-4'}
              `}
              style={{ 
                backgroundColor: `rgba(15, 17, 23, ${settings.bgOpacity / 100})`,
                borderRadius: `${settings.borderRadius}px`,
                boxShadow: settings.enableGlow ? `0 20px 50px -10px ${settings.accentColor}55` : 'none',
                border: `1px solid rgba(255,255,255,0.08)`,
                paddingLeft: settings.layout === 'minimal' ? '1.5rem' : '85px',
              }}
            >
              {settings.enableBlurBg && (
                <div className="absolute inset-0 z-0 overflow-hidden" style={{ borderRadius: `${settings.borderRadius}px` }}>
                  <div 
                    className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage: `url(${track.albumImageUrl})`,
                      backgroundSize: 'cover',
                      filter: `blur(${settings.blurAmount}px) brightness(0.35)`,
                      transform: 'scale(1.2)'
                    }}
                  />
                </div>
              )}

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="relative z-10 flex-1 min-w-0 flex flex-col justify-center"
              >
                {settings.showArtist && (
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-0.5 truncate italic">
                    {track.artist}
                  </p>
                )}
                <h2 className="text-base font-black text-white truncate uppercase italic tracking-tighter leading-none">
                  {track.title}
                </h2>

                {settings.showProgress && (
                  <div className="mt-2.5 space-y-1.5">
                    <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-1000 ease-linear" 
                        style={{ backgroundColor: settings.accentColor, width: `${(track.progressMs / track.durationMs) * 100}%` }} 
                      />
                    </div>
                    {settings.showTimestamp && (
                      <div className="flex justify-between text-[8px] font-black text-white/40 font-mono italic">
                        <span>{formatTime(track.progressMs)}</span>
                        <span>{formatTime(track.durationMs)}</span>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>

            {/* LA COVER */}
            {settings.showCover && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5, x: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  x: settings.layout === 'minimal' ? 0 : -(cardWidth / 2) + 15 
                }}
                transition={{
                  x: sharedTransition,
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.3 }
                }}
                className={`absolute z-30 shrink-0 ${settings.layout === 'minimal' ? '-top-14' : ''}`}
              >
                <img 
                  src={track.albumImageUrl} 
                  className="w-28 h-28 object-cover shadow-2xl border-2 border-white/10"
                  style={{ 
                    borderRadius: settings.isRotating ? '999px' : `${Math.max(8, settings.borderRadius)}px`,
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