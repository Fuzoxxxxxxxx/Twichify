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
      const data = await res.json();
      setTrack(data);
    } catch (e) {
      console.error("Fetch error");
    }
  };

  useEffect(() => {
    if (userId) {
      fetchTrack();
      // On passe à 1 seconde pour un feedback temps réel du design et de la musique
      const interval = setInterval(fetchTrack, 1000); 
      return () => clearInterval(interval);
    }
  }, [userId]);

  if (!track || !track.isPlaying) return null;

  // Extraction des settings avec valeurs de repli (fallback)
  const settings = track.settings || {
    accentColor: "#22c55e",
    borderRadius: "16",
    bgOpacity: "80"
  };

  return (
    <div 
      className="flex items-center gap-4 p-4 text-white w-[350px] border border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-4 transition-all duration-500"
      style={{ 
        backgroundColor: `rgba(0, 0, 0, ${parseInt(settings.bgOpacity) / 100})`,
        borderRadius: `${settings.borderRadius}px`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)"
      }}
    >
      <img 
        src={track.albumImageUrl} 
        alt="Album Art" 
        className="w-16 h-16 shadow-lg object-cover"
        style={{ borderRadius: `${parseInt(settings.borderRadius) / 2}px` }}
      />
      
      <div className="flex-1 min-w-0">
        <p className="font-bold truncate text-lg leading-tight uppercase tracking-tighter italic">
          {track.title}
        </p>
        <p className="text-zinc-400 truncate text-sm font-medium">
          {track.artist}
        </p>
        
        {/* Barre de progression dynamique */}
        <div className="w-full bg-white/10 h-1.5 mt-3 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-1000 ease-linear" 
            style={{ 
              width: `${(track.progressMs / track.durationMs) * 100}%`,
              backgroundColor: settings.accentColor 
            }}
          />
        </div>
      </div>
    </div>
  );
}