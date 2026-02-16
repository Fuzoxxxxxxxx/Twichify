"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function SpotifyWidget() {
  const { userId } = useParams();
  const [track, setTrack] = useState<any>(null);

  const fetchTrack = async () => {
    try {
      const res = await fetch(`/api/spotify/now-playing/${userId}`);
      const data = await res.json();
      setTrack(data);
    } catch (e) {
      console.error("Fetch error");
    }
  };

  useEffect(() => {
    fetchTrack();
    const interval = setInterval(fetchTrack, 10000); // Update toutes les 10s
    return () => clearInterval(interval);
  }, []);

  if (!track || !track.isPlaying) return null; // Widget invisible si rien ne joue

  return (
    <div className="flex items-center gap-4 p-4 bg-black/80 backdrop-blur-md text-white rounded-2xl w-[350px] border border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      <img 
        src={track.albumImageUrl} 
        alt="Album Art" 
        className="w-16 h-16 rounded-lg shadow-lg"
      />
      <div className="flex-1 min-w-0">
        <p className="font-bold truncate text-lg leading-tight">{track.title}</p>
        <p className="text-zinc-400 truncate text-sm">{track.artist}</p>
        
        {/* Barre de progression optionnelle */}
        <div className="w-full bg-white/20 h-1 mt-2 rounded-full overflow-hidden">
          <div 
            className="bg-green-500 h-full transition-all duration-1000" 
            style={{ width: `${(track.progressMs / track.durationMs) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}