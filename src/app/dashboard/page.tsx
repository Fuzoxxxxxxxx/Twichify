"use client";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { 
  Copy, CheckCircle2, ExternalLink, 
  LayoutDashboard, Music, Palette, 
  Settings, LogOut, Link as LinkIcon,
  Save
} from "lucide-react";

export default function Dashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("overview");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // État pour la personnalisation du widget
  const [accentColor, setAccentColor] = useState("#22c55e");
  const [borderRadius, setBorderRadius] = useState("16");
  const [bgOpacity, setBgOpacity] = useState("80");

  // Charger les données existantes de l'utilisateur
  const loadUserData = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile"); // Assure-toi d'avoir cette route qui renvoie l'user
      if (res.ok) {
        const data = await res.json();
        if (data.spotifyClientId) setClientId(data.spotifyClientId);
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
      <div className="text-zinc-500 animate-pulse font-medium">Initialisation du Dashboard...</div>
    </div>
  );

  const widgetUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/widget/${session.user.id}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(widgetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveDesign = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/design-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accentColor, borderRadius, bgOpacity }),
      });
      if (res.ok) alert("Design mis à jour avec succès !");
    } catch (e) {
      alert("Erreur de sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const saveSpotifyKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/spotify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      if (res.ok) alert("Clés enregistrées !");
    } catch (e) {
      alert("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSpotify = async () => {
    const res = await fetch("/api/spotify/auth-url");
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  return (
    <div className="flex min-h-screen bg-[#0f1117] text-zinc-200">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-[#161922] border-r border-white/5 flex flex-col sticky top-0 h-screen">
        <div className="p-8 flex items-center gap-3 italic font-black text-xl tracking-tighter text-white">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center not-italic shadow-lg shadow-indigo-600/20">
            NP
          </div>
          NOWPLAYING
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Menu Principal</p>
          <button onClick={() => setActiveTab("overview")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "overview" ? "bg-indigo-600 text-white" : "hover:bg-white/5 text-zinc-400"}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>

          <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-8 mb-4">Configuration</p>
          <button onClick={() => setActiveTab("spotify")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "spotify" ? "bg-indigo-600 text-white" : "hover:bg-white/5 text-zinc-400"}`}>
            <Music size={20} /> Spotify API
          </button>
          <button onClick={() => setActiveTab("design")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "design" ? "bg-indigo-600 text-white" : "hover:bg-white/5 text-zinc-400"}`}>
            <Palette size={20} /> Design Widget
          </button>
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl">
            <img src={session.user.image || ""} className="w-10 h-10 rounded-full" alt="User" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-white">{session.user.name}</p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">Streamer</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-12 max-w-6xl">
        
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Dashboard</h1>
            <div className="bg-[#1c202a] p-6 rounded-[32px] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-[#232835] transition-all group" onClick={copyToClipboard}>
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition">
                  {copied ? <CheckCircle2 size={28} /> : <LinkIcon size={28} />}
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Lien du Widget OBS</p>
                  <p className="text-sm font-medium text-white">{copied ? "Lien copié dans le presse-papier !" : "Cliquez pour copier l'URL"}</p>
                </div>
              </div>
              <ExternalLink size={20} className="text-zinc-600 mr-4" />
            </div>
          </div>
        )}

        {activeTab === "spotify" && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Spotify API</h1>
            <div className="bg-[#1c202a] p-10 rounded-[40px] border border-white/5 space-y-8">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2 text-sm text-blue-400 bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
                  ⚠️ N'oubliez pas d'ajouter l'URL de redirection dans votre dashboard Spotify : <br/>
                  <span className="font-mono text-white text-xs">{typeof window !== 'undefined' ? window.location.origin : ''}/api/callback/spotify</span>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-2">Client ID</label>
                  <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full p-4 bg-black/30 rounded-2xl border border-white/10 focus:border-indigo-500 outline-none transition" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-2">Client Secret</label>
                  <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} className="w-full p-4 bg-black/30 rounded-2xl border border-white/10 focus:border-indigo-500 outline-none transition" />
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={saveSpotifyKeys} className="px-8 py-4 bg-white text-black rounded-2xl font-black hover:bg-zinc-200 transition">Sauvegarder</button>
                <button onClick={handleConnectSpotify} className="px-8 py-4 bg-green-500 text-black rounded-2xl font-black hover:bg-green-400 transition">Lier mon compte Spotify</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "design" && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Widget Design</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#1c202a] p-10 rounded-[40px] border border-white/5 space-y-8">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Couleur d'accentuation</label>
                  <div className="flex gap-3">
                    {["#22c55e", "#6366f1", "#f43f5e", "#eab308", "#ffffff"].map(c => (
                      <button key={c} onClick={() => setAccentColor(c)} className={`w-10 h-10 rounded-full border-2 ${accentColor === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Arrondi des coins ({borderRadius}px)</label>
                  <input type="range" min="0" max="40" value={borderRadius} onChange={(e) => setBorderRadius(e.target.value)} className="w-full accent-indigo-500" />
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Opacité du fond ({bgOpacity}%)</label>
                  <input type="range" min="0" max="100" value={bgOpacity} onChange={(e) => setBgOpacity(e.target.value)} className="w-full accent-indigo-500" />
                </div>
                
                <button 
                  onClick={saveDesign} 
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  <Save size={20} />
                  {loading ? "Sauvegarde..." : "Appliquer le design"}
                </button>
              </div>

              {/* LIVE PREVIEW */}
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[40px] p-10 bg-black/20">
                <p className="text-[10px] font-bold text-zinc-600 uppercase mb-8 tracking-widest">Aperçu en direct</p>
                <div 
                  className="flex items-center gap-4 p-4 text-white w-[350px] shadow-2xl transition-all duration-300"
                  style={{ 
                    backgroundColor: `rgba(28, 32, 42, ${parseInt(bgOpacity)/100})`,
                    borderRadius: `${borderRadius}px`,
                    backdropFilter: `blur(10px)`, 
                    WebkitBackdropFilter: `blur(10px)`
                  }}
                >
                  <div className="w-16 h-16 bg-white/5 rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/20 rounded w-3/4" />
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                    <div className="w-full bg-white/10 h-1 mt-3 rounded-full overflow-hidden">
                      <div className="h-full" style={{ backgroundColor: accentColor, width: '60%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}