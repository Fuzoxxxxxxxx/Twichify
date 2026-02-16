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
    enableBlurBg: s.enableBlurBg !== false,
    blurAmount: s.blurAmount || "10",
    accentColor: s.accentColor || "#22c55e",
    borderRadius: s.borderRadius || "15",
    bgOpacity: s.bgOpacity || "60"
  };

  return (
    // On utilise min-h-screen et flex pour bien centrer le widget dans la zone OBS
    <div className={`flex items-center justify-center min-h-screen bg-transparent ${settings.fontFamily}`}>
      
      <div 
        className={`relative flex items-center transition-all duration-700 overflow-hidden
          ${settings.layout === 'minimal' ? 'flex-col w-[200px] p-4' : 'flex-row w-[380px] h-[100px] p-3'}
        `}
        style={{ 
          backgroundColor: `rgba(10, 10, 15, ${parseInt(settings.bgOpacity)/100})`,
          borderRadius: `${settings.borderRadius}px`,
          boxShadow: settings.enableGlow ? `0 10px 30px -10px ${settings.accentColor}44` : 'none',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        {/* --- DYNAMIC BLUR BACKGROUND --- */}
        {settings.enableBlurBg && (
          <div 
            className="absolute inset-0 z-0 opacity-60 transition-all duration-1000"
            style={{
              backgroundImage: `url(${track.albumImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: `blur(${settings.blurAmount}px) brightness(0.4)`,
              borderRadius: `${settings.borderRadius}px`,
            }}
          />
        )}

        {/* --- COVER ART --- */}
        {settings.showCover && (
          <div className="relative z-20 shrink-0 mr-4">
            <img 
              src={track.albumImageUrl} 
              className="w-16 h-16 object-cover shadow-2xl"
              style={{ 
                borderRadius: settings.isRotating ? '999px' : `${Math.max(4, parseInt(settings.borderRadius) - 6)}px`,
                animation: settings.isRotating ? 'spin-slow 12s linear infinite' : 'none',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
              alt="Album Art"
            />
          </div>
        )}

        {/* --- INFOS --- */}
        <div className="relative z-10 flex-1 min-w-0 flex flex-col justify-center">
          {settings.showArtist && (
            <p className="text-[9px] font-bold text-white/50 uppercase tracking-[0.2em] mb-0.5 truncate">
              {track.artist}
            </p>
          )}
          
          <h2 className="text-base font-black text-white truncate leading-tight uppercase italic tracking-tighter">
            {track.title}
          </h2>

          {settings.showProgress && (
            <div className="mt-2 space-y-1">
              <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-1000 ease-linear" 
                  style={{ 
                    backgroundColor: settings.accentColor, 
                    width: `${(track.progressMs / track.durationMs) * 100}%`,
                  }} 
                />
              </div>
              
              {settings.showTimestamp && (
                <div className="flex justify-between text-[8px] font-bold text-white/30 font-mono">
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