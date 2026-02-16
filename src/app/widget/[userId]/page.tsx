"use client";
import { useEffect, useState, use } from "react"; // On importe 'use'
import { useParams } from "next/navigation";

export default function SpotifyWidget() {
  // En Next.js 15, on peut utiliser 'use' pour déballer les params si nécessaire,
  // ou simplement s'assurer que l'on traite userId correctement.
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
      const interval = setInterval(fetchTrack, 10000);
      return () => clearInterval(interval);
    }
  }, [userId]); // On ajoute userId en dépendance

  if (!track || !track.isPlaying) return null;

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