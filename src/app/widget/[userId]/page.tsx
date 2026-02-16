"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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
    } catch (e) {
      console.error("Fetch error");
    }
  };

  useEffect(() => {
    if (userId) {
      fetchTrack();
      const interval = setInterval(fetchTrack, 1000); 
      return () => clearInterval(interval);
    }
  }, [userId]);

  // Formattage du temps (ms -> mm:ss)
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!track || !track.isPlaying) return null;

  // Extraction des settings avec fallbacks complets
  const s = track.settings || {};
  const settings = {
    layout: s.layout || "default",
    fontFamily: s.fontFamily || "font-sans",
    showCover: s.showCover !== false,
    showProgress: s.showProgress !== false,
    showTimestamp: s.showTimestamp !== false,
    showArtist: s.showArtist !== false,
    isRotating: !!s.isRotating,
    enableGlow: s.enableGlow !== false,
    accentColor: s.accentColor || "#22c55e",
    borderRadius: s.borderRadius || "12",
    bgOpacity: s.bgOpacity || "70"
  };

  return (
    <div className={`flex items-center justify-center min-h-screen bg-transparent ${settings.fontFamily}`}>
      <div 
        className={`relative flex items-center transition-all duration-700 overflow-hidden
          ${settings.layout === 'minimal' ? 'flex-col p-8 text-center w-[300px]' : 'flex-row w-[460px]'}
          ${settings.layout === 'default' ? 'bg-black/60 border border-white/10 p-2 pr-8' : 'p-6'}
        `}
        style={{ 
          backgroundColor: `rgba(15, 17, 23, ${parseInt(settings.bgOpacity)/100})`,
          borderRadius: `${settings.borderRadius}px`,
          backdropFilter: 'blur(20px)',
          boxShadow: settings.enableGlow ? `0 0 50px -10px ${settings.accentColor}66` : 'none'
        }}
      >
        {/* --- COVER ART --- */}
        {settings.showCover && (
          <div className={`shrink-0 relative z-20 
            ${settings.layout === 'default' ? '-ml-6' : ''} 
            ${settings.layout === 'minimal' ? 'mb-5' : 'mr-5'}`}
          >
            <img 
              src={track.albumImageUrl} 
              className={`w-24 h-24 object-cover shadow-2xl transition-all duration-1000`}
              style={{ 
                borderRadius: settings.isRotating ? '999px' : `${parseInt(settings.borderRadius)}px`,
                animation: settings.isRotating ? 'spin-slow 12s linear infinite' : 'none'
              }}
              alt="Album Art"
            />
          </div>
        )}

        {/* --- INFOS MUSIQUE --- */}
        <div className="flex-1 min-w-0 py-2">
          {settings.showArtist && (
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-1 truncate opacity-80">
              {track.artist}
            </p>
          )}
          
          <h2 className="text-2xl font-black text-white truncate leading-tight tracking-tighter uppercase italic drop-shadow-md">
            {track.title}
          </h2>

          {/* --- PROGRESS BAR & TIMESTAMPS --- */}
          {settings.showProgress && (
            <div className="mt-5 space-y-1.5">
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full transition-all duration-1000 ease-linear" 
                  style={{ 
                    backgroundColor: settings.accentColor, 
                    width: `${(track.progressMs / track.durationMs) * 100}%`,
                    boxShadow: `0 0 10px ${settings.accentColor}`
                  }} 
                />
              </div>
              
              {settings.showTimestamp && (
                <div className="flex justify-between text-[10px] font-bold text-zinc-500 font-mono tracking-tighter">
                  <span>{formatTime(track.progressMs)}</span>
                  <span>{formatTime(track.durationMs)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin-slow { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }
      `}</style>
    </div>
  );
}