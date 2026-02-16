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

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!track || !track.isPlaying) return null;

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
    enableBlurBg: s.enableBlurBg !== false, // Nouveau paramètre
    accentColor: s.accentColor || "#22c55e",
    borderRadius: s.borderRadius || "20",
    bgOpacity: s.bgOpacity || "60",
    blurAmount: s.blurAmount || "10"
  };

  return (
    <div className={`flex items-center justify-center min-h-screen bg-transparent ${settings.fontFamily}`}>
      <div 
        className={`relative flex transition-all duration-700 
          ${settings.layout === 'minimal' ? 'flex-col items-center p-8 pt-12 text-center w-[300px]' : 'flex-row items-center w-[500px] p-6 ml-12'}
        `}
        style={{ 
          backgroundColor: `rgba(10, 10, 15, ${parseInt(settings.bgOpacity)/100})`,
          borderRadius: `${settings.borderRadius}px`,
          boxShadow: settings.enableGlow ? `0 25px 50px -12px ${settings.accentColor}33` : 'none',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        {/* --- DYNAMIC BLUR BACKGROUND --- */}
{settings.enableBlurBg && (
  <div 
  className="absolute inset-0 z-0 transition-all duration-1000"
  style={{
    backgroundImage: `url(${track.albumImageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: `blur(${settings.blurAmount}px) brightness(0.5)`, // Dynamique !
    opacity: '0.9',
    borderRadius: `${settings.borderRadius}px`,
  }}
/>
)}

        {/* --- COVER ART (OVERHANGING) --- */}
        {settings.showCover && (
          <div className={`relative z-20 shrink-0 transition-all duration-500
            ${settings.layout === 'minimal' ? '-mt-24 mb-4' : '-ml-14 mr-6'}
          `}>
            <img 
              src={track.albumImageUrl} 
              className="w-28 h-28 object-cover shadow-[0_15px_40px_rgba(0,0,0,0.6)]"
              style={{ 
                borderRadius: settings.isRotating ? '999px' : `${settings.borderRadius}px`,
                animation: settings.isRotating ? 'spin-slow 12s linear infinite' : 'none',
                border: '2px solid rgba(255,255,255,0.1)'
              }}
              alt="Album Art"
            />
          </div>
        )}

        {/* --- INFOS --- */}
        <div className="relative z-10 flex-1 min-w-0 flex flex-col justify-center py-2 pr-2">
          {settings.showArtist && (
            <p className="text-[11px] font-bold text-white/50 uppercase tracking-[0.25em] mb-1 truncate">
              {track.artist}
            </p>
          )}
          
          <h2 className="text-2xl font-black text-white truncate leading-tight tracking-tighter uppercase italic drop-shadow-lg">
            {track.title}
          </h2>

          {settings.showProgress && (
            <div className="mt-5 space-y-2">
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden backdrop-blur-md">
                <div 
                  className="h-full transition-all duration-1000 ease-linear relative" 
                  style={{ 
                    backgroundColor: settings.accentColor, 
                    width: `${(track.progressMs / track.durationMs) * 100}%`,
                    boxShadow: `0 0 10px ${settings.accentColor}`
                  }} 
                />
              </div>
              
              {settings.showTimestamp && (
                <div className="flex justify-between text-[10px] font-black text-white/40 font-mono italic">
                  <span className="bg-black/20 px-1.5 py-0.5 rounded">{formatTime(track.progressMs)}</span>
                  <span className="bg-black/20 px-1.5 py-0.5 rounded">{formatTime(track.durationMs)}</span>
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