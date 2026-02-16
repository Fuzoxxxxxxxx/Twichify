"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { 
  Copy, CheckCircle2, ExternalLink, LayoutDashboard, Music, 
  Palette, LogOut, Link as LinkIcon, Save, AlertCircle, 
  Layout, Eye, EyeOff, RotateCw, Type, Sparkles, Clock,
  Zap, Settings, HelpCircle, Activity, Image as ImageIcon,
  Sliders
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

  // --- ÉTATS DESIGN (Adaptés pour le format 400x125) ---
  const [layout, setLayout] = useState("default");
  const [fontFamily, setFontFamily] = useState("font-sans");
  const [showCover, setShowCover] = useState(true);
  const [showProgress, setShowProgress] = useState(true);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [showArtist, setShowArtist] = useState(true);
  const [isRotating, setIsRotating] = useState(false);
  const [enableGlow, setEnableGlow] = useState(true);
  const [enableBlurBg, setEnableBlurBg] = useState(true);
  const [accentColor, setAccentColor] = useState("#22c55e");
  const [borderRadius, setBorderRadius] = useState("15");
  const [bgOpacity, setBgOpacity] = useState("60");
  const [blurAmount, setBlurAmount] = useState("10");

  const widgetUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/widget/${session?.user?.id}` 
    : "";

  const loadUserData = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setIsConnected(!!data.hasSpotifyToken);
        if (data.spotifyClientId) setClientId(data.spotifyClientId);
        
        if (data.widgetSettings) {
          const s = data.widgetSettings;
          setLayout(s.layout || "default");
          setFontFamily(s.fontFamily || "font-sans");
          setShowCover(s.showCover !== false);
          setShowProgress(s.showProgress !== false);
          setShowTimestamp(s.showTimestamp !== false);
          setShowArtist(s.showArtist !== false);
          setIsRotating(!!s.isRotating);
          setEnableGlow(s.enableGlow !== false);
          setEnableBlurBg(s.enableBlurBg !== false);
          setAccentColor(s.accentColor || "#22c55e");
          setBorderRadius(s.borderRadius || "15");
          setBgOpacity(s.bgOpacity || "60");
          setBlurAmount(s.blurAmount || "10");
        }
      }
    } catch (e) { console.error("Erreur de chargement"); }
  }, []);

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

  useEffect(() => { if (session) loadUserData(); }, [session, loadUserData]);

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
          layout, fontFamily, showCover, showProgress, showTimestamp, 
          showArtist, isRotating, enableGlow, enableBlurBg, accentColor, 
          borderRadius, bgOpacity, blurAmount 
        }),
      });
      alert("Design sauvegardé !");
    } finally { setLoading(false); }
  };

  if (!session) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0f1117]">
      <div className="text-zinc-500 animate-pulse font-bold uppercase tracking-widest text-xs">Initialisation...</div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0f1117] text-zinc-200">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-72 bg-[#161922] border-r border-white/5 flex flex-col sticky top-0 h-screen z-50">
        <div className="p-8 flex items-center gap-3 italic font-black text-xl tracking-tighter text-white">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center not-italic shadow-lg shadow-indigo-600/20 text-white">NP</div>
          NOWPLAYING
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 opacity-50">Menu</p>
          <button onClick={() => setActiveTab("overview")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "overview" ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/10" : "hover:bg-white/5 text-zinc-400"}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setActiveTab("spotify")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "spotify" ? "bg-indigo-600 text-white shadow-xl" : "hover:bg-white/5 text-zinc-400"}`}>
            <Music size={20} /> Spotify API
          </button>
          <button onClick={() => setActiveTab("design")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "design" ? "bg-indigo-600 text-white shadow-xl" : "hover:bg-white/5 text-zinc-400"}`}>
            <Palette size={20} /> Design Widget
          </button>
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          <button onClick={() => signOut()} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[10px] font-bold text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-[0.2em]"><LogOut size={14}/> Déconnexion</button>
        </div>
      </aside>

      <main className="flex-1 p-12 max-w-7xl">
        
        {/* --- DASHBOARD OVERVIEW --- */}
        {activeTab === "overview" && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <header>
                <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Dashboard</h1>
                <p className="text-zinc-500 text-sm mt-2">Bienvenue, <span className="text-white font-bold">{session.user.name}</span>.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#1c202a] p-6 rounded-[24px] border border-white/5">
                    <div className="w-10 h-10 bg-green-500/10 text-green-500 rounded-lg flex items-center justify-center mb-4"><Activity size={20}/></div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Statut Spotify</p>
                    <p className="text-xl font-black text-white uppercase italic mt-1">{isConnected ? "Connecté" : "Déconnecté"}</p>
                </div>
                <div className="bg-[#1c202a] p-6 rounded-[24px] border border-white/5">
                    <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-lg flex items-center justify-center mb-4"><Zap size={20}/></div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Type de Widget</p>
                    <p className="text-xl font-black text-white uppercase italic mt-1">Compact (400x125)</p>
                </div>
                <div className="bg-[#1c202a] p-6 rounded-[24px] border border-white/5">
                    <div className="w-10 h-10 bg-yellow-500/10 text-yellow-500 rounded-lg flex items-center justify-center mb-4"><Settings size={20}/></div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Version</p>
                    <p className="text-xl font-black text-white uppercase italic mt-1">v3.0.0</p>
                </div>
            </div>

            <div 
              className="bg-[#1c202a] p-8 rounded-[32px] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#232835] transition-all group shadow-2xl" 
              onClick={() => {
                navigator.clipboard.writeText(widgetUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition">
                  {copied ? <CheckCircle2 size={32} /> : <LinkIcon size={32} />}
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Source Navigateur OBS</p>
                  <p className="text-lg font-bold text-white tracking-tight">{copied ? "Lien copié dans le presse-papier !" : "Cliquer pour copier le lien du widget"}</p>
                </div>
              </div>
              <ExternalLink size={24} className="text-zinc-700 mr-4 group-hover:text-white transition" />
            </div>
          </div>
        )}

        {/* --- SPOTIFY SETUP --- */}
        {activeTab === "spotify" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Configuration API</h1>
            <div className="bg-[#1c202a] p-10 rounded-[40px] border border-white/5 space-y-8 shadow-2xl">
              <div className="flex items-start gap-4 p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-blue-400 text-xs">
                <AlertCircle size={18} className="shrink-0" />
                <p>Dans Spotify Developer Dashboard, ajoutez cette URL : <br/><span className="font-mono text-white bg-black/40 px-2 py-1 rounded select-all">{typeof window !== 'undefined' ? window.location.origin : ''}/api/callback/spotify</span></p>
              </div>
              <div className="space-y-4">
                <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Client ID" className="w-full p-4 bg-black/30 rounded-2xl border border-white/10 focus:border-indigo-500 outline-none text-white font-mono text-sm" />
                <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="Client Secret" className="w-full p-4 bg-black/30 rounded-2xl border border-white/10 focus:border-indigo-500 outline-none text-white font-mono text-sm" />
              </div>
              <div className="flex gap-4">
                <button onClick={saveSpotifyKeys} className="px-10 py-4 bg-white text-black rounded-2xl font-black uppercase text-xs hover:scale-105 transition">Sauvegarder</button>
                <button onClick={async () => { const res = await fetch("/api/spotify/auth-url"); const data = await res.json(); if (data.url) window.location.href = data.url; }} className={`px-10 py-4 rounded-2xl font-black uppercase text-xs transition flex items-center gap-2 ${isConnected ? "bg-zinc-800 text-green-500" : "bg-[#1DB954] text-black"}`}>
                  {isConnected ? <CheckCircle2 size={16}/> : <Music size={16}/>} {isConnected ? "Compte Spotify Connecté" : "Lier mon compte Spotify"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- DESIGN SYSTEM (Slim Edition) --- */}
        {activeTab === "design" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Widget Design</h1>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">
              
              {/* PANNEAU DE CONTRÔLE */}
              <div className="bg-[#1c202a] p-10 rounded-[40px] border border-white/5 space-y-8 shadow-2xl">
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-500">Layout</label>
                        <select value={layout} onChange={(e) => setLayout(e.target.value)} className="w-full p-4 bg-black/40 rounded-2xl border border-white/10 text-[10px] font-black uppercase outline-none">
                            <option value="default">Slim Horizontal</option>
                            <option value="minimal">Compact Vertical</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-500">Police</label>
                        <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full p-4 bg-black/40 rounded-2xl border border-white/10 text-[10px] font-black uppercase outline-none">
                            <option value="font-sans">Modern Sans</option>
                            <option value="font-mono">Retro Mono</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {[
                        { id: 'cover', label: "Cover", state: showCover, set: setShowCover, icon: <ImageIcon size={14}/> },
                        { id: 'artist', label: "Artiste", state: showArtist, set: setShowArtist, icon: <Music size={14}/> },
                        { id: 'progress', label: "Barre", state: showProgress, set: setShowProgress, icon: <Zap size={14}/> },
                        { id: 'blur', label: "Fond Blur", state: enableBlurBg, set: setEnableBlurBg, icon: <Palette size={14}/> },
                    ].map((m) => (
                        <button key={m.id} onClick={() => m.set(!m.state)} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${m.state ? "border-indigo-500/50 bg-indigo-500/10 text-white" : "border-white/5 bg-white/5 text-zinc-600"}`}>
                            <div className="flex items-center gap-2 font-bold uppercase text-[9px]">
                                {m.icon} {m.label}
                            </div>
                            {m.state ? <Eye size={14}/> : <EyeOff size={14}/>}
                        </button>
                    ))}
                </div>

                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500 tracking-widest">
                            <span className="flex items-center gap-2"><Sliders size={12}/> Intensité du Blur</span>
                            <span>{blurAmount}px</span>
                        </div>
                        <input type="range" min="0" max="30" value={blurAmount} onChange={(e) => setBlurAmount(e.target.value)} className="w-full accent-indigo-600 h-1.5 bg-black/30 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500 tracking-widest">
                            <span className="flex items-center gap-2"><Layout size={12}/> Arrondi des coins</span>
                            <span>{borderRadius}px</span>
                        </div>
                        <input type="range" min="0" max="30" value={borderRadius} onChange={(e) => setBorderRadius(e.target.value)} className="w-full accent-indigo-600 h-1.5 bg-black/30 rounded-lg appearance-none cursor-pointer" />
                    </div>
                </div>

                <button onClick={saveDesign} disabled={loading} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-indigo-500 transition shadow-xl active:scale-95 disabled:opacity-50">
                    <Save size={18} className="inline mr-2" /> {loading ? "Sauvegarde..." : "Appliquer"}
                </button>
              </div>

              {/* LIVE PREVIEW (Cadrage 400x125) */}
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[50px] bg-black/40 p-12 min-h-[400px] relative overflow-hidden sticky top-12">
                <p className="absolute top-8 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.4em] z-30">Aperçu OBS (400x125)</p>
                
                {/* WIDGET SLIM */}
                <div 
                  className={`relative flex items-center transition-all duration-700 overflow-hidden ${fontFamily}
                    ${layout === 'minimal' ? 'flex-col w-[200px] p-4 text-center' : 'flex-row w-[380px] h-[100px] p-3'}
                  `}
                  style={{ 
                    backgroundColor: `rgba(15, 17, 23, ${parseInt(bgOpacity)/100})`,
                    borderRadius: `${borderRadius}px`,
                    boxShadow: enableGlow ? `0 15px 40px -10px ${accentColor}44` : 'none',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  {/* FOND BLUR */}
                  {enableBlurBg && (
                    <div className="absolute inset-0 z-0 opacity-60"
                      style={{
                        backgroundImage: `url(${currentTrack?.albumImageUrl || "https://via.placeholder.com/300"})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: `blur(${blurAmount}px) brightness(0.4)`,
                        borderRadius: `${borderRadius}px`,
                      }}
                    />
                  )}

                  {/* POCHETTE COMPACTE */}
                  {showCover && (
                    <div className="relative z-20 shrink-0 mr-4">
                      <img src={currentTrack?.albumImageUrl || "https://via.placeholder.com/300"} 
                        className="w-16 h-16 object-cover shadow-2xl"
                        style={{ 
                          borderRadius: isRotating ? '999px' : `${Math.max(4, parseInt(borderRadius) - 6)}px`,
                          animation: isRotating ? 'spin-slow 12s linear infinite' : 'none',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}
                        alt="Cover"
                      />
                    </div>
                  )}

                  {/* TEXTES SLIM */}
                  <div className="relative z-10 flex-1 min-w-0 flex flex-col justify-center">
                    {showArtist && (
                      <p className="text-[9px] font-bold text-white/50 uppercase tracking-[0.2em] mb-0.5 truncate">
                        {currentTrack?.artist || "FOX STEVENSON"}
                      </p>
                    )}
                    <h2 className="text-base font-black text-white truncate leading-tight uppercase italic tracking-tighter">
                      {currentTrack?.title || "Don't Care Crown"}
                    </h2>

                    {showProgress && (
                      <div className="mt-2 space-y-1">
                        <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                          <div className="h-full" style={{ backgroundColor: accentColor, width: '60%' }} />
                        </div>
                        {showTimestamp && (
                          <div className="flex justify-between text-[8px] font-black text-white/40 font-mono italic">
                            <span>01:42</span><span>03:15</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type='range']::-webkit-slider-thumb {
            appearance: none; width: 14px; height: 14px; background: white; border-radius: 50%; cursor: pointer;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
      `}</style>
    </div>
  );
}