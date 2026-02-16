"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { 
  Copy, CheckCircle2, ExternalLink, LayoutDashboard, Music, 
  Palette, LogOut, Link as LinkIcon, Save, AlertCircle, 
  Layout, Eye, EyeOff, RotateCw, Type, Sparkles, Clock,
  Zap, Settings, HelpCircle, Activity, Image as ImageIcon,
  Sliders, Search, Info
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

  // --- ÉTATS DESIGN ---
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
    } catch (e) { console.error("Erreur de chargement profil"); }
  }, []);

  useEffect(() => {
    if (!session || activeTab !== "design") return;
    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/spotify/now-playing/${session.user.id}`);
        if (res.ok) setCurrentTrack(await res.json());
      } catch (e) { console.error("Erreur preview Spotify"); }
    };
    fetchPreview();
    const interval = setInterval(fetchPreview, 5000);
    return () => clearInterval(interval);
  }, [session, activeTab]);

  useEffect(() => { if (session) loadUserData(); }, [session, loadUserData]);

  const saveSpotifyKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/spotify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      if(res.ok) alert("Configuration Spotify enregistrée avec succès !");
    } catch(e) { alert("Erreur lors de la sauvegarde."); }
    finally { setLoading(false); }
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
      alert("Design du widget mis à jour !");
    } finally { setLoading(false); }
  };

  if (!session) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1117] gap-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px]">Chargement du Dashboard...</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0f1117] text-zinc-200 selection:bg-indigo-500/30">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-72 bg-[#161922] border-r border-white/5 flex flex-col sticky top-0 h-screen z-50">
        <div className="p-8 flex items-center gap-3 italic font-black text-xl tracking-tighter text-white">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center not-italic shadow-lg shadow-indigo-600/20 text-white">NP</div>
          NOWPLAYING
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <p className="px-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4">Navigation</p>
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

        <div className="p-6 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
            <img src={session.user.image || ""} className="w-8 h-8 rounded-full border border-white/10" alt="User" />
            <div className="flex-1 min-w-0"><p className="text-[11px] font-bold truncate text-white uppercase tracking-tight">{session.user.name}</p></div>
          </div>
          <button onClick={() => signOut()} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[10px] font-black text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-widest"><LogOut size={14}/> Quitter</button>
        </div>
      </aside>

      <main className="flex-1 p-12 max-w-7xl">
        
        {/* --- SECTION 1: OVERVIEW --- */}
        {activeTab === "overview" && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header>
                <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">Centre de contrôle</h1>
                <p className="text-zinc-500 text-sm mt-3 font-medium">Content de vous revoir, <span className="text-indigo-400 font-bold">{session.user.name}</span>. Tout fonctionne normalement.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#1c202a] p-6 rounded-[28px] border border-white/5 group hover:border-indigo-500/30 transition-all">
                    <div className="w-10 h-10 bg-green-500/10 text-green-500 rounded-lg flex items-center justify-center mb-4"><Activity size={20}/></div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Connexion Spotify</p>
                    <p className="text-xl font-black text-white uppercase italic mt-1">{isConnected ? "Opérationnel" : "Non configuré"}</p>
                </div>
                <div className="bg-[#1c202a] p-6 rounded-[28px] border border-white/5 group hover:border-indigo-500/30 transition-all">
                    <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-lg flex items-center justify-center mb-4"><Zap size={20}/></div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Source Stream</p>
                    <p className="text-xl font-black text-white uppercase italic mt-1">Widget V2 (Slim)</p>
                </div>
                <div className="bg-[#1c202a] p-6 rounded-[28px] border border-white/5 group hover:border-indigo-500/30 transition-all">
                    <div className="w-10 h-10 bg-yellow-500/10 text-yellow-500 rounded-lg flex items-center justify-center mb-4"><Settings size={20}/></div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Dernière Maj</p>
                    <p className="text-xl font-black text-white uppercase italic mt-1">Février 2024</p>
                </div>
            </div>

            <div 
              className="bg-[#1c202a] p-8 rounded-[35px] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#232835] transition-all group shadow-2xl relative overflow-hidden" 
              onClick={() => {
                navigator.clipboard.writeText(widgetUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition">
                <LinkIcon size={120} />
              </div>
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-110 transition duration-500">
                  {copied ? <CheckCircle2 size={32} /> : <LinkIcon size={32} />}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-1">Lien de la source Navigateur OBS</p>
                  <p className="text-lg font-bold text-white tracking-tight">{copied ? "Lien copié dans le presse-papier !" : "Cliquez pour copier l'URL du widget"}</p>
                </div>
              </div>
              <ExternalLink size={24} className="text-zinc-700 mr-4 group-hover:text-white group-hover:translate-x-1 transition relative z-10" />
            </div>
          </div>
        )}

        {/* --- SECTION 2: SPOTIFY API --- */}
        {activeTab === "spotify" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">Paramètres API</h1>
            <div className="bg-[#1c202a] p-10 rounded-[40px] border border-white/5 space-y-8 shadow-2xl">
              <div className="flex items-start gap-4 p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl text-indigo-300 text-xs leading-relaxed italic">
                <Info size={18} className="shrink-0 mt-0.5" />
                <div>
                    <p className="font-bold uppercase mb-1">Information importante</p>
                    <p>Assurez-vous d'avoir ajouté l'URL de redirection dans votre dashboard Spotify Developer. Sans cela, la liaison échouera.</p>
                    <p className="mt-2 text-white font-mono bg-black/40 px-3 py-1.5 rounded-lg inline-block border border-white/5 select-all">{typeof window !== 'undefined' ? window.location.origin : ''}/api/callback/spotify</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Client ID</label>
                    <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Votre Spotify Client ID" className="w-full p-5 bg-black/30 rounded-2xl border border-white/10 focus:border-indigo-500 outline-none text-white font-mono text-sm transition-all" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Client Secret</label>
                    <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="Votre Spotify Client Secret" className="w-full p-5 bg-black/30 rounded-2xl border border-white/10 focus:border-indigo-500 outline-none text-white font-mono text-sm transition-all" />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={saveSpotifyKeys} disabled={loading} className="px-10 py-5 bg-white text-black rounded-2xl font-black uppercase text-xs hover:bg-zinc-200 transition-all active:scale-95 shadow-lg">Sauvegarder les clés</button>
                <button 
                    onClick={async () => { const res = await fetch("/api/spotify/auth-url"); const data = await res.json(); if (data.url) window.location.href = data.url; }} 
                    className={`px-10 py-5 rounded-2xl font-black uppercase text-xs transition-all flex items-center gap-3 active:scale-95 shadow-lg ${isConnected ? "bg-zinc-800 text-green-500 border border-green-500/20" : "bg-[#1DB954] text-black hover:bg-[#1ed760]"}`}
                >
                  {isConnected ? <CheckCircle2 size={18}/> : <Music size={18}/>} 
                  {isConnected ? "Spotify est déjà lié" : "Lier mon compte Spotify"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- SECTION 3: DESIGN SYSTEM --- */}
        {activeTab === "design" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">Personnalisation</h1>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">
              
              {/* --- COLONNE DE GAUCHE : TOUS LES RÉGLAGES --- */}
              <div className="bg-[#1c202a] p-10 rounded-[45px] border border-white/5 space-y-8 shadow-2xl overflow-y-auto max-h-[85vh] scrollbar-hide">
                
                {/* 1. TYPOGRAPHIE ET LAYOUT */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase text-zinc-600 flex items-center gap-2 tracking-widest"><Layout size={12}/> Structure</label>
                    <select value={layout} onChange={(e) => setLayout(e.target.value)} className="w-full p-4 bg-black/40 rounded-2xl border border-white/10 text-[10px] font-black uppercase outline-none focus:border-indigo-500 transition cursor-pointer">
                      <option value="default">Horizontal (Slim)</option>
                      <option value="minimal">Vertical (Compact)</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase text-zinc-600 flex items-center gap-2 tracking-widest"><Type size={12}/> Typographie</label>
                    <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full p-4 bg-black/40 rounded-2xl border border-white/10 text-[10px] font-black uppercase outline-none focus:border-indigo-500 transition cursor-pointer">
                      <option value="font-sans">Modern Sans-Serif</option>
                      <option value="font-mono">Retro Mono-spaced</option>
                      <option value="font-serif">Elegant Serif</option>
                    </select>
                  </div>
                </div>

                {/* 2. INTERRUPTEURS VISUELS */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'cover', label: "Pochette Album", state: showCover, set: setShowCover, icon: <ImageIcon size={14}/> },
                    { id: 'artist', label: "Nom Artiste", state: showArtist, set: setShowArtist, icon: <Music size={14}/> },
                    { id: 'progress', label: "Barre de temps", state: showProgress, set: setShowProgress, icon: <Zap size={14}/> },
                    { id: 'time', label: "Horodatage", state: showTimestamp, set: setShowTimestamp, icon: <Clock size={14}/> },
                    { id: 'rotate', label: "Rotation CD", state: isRotating, set: setIsRotating, icon: <RotateCw size={14}/> },
                    { id: 'glow', label: "Effet Néon", state: enableGlow, set: setEnableGlow, icon: <Sparkles size={14}/> },
                    { id: 'blur', label: "Arrière-plan Flou", state: enableBlurBg, set: setEnableBlurBg, icon: <Palette size={14}/> },
                  ].map((m) => (
                    <button key={m.id} onClick={() => m.set(!m.state)} className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${m.state ? "border-indigo-500/50 bg-indigo-500/10 text-white" : "border-white/5 bg-white/5 text-zinc-600"}`}>
                      <div className="flex items-center gap-2 font-bold uppercase text-[9px] tracking-tight">
                        {m.icon} {m.label}
                      </div>
                      {m.state ? <Eye size={14}/> : <EyeOff size={14}/>}
                    </button>
                  ))}
                </div>

                {/* 3. CURSEURS ET COULEURS */}
                <div className="space-y-8 pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between p-5 bg-black/30 rounded-2xl border border-white/5 group transition-all">
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-2 tracking-widest"><Palette size={12}/> Couleur d'accentuation</span>
                        <p className="text-[9px] text-zinc-600 font-medium uppercase tracking-tighter italic">Appliquée sur la barre et l'effet glow</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-mono text-[10px] text-white/50 uppercase">{accentColor}</span>
                        <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-10 h-10 rounded-xl bg-transparent border-2 border-white/10 cursor-pointer overflow-hidden p-0" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500 tracking-[0.2em]">
                      <span>Puissance du Flou</span>
                      <span className="text-white bg-indigo-600 px-2 py-0.5 rounded-md font-mono">{blurAmount}px</span>
                    </div>
                    <input type="range" min="0" max="40" value={blurAmount} onChange={(e) => setBlurAmount(e.target.value)} className="w-full accent-indigo-600 h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer hover:accent-white transition-all" />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500 tracking-[0.2em]">
                      <span>Transparence Fond</span>
                      <span className="text-white bg-indigo-600 px-2 py-0.5 rounded-md font-mono">{bgOpacity}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={bgOpacity} onChange={(e) => setBgOpacity(e.target.value)} className="w-full accent-indigo-600 h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer hover:accent-white transition-all" />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500 tracking-[0.2em]">
                      <span>Rayon de courbure</span>
                      <span className="text-white bg-indigo-600 px-2 py-0.5 rounded-md font-mono">{borderRadius}px</span>
                    </div>
                    <input type="range" min="0" max="40" value={borderRadius} onChange={(e) => setBorderRadius(e.target.value)} className="w-full accent-indigo-600 h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer hover:accent-white transition-all" />
                  </div>
                </div>

                <button onClick={saveDesign} disabled={loading} className="w-full py-5 bg-indigo-600 text-white rounded-[26px] font-black uppercase text-[11px] tracking-[0.3em] hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save size={18} />} 
                    {loading ? "Mise à jour..." : "Appliquer la configuration"}
                </button>
              </div>

              {/* --- COLONNE DE DROITE : LIVE PREVIEW (SLIM) --- */}
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[60px] bg-black/40 p-12 min-h-[450px] sticky top-12 overflow-hidden shadow-inner group transition-all">
                <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-all pointer-events-none duration-1000"></div>
                <p className="absolute top-10 text-[10px] font-black text-zinc-700 uppercase tracking-[0.6em] z-30 pointer-events-none">Zone OBS 400x125 pixels</p>
                
{/* WIDGET SLIM AVEC COVER DÉBORDANTE */}
<div 
  className={`relative flex items-center transition-all duration-1000 ${fontFamily}
    ${layout === 'minimal' ? 'flex-col w-[200px] p-5 text-center mt-10' : 'flex-row w-[380px] h-[100px] p-4'}
  `}
  style={{ 
    backgroundColor: `rgba(15, 17, 23, ${parseInt(bgOpacity)/100})`,
    borderRadius: `${borderRadius}px`,
    boxShadow: enableGlow ? `0 20px 50px -10px ${accentColor}55` : 'none',
    border: '1px solid rgba(255,255,255,0.08)',
    // Note : On ne met PAS overflow-hidden ici pour laisser la cover dépasser
  }}
>
  {/* FOND BLUR DYNAMIQUE (Lui doit rester masqué par les bords arrondis) */}
  {enableBlurBg && (
    <div className="absolute inset-0 z-0 overflow-hidden" style={{ borderRadius: `${borderRadius}px` }}>
      <div className="absolute inset-0 transition-all duration-[2000ms]"
        style={{
          backgroundImage: `url(${currentTrack?.albumImageUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop"})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: `blur(${blurAmount}px) brightness(0.35)`,
          transform: 'scale(1.2)'
        }}
      />
    </div>
  )}

  {/* POCHETTE QUI DÉPASSE */}
  {showCover && (
    <div className="relative z-30 shrink-0 mr-5 -ml-8 transition-transform duration-500">
      <img src={currentTrack?.albumImageUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop"} 
        // w-28 h-28 fait 112px, soit plus que les 100px de la carte
        className="w-28 h-28 object-cover shadow-[0_15px_35px_rgba(0,0,0,0.6)] border-2 border-white/10"
        style={{ 
          borderRadius: isRotating ? '999px' : `${Math.max(8, parseInt(borderRadius))}px`,
          animation: isRotating ? 'spin-slow 12s linear infinite' : 'none',
        }}
        alt="Album Cover"
      />
    </div>
  )}

  {/* TEXTES ET BARRE SLIM */}
  <div className="relative z-10 flex-1 min-w-0 flex flex-col justify-center">
    {showArtist && (
      <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.25em] mb-0.5 truncate italic">
        {currentTrack?.artist || "FOX STEVENSON"}
      </p>
    )}
    <h2 className="text-base font-black text-white truncate leading-tight uppercase italic tracking-tighter">
      {currentTrack?.title || "Don't Care Crown"}
    </h2>

    {showProgress && (
      <div className="mt-2.5 space-y-1.5">
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden backdrop-blur-sm">
          <div 
            className="h-full transition-all duration-1000 ease-out" 
            style={{ 
                backgroundColor: accentColor, 
                width: '60%', 
                boxShadow: `0 0 12px ${accentColor}` 
            }} 
          />
        </div>
        {showTimestamp && (
          <div className="flex justify-between text-[8px] font-black text-white/40 font-mono italic tracking-tight">
            <span className="bg-black/40 px-1.5 py-0.5 rounded">01:42</span>
            <span className="bg-black/40 px-1.5 py-0.5 rounded">03:15</span>
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
        
        /* Personnalisation de la Scrollbar pour les réglages */
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        input[type='range']::-webkit-slider-thumb {
            appearance: none;
            width: 14px;
            height: 14px;
            background: white;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            border: 2px solid #6366f1;
        }
      `}</style>
    </div>
  );
}