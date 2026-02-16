"use client";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { 
  Copy, CheckCircle2, ExternalLink, 
  LayoutDashboard, Music, Palette, 
  LogOut, Link as LinkIcon, Save, AlertCircle 
} from "lucide-react";

export default function Dashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // États Spotify
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  // États Design
  const [accentColor, setAccentColor] = useState("#22c55e");
  const [borderRadius, setBorderRadius] = useState("16");
  const [bgOpacity, setBgOpacity] = useState("80");

  // 1. CHARGEMENT DES DONNÉES DEPUIS L'API
  const loadUserData = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.spotifyClientId) setClientId(data.spotifyClientId);
        setIsConnected(!!data.hasSpotifyToken);
        if (data.widgetSettings) {
          setAccentColor(data.widgetSettings.accentColor);
          setBorderRadius(data.widgetSettings.borderRadius);
          setBgOpacity(data.widgetSettings.bgOpacity);
        }
      }
    } catch (e) {
      console.error("Erreur de chargement des données");
    }
  }, []);

  useEffect(() => {
    if (session) loadUserData();
    
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "spotify_connected") {
      setActiveTab("overview");
    }
  }, [session, loadUserData]);

  if (!session) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0f1117]">
      <div className="text-zinc-500 animate-pulse font-medium uppercase tracking-tighter">Initialisation...</div>
    </div>
  );

  const widgetUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/widget/${session.user.id}`;

  // 2. FONCTIONS DE SAUVEGARDE
  const saveSpotifyKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/spotify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      if (res.ok) alert("Configuration Spotify enregistrée !");
    } catch (e) {
      alert("Erreur de sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const saveDesign = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/design-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accentColor, borderRadius, bgOpacity }),
      });
      if (res.ok) alert("Design appliqué avec succès !");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0f1117] text-zinc-200 font-sans">
      
      {/* SIDEBAR GAUCHE */}
      <aside className="w-72 bg-[#161922] border-r border-white/5 flex flex-col sticky top-0 h-screen">
        <div className="p-8 flex items-center gap-3 italic font-black text-xl tracking-tighter text-white">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center not-italic shadow-lg shadow-indigo-600/20">
            NP
          </div>
          NOWPLAYING
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Menu Principal</p>
          <button onClick={() => setActiveTab("overview")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "overview" ? "bg-indigo-600 text-white shadow-lg" : "hover:bg-white/5 text-zinc-400"}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>

          <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-8 mb-4">Configuration</p>
          <button onClick={() => setActiveTab("spotify")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "spotify" ? "bg-indigo-600 text-white shadow-lg" : "hover:bg-white/5 text-zinc-400"}`}>
            <Music size={20} /> Spotify API
          </button>
          <button onClick={() => setActiveTab("design")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "design" ? "bg-indigo-600 text-white shadow-lg" : "hover:bg-white/5 text-zinc-400"}`}>
            <Palette size={20} /> Design Widget
          </button>
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl">
            <img src={session.user.image || ""} className="w-10 h-10 rounded-full border border-white/10" alt="Avatar" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-white">{session.user.name}</p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">Streamer</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ZONE DE CONTENU PRINCIPALE */}
      <main className="flex-1 p-12 max-w-6xl overflow-y-auto">
        
        {/* ONGLET : DASHBOARD */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Dashboard</h1>
            <div 
              className="bg-[#1c202a] p-6 rounded-[32px] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#232835] transition-all group shadow-2xl" 
              onClick={() => {
                navigator.clipboard.writeText(widgetUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition">
                  {copied ? <CheckCircle2 size={28} /> : <LinkIcon size={28} />}
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Lien du Widget OBS</p>
                  <p className="text-sm font-medium text-white">{copied ? "Lien copié dans le presse-papier !" : "Cliquez pour copier l'URL"}</p>
                </div>
              </div>
              <ExternalLink size={20} className="text-zinc-600 mr-4 group-hover:text-white transition" />
            </div>
          </div>
        )}

        {/* ONGLET : SPOTIFY */}
        {activeTab === "spotify" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Spotify API</h1>
            <div className="bg-[#1c202a] p-10 rounded-[40px] border border-white/5 space-y-8 shadow-2xl">
              
              <div className="flex items-start gap-4 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-blue-400 text-sm leading-relaxed">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p>
                  Configurez cette URL dans votre <a href="https://developer.spotify.com/dashboard" target="_blank" className="underline font-bold">Spotify Dashboard</a> : <br/>
                  <span className="font-mono text-white text-xs bg-black/40 px-3 py-1 rounded-lg mt-2 inline-block select-all">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/api/callback/spotify
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-2">Client ID</label>
                  <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full p-4 bg-black/30 rounded-2xl border border-white/10 focus:border-indigo-500 outline-none transition font-mono text-sm text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-2">Client Secret</label>
                  <input type="password" placeholder="•••••••••••••••• (Masqué par sécurité)" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} className="w-full p-4 bg-black/30 rounded-2xl border border-white/10 focus:border-indigo-500 outline-none transition text-white" />
                  <p className="text-[10px] text-zinc-600 ml-2 italic">Laissez vide pour conserver la valeur actuelle.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-4">
                <button onClick={saveSpotifyKeys} className="px-10 py-4 bg-white text-black rounded-2xl font-black uppercase text-sm hover:scale-105 transition active:scale-95 disabled:opacity-50" disabled={loading}>
                  Sauvegarder les clés
                </button>
                
                <button 
                  onClick={async () => {
                    const res = await fetch("/api/spotify/auth-url");
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                  }}
                  className={`px-10 py-4 rounded-2xl font-black uppercase text-sm transition flex items-center gap-2 hover:scale-105 active:scale-95 ${
                    isConnected ? "bg-zinc-800 text-green-500 border border-green-500/20" : "bg-[#1DB954] text-black"
                  }`}
                >
                  {isConnected && <CheckCircle2 size={18} />}
                  {isConnected ? "Compte Spotify Lié" : "Lier mon compte Spotify"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET : DESIGN */}
        {activeTab === "design" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Widget Design</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#1c202a] p-10 rounded-[40px] border border-white/5 space-y-8 shadow-2xl">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Couleur d'accentuation</label>
                  <div className="flex gap-3">
                    {["#22c55e", "#6366f1", "#f43f5e", "#eab308", "#ffffff"].map(c => (
                      <button key={c} onClick={() => setAccentColor(c)} className={`w-12 h-12 rounded-2xl border-2 transition-all ${accentColor === c ? 'border-white scale-110 shadow-lg shadow-white/10' : 'border-transparent opacity-40'}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Arrondi des coins</label>
                    <span className="text-xs font-bold text-white uppercase">{borderRadius}px</span>
                  </div>
                  <input type="range" min="0" max="40" value={borderRadius} onChange={(e) => setBorderRadius(e.target.value)} className="w-full accent-indigo-500" />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Opacité du fond</label>
                    <span className="text-xs font-bold text-white uppercase">{bgOpacity}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={bgOpacity} onChange={(e) => setBgOpacity(e.target.value)} className="w-full accent-indigo-500" />
                </div>
                
                <button 
                  onClick={saveDesign} 
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase tracking-tight hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  <Save size={20} />
                  {loading ? "Application..." : "Appliquer le design"}
                </button>
              </div>

              {/* LIVE PREVIEW */}
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[40px] bg-black/20 p-10 relative overflow-hidden">
                <p className="text-[10px] font-bold text-zinc-600 uppercase mb-12 tracking-[0.3em]">Aperçu en direct</p>
                <div 
                  className="flex items-center gap-5 p-5 text-white w-full max-w-[380px] shadow-2xl transition-all duration-500 relative z-10"
                  style={{ 
                    backgroundColor: `rgba(28, 32, 42, ${parseInt(bgOpacity)/100})`,
                    borderRadius: `${borderRadius}px`,
                    backdropFilter: `blur(12px)`, 
                    WebkitBackdropFilter: `blur(12px)`
                  }}
                >
                  <div className="w-20 h-20 bg-white/5 rounded-xl animate-pulse shrink-0 shadow-inner" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-white/20 rounded-md w-4/5" />
                    <div className="h-3.5 bg-white/10 rounded-md w-3/5" />
                    <div className="w-full bg-white/10 h-1.5 mt-4 rounded-full overflow-hidden">
                      <div className="h-full transition-all duration-1000" style={{ backgroundColor: accentColor, width: '65%' }} />
                    </div>
                  </div>
                </div>
                {/* Décoration de fond preview */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}