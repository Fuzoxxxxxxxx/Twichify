"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { 
  Copy, CheckCircle2, ExternalLink, LayoutDashboard, Music, 
  Palette, LogOut, Link as LinkIcon, Save, AlertCircle, 
  Layout, Eye, EyeOff, RotateCw 
} from "lucide-react";

export default function Dashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- ÉTATS SPOTIFY ---
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);

  // --- ÉTATS DESIGN (Style par défaut basé sur Fox Stevenson) ---
  const [layout, setLayout] = useState("default"); // default, modern, minimal
  const [showCover, setShowCover] = useState(true);
  const [showProgress, setShowProgress] = useState(true);
  const [isRotating, setIsRotating] = useState(false);
  const [accentColor, setAccentColor] = useState("#22c55e");
  const [borderRadius, setBorderRadius] = useState("12");
  const [bgOpacity, setBgOpacity] = useState("70");

  // URL du widget pour OBS
  const widgetUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/widget/${session?.user?.id}` 
    : "";

  // 1. CHARGEMENT DES DONNÉES UTILISATEUR
  const loadUserData = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setIsConnected(!!data.hasSpotifyToken);
        if (data.spotifyClientId) setClientId(data.spotifyClientId);
        
        if (data.widgetSettings) {
          setLayout(data.widgetSettings.layout || "default");
          setShowCover(data.widgetSettings.showCover !== false);
          setShowProgress(data.widgetSettings.showProgress !== false);
          setIsRotating(!!data.widgetSettings.isRotating);
          setAccentColor(data.widgetSettings.accentColor || "#22c55e");
          setBorderRadius(data.widgetSettings.borderRadius || "12");
          setBgOpacity(data.widgetSettings.bgOpacity || "70");
        }
      }
    } catch (e) {
      console.error("Erreur de chargement");
    }
  }, []);

  // 2. FETCH DE LA MUSIQUE POUR LA PREVIEW
  useEffect(() => {
    if (!session || activeTab !== "design") return;
    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/spotify/now-playing/${session.user.id}`);
        if (res.ok) setCurrentTrack(await res.json());
      } catch (e) { console.error("Erreur preview"); }
    };
    fetchPreview();
    const interval = setInterval(fetchPreview, 5000);
    return () => clearInterval(interval);
  }, [session, activeTab]);

  useEffect(() => {
    if (session) loadUserData();
  }, [session, loadUserData]);

  // 3. FONCTIONS DE SAUVEGARDE
  const saveSpotifyKeys = async () => {
    setLoading(true);
    try {
      await fetch("/api/user/spotify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      alert("Configuration Spotify enregistrée !");
    } finally { setLoading(false); }
  };

  const saveDesign = async () => {
    setLoading(true);
    try {
      await fetch("/api/user/design-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          layout, showCover, showProgress, isRotating,
          accentColor, borderRadius, bgOpacity 
        }),
      });
      alert("Design sauvegardé !");
    } finally { setLoading(false); }
  };

  if (!session) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0f1117]">
      <div className="text-zinc-500 animate-pulse font-medium uppercase tracking-tighter">Initialisation...</div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0f1117] text-zinc-200 font-sans">
      
      {/* --- SIDEBAR GAUCHE --- */}
      <aside className="w-72 bg-[#161922] border-r border-white/5 flex flex-col sticky top-0 h-screen">
        <div className="p-8 flex items-center gap-3 italic font-black text-xl tracking-tighter text-white">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center not-italic shadow-lg shadow-indigo-600/20">NP</div>
          NOWPLAYING
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Menu</p>
          <button onClick={() => setActiveTab("overview")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "overview" ? "bg-indigo-600 text-white shadow-lg" : "hover:bg-white/5 text-zinc-400"}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setActiveTab("spotify")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "spotify" ? "bg-indigo-600 text-white shadow-lg" : "hover:bg-white/5 text-zinc-400"}`}>
            <Music size={20} /> Spotify API
          </button>
          <button onClick={() => setActiveTab("design")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "design" ? "bg-indigo-600 text-white shadow-lg" : "hover:bg-white/5 text-zinc-400"}`}>
            <Palette size={20} /> Design Widget
          </button>
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl">
            <img src={session.user.image || ""} className="w-10 h-10 rounded-full border border-white/10" alt="Avatar" />
            <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate text-white">{session.user.name}</p></div>
          </div>
          <button onClick={() => signOut()} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-zinc-500 hover:text-red-400 transition-colors"><LogOut size={14}/> Déconnexion</button>
        </div>
      </aside>

      {/* --- ZONE PRINCIPALE --- */}
      <main className="flex-1 p-12 max-w-6xl overflow-y-auto">
        
        {/* ONGLET : DASHBOARD (LIEN OBS) */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-500">
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
                  <p className="text-sm font-medium text-white">{copied ? "Copié !" : "Cliquez pour copier l'URL"}</p>
                </div>
              </div>
              <ExternalLink size={20} className="text-zinc-600 mr-4 group-hover:text-white transition" />
            </div>
          </div>
        )}

        {/* ONGLET : SPOTIFY API */}
        {activeTab === "spotify" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Spotify API</h1>
            <div className="bg-[#1c202a] p-10 rounded-[40px] border border-white/5 space-y-8 shadow-2xl">
              <div className="flex items-start gap-4 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-blue-400 text-sm">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p>Redirect URI : <span className="font-mono text-white text-xs bg-black/40 px-2 py-1 rounded ml-2 select-all">{typeof window !== 'undefined' ? window.location.origin : ''}/api/callback/spotify</span></p>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-2">Client ID</label>
                  <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full p-4 bg-black/30 rounded-2xl border border-white/10 focus:border-indigo-500 outline-none transition text-white font-mono" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-2">Client Secret</label>
                  <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="••••••••••••" className="w-full p-4 bg-black/30 rounded-2xl border border-white/10 focus:border-indigo-500 outline-none transition text-white" />
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={saveSpotifyKeys} className="px-8 py-4 bg-white text-black rounded-2xl font-black uppercase text-xs hover:scale-105 transition">Sauvegarder</button>
                <button 
                  onClick={async () => {
                    const res = await fetch("/api/spotify/auth-url");
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                  }}
                  className={`px-8 py-4 rounded-2xl font-black uppercase text-xs transition flex items-center gap-2 ${isConnected ? "bg-zinc-800 text-green-500 border border-green-500/20" : "bg-[#1DB954] text-black"}`}
                >
                  {isConnected ? "Compte Lié" : "Lier Spotify"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET : DESIGN (LA MAGIE) */}
        {activeTab === "design" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Widget Design</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              
              {/* PANNEAU DE CONTRÔLE */}
              <div className="bg-[#1c202a] p-10 rounded-[40px] border border-white/5 space-y-8 shadow-2xl">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Preset Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["default", "modern", "minimal"].map((l) => (
                      <button key={l} onClick={() => setLayout(l)} className={`py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${layout === l ? "bg-white text-black border-white" : "border-white/10 text-zinc-500 hover:border-white/20"}`}>{l}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setShowCover(!showCover)} className={`flex items-center justify-between p-4 rounded-2xl border transition ${showCover ? "border-indigo-500/50 bg-indigo-500/10 text-white" : "border-white/5 bg-white/5 text-zinc-500"}`}>
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Afficher Cover</span>
                    {showCover ? <Eye size={16}/> : <EyeOff size={16}/>}
                  </button>
                  <button onClick={() => setIsRotating(!isRotating)} className={`flex items-center justify-between p-4 rounded-2xl border transition ${isRotating ? "border-indigo-500/50 bg-indigo-500/10 text-white" : "border-white/5 bg-white/5 text-zinc-500"}`}>
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Rotation</span>
                    <RotateCw size={16} className={isRotating ? "animate-spin" : ""}/>
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Couleur d'accent</label>
                  <div className="flex gap-3">
                    {["#22c55e", "#6366f1", "#f43f5e", "#ffffff"].map(c => (
                      <button key={c} onClick={() => setAccentColor(c)} className={`w-10 h-10 rounded-xl border-2 transition-all ${accentColor === c ? 'border-white scale-110' : 'border-transparent opacity-40'}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500"><span>Arrondi</span><span>{borderRadius}px</span></div>
                    <input type="range" min="0" max="50" value={borderRadius} onChange={(e) => setBorderRadius(e.target.value)} className="w-full accent-indigo-600" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500"><span>Opacité</span><span>{bgOpacity}%</span></div>
                    <input type="range" min="0" max="100" value={bgOpacity} onChange={(e) => setBgOpacity(e.target.value)} className="w-full accent-indigo-600" />
                  </div>
                </div>

                <button onClick={saveDesign} disabled={loading} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50">
                  <Save size={18} className="inline mr-2" /> {loading ? "Application..." : "Appliquer le design"}
                </button>
              </div>

              {/* LIVE PREVIEW (STYLE FOX STEVENSON) */}
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[40px] bg-black/40 p-12 min-h-[450px] relative overflow-hidden">
                <p className="absolute top-6 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.4em]">Aperçu en direct</p>
                
                <div 
                  className={`relative flex items-center transition-all duration-500 shadow-2xl
                    ${layout === 'minimal' ? 'flex-col p-8 text-center w-[280px]' : 'flex-row w-[420px]'}
                    ${layout === 'default' ? 'bg-black/60 border border-white/10 p-1.5 pr-6' : 'p-5'}
                  `}
                  style={{ 
                    backgroundColor: layout === 'default' ? `rgba(15, 17, 23, ${parseInt(bgOpacity)/100})` : `rgba(28, 32, 42, ${parseInt(bgOpacity)/100})`,
                    borderRadius: `${borderRadius}px`,
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  {showCover && (
                    <div className={`shrink-0 relative z-20 ${layout === 'default' ? '-ml-4' : ''} ${layout === 'minimal' ? 'mb-4' : 'mr-4'}`}>
                      <img 
                        src={currentTrack?.albumImageUrl || "https://via.placeholder.com/150"} 
                        className={`w-20 h-20 object-cover shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-700 ${isRotating ? 'rounded-full' : ''}`}
                        style={{ 
                          borderRadius: isRotating ? '999px' : `${parseInt(borderRadius)}px`,
                          animation: isRotating ? 'spin-slow 10s linear infinite' : 'none'
                        }}
                        alt="Cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 py-2">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-0.5 truncate">{currentTrack?.artist || "FOX STEVENSON"}</p>
                    <h2 className="text-xl font-black text-white truncate drop-shadow-md leading-tight">{currentTrack?.title || "Don't Care Crown"}</h2>
                    {showProgress && (
                      <div className="w-full bg-white/10 h-1 mt-3 rounded-full overflow-hidden">
                        <div className="h-full transition-all duration-1000" style={{ backgroundColor: accentColor, width: '65%' }} />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 10s linear infinite; }
      `}</style>
    </div>
  );
}