"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  Copy, CheckCircle2, ExternalLink, LayoutDashboard, Music,
  Palette, LogOut, Link as LinkIcon, Save, Layout, Eye, EyeOff,
  RotateCw, Type, Sparkles, Clock, Zap, Settings, Sliders,
  Check, Unlink, Image as ImageIcon, TrendingUp, Activity,
  MessageSquareText, BellRing
} from "lucide-react";

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "spotify", label: "Spotify API", icon: Music },
  { id: "design", label: "Design Widget", icon: Palette },
  { id: "chatbot", label: "Chatbot", icon: MessageSquareText },
];

const chatbotProviders = [
  {
    id: "wizebot",
    name: "Wizebot",
    label: "$urlcall",
    description: "Utilise une requête directe vers l’API et affiche le texte brut dans le chat.",
    preview: "Now playing: The Weeknd - Blinding Lights",
    endpoint: "URL de l’API",
    command: "$urlcall(https://votre-site.com/api/chatbot/wizebot?userId=YOUR_USER_ID)]",
    docsUrl: "https://panel.wizebot.tv/management_custom_commands",
    type: "text",
  },
  {
    id: "nightbot",
    name: "Nightbot",
    label: "$(urlfetch json)",
    description: "Récupère la chanson actuelle en JSON puis l’affiche dans le chat.",
    preview: "🎵 Nightbot: The Weekend - Blinding Lights",
    endpoint: "URL de l’API",
    command: "$(urlfetch json https://votre-site.com/api/chatbot/nightbot?userId=YOUR_USER_ID)",
    docsUrl: "https://nightbot.tv/commands/custom",
    type: "json",
  },
  {
    id: "streamelements",
    name: "StreamElements",
    label: "${customapi}",
    description: "Lit une réponse JSON pour le chat, l’overlay ou les widgets personnalisés.",
    preview: "🔊 StreamElements: The Weeknd - Blinding Lights",
    endpoint: "URL de l’API",
    command: "${customapi https://votre-site.com/api/chatbot/streamelements?userId=YOUR_USER_ID}",
    docsUrl: "https://dashboard.streamelements.com/dashboard/bot/commands/custom",
    type: "json",
  },
] as const;

export default function Dashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedBot, setSelectedBot] = useState("nightbot");
  const [customBotMessage, setCustomBotMessage] = useState("Now playing: {artist} - {title}");
  const [liveTrack, setLiveTrack] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [ideaDraft, setIdeaDraft] = useState("");
  const [savedIdeas, setSavedIdeas] = useState<string[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);

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

  const widgetUrl = typeof window !== "undefined"
    ? `${window.location.origin}/widget/${session?.user?.id}`
    : "";

  const redirectUri = typeof window !== "undefined"
    ? `${window.location.origin}/api/callback/spotify`
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

        if (data.botSettings?.customMessage) {
          setCustomBotMessage(data.botSettings.customMessage);
        }
      }
    } catch (e) {
      console.error("Erreur de chargement profil", e);
    }
  }, []);

  useEffect(() => {
    if (!session || activeTab !== "design") return;
    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/spotify/now-playing/${session.user.id}`);
        if (res.ok) setCurrentTrack(await res.json());
      } catch (e) {
        console.error("Erreur preview Spotify", e);
      }
    };

    fetchPreview();
    const interval = setInterval(fetchPreview, 5000);
    return () => clearInterval(interval);
  }, [session, activeTab]);

  useEffect(() => {
    if (session) loadUserData();
  }, [session, loadUserData]);

  useEffect(() => {
    if (!session || !isConnected || activeTab !== "chatbot") return;

    const fetchLiveTrack = async () => {
      try {
        const res = await fetch(`/api/spotify/now-playing/${session.user.id}`);
        if (res.ok) {
          const data = await res.json();
          setLiveTrack(data);
        }
      } catch (e) {
        console.error("Erreur chargement musique live", e);
      }
    };

    fetchLiveTrack();
    const interval = setInterval(fetchLiveTrack, 5000);
    return () => clearInterval(interval);
  }, [session, isConnected, activeTab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedIdeas = JSON.parse(localStorage.getItem("twitchify-ideas") || "[]");
    setSavedIdeas(Array.isArray(storedIdeas) ? storedIdeas : []);
  }, []);

  const handleCopyCommand = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCommand(command);
      setTimeout(() => setCopiedCommand(null), 1800);
    } catch (e) {
      console.error("Erreur lors de la copie de commande", e);
    }
  };

  const saveIdea = () => {
    if (!ideaDraft.trim()) return;
    const nextIdeas = [ideaDraft.trim(), ...savedIdeas].slice(0, 5);
    setSavedIdeas(nextIdeas);
    if (typeof window !== "undefined") localStorage.setItem("twitchify-ideas", JSON.stringify(nextIdeas));
    setIdeaDraft("");
  };

  const saveSpotifyKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/spotify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      if (res.ok) alert("Configuration Spotify enregistrée avec succès !");
    } catch (e) {
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectSpotify = async () => {
    if (!confirm("Voulez-vous vraiment vous déconnecter de Spotify ?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/spotify/disconnect", { method: "POST" });
      if (res.ok) {
        setIsConnected(false);
        alert("Compte Spotify déconnecté avec succès.");
      }
    } catch (e) {
      alert("Erreur lors de la déconnexion.");
    } finally {
      setLoading(false);
    }
  };

  const saveDesign = async () => {
    setLoading(true);
    try {
      await fetch("/api/user/design-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layout,
          fontFamily,
          showCover,
          showProgress,
          showTimestamp,
          showArtist,
          isRotating,
          enableGlow,
          enableBlurBg,
          accentColor,
          borderRadius,
          bgOpacity,
          blurAmount,
        }),
      });
      alert("Design du widget mis à jour !");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRedirectUri = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopiedUri(true);
      setTimeout(() => setCopiedUri(false), 2000);
    } catch (e) {
      console.error("Erreur de copie URL", e);
    }
  };

  const saveBotMessage = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/bot-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customMessage: customBotMessage }),
      });

      if (res.ok) {
        alert("Message personnalisé enregistré !");
      }
    } catch (e) {
      console.error("Erreur sauvegarde message bot", e);
      alert("Erreur lors de la sauvegarde du message.");
    } finally {
      setLoading(false);
    }
  };

  const getBotPreviewText = (providerId: string) => {
    const template = customBotMessage || "{artist} - {title}";
    const artist = liveTrack?.artist || "The Weeknd";
    const title = liveTrack?.title || "Blinding Lights";

    return template
      .replace("{artist}", artist)
      .replace("{title}", title)
      .replace("{song}", `${artist} - ${title}`);
  };

  const getBotCommand = (providerId: string) => {
    if (typeof window === "undefined") return "";

    const provider = chatbotProviders.find((item) => item.id === providerId) ?? chatbotProviders[0];
    const baseUrl = `${window.location.origin}/api/chatbot/${provider.id}?userId=${session?.user?.id ?? ""}`;

    if (provider.id === "wizebot") {
      return `$urlcall(${baseUrl})`;
    }

    if (provider.id === "nightbot") {
      return `$(urlfetch ${baseUrl})`;
    }

    return "${customapi." + baseUrl + "}"; 
  };

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b0d12] text-white gap-4">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px]">Chargement du Dashboard...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 overflow-hidden relative flex flex-col">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-purple-600/20 via-indigo-500/15 to-emerald-500/15 blur-[150px] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e15_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />

      <div className="relative max-w-6xl mx-auto px-6 py-6 w-full">
        <header className="flex items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
          <div className="flex items-center gap-3 font-black text-xl tracking-wider">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Music size={20} />
            </div>
            <span className="bg-gradient-to-r from-white via-zinc-200 to-purple-400 bg-clip-text text-transparent">
              Twichify
            </span>
          </div>

          <nav className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/60 p-1.5 backdrop-blur-md">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] transition ${
                  activeTab === id
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/70"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </nav>

          <div className="relative">
            <button
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="flex items-center gap-3 rounded-full border border-zinc-800 bg-zinc-950/70 p-2 shadow-lg shadow-black/30 transition hover:border-zinc-700"
            >
              <img src={session.user.image || ""} className="w-9 h-9 rounded-full border border-zinc-700 object-cover" alt="Profile" />
              <div className="hidden md:block text-left">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Compte</p>
                <p className="text-sm font-bold text-white">{session.user.name}</p>
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full z-50 mt-3 w-64 rounded-[24px] border border-zinc-800 bg-zinc-950/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    window.location.href = "/status";
                  }}
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm text-zinc-200 transition hover:bg-zinc-900/80"
                >
                  <span>Statut API</span>
                  <Activity size={14} className="text-emerald-400" />
                </button>

                <div className="my-2 h-px bg-zinc-800" />

                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm text-red-300 transition hover:bg-red-500/10"
                >
                  <span>Déconnexion</span>
                  <LogOut size={14} />
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="py-8">
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-purple-400">Centre de contrôle</p>
                  <h1 className="mt-2 text-4xl md:text-5xl font-black tracking-tighter text-white">Bienvenue à bord</h1>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-300 text-[10px] font-black uppercase tracking-[0.25em]">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Système en ligne
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  icon={<Activity className="text-emerald-400" />}
                  label="Connexion Spotify"
                  value={isConnected ? "Opérationnel" : "Non configuré"}
                  tone={isConnected ? "emerald" : "amber"}
                />
                <StatCard
                  icon={<TrendingUp className="text-purple-400" />}
                  label="Source Stream"
                  value="Widget V2"
                  tone="purple"
                />
                <StatCard
                  icon={<Settings className="text-amber-400" />}
                  label="Dernière mise à jour"
                  value="Juillet 2026"
                  tone="amber"
                />
              </div>

              <div
                className="group relative overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950/60 p-6 shadow-2xl shadow-black/30 cursor-pointer transition hover:border-purple-500/40"
                onClick={() => {
                  navigator.clipboard.writeText(widgetUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-purple-600/10 blur-3xl" />
                <div className="relative flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30">
                      {copied ? <CheckCircle2 size={28} /> : <LinkIcon size={28} />}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Lien OBS</p>
                      <p className="mt-1 text-lg font-bold text-white">
                        {copied ? "Lien copié dans le presse-papier" : "Cliquez pour copier l’URL du widget"}
                      </p>
                    </div>
                  </div>
                  <ExternalLink size={22} className="text-zinc-400 group-hover:text-white transition" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <QuickAction
                  icon={<Palette className="text-purple-400" />}
                  title="Personnaliser le design"
                  subtitle="Typographie, couleurs, flou et animations"
                  onClick={() => setActiveTab("design")}
                />
                <QuickAction
                  icon={<Music className="text-emerald-400" />}
                  title="Gérer la connexion Spotify"
                  subtitle="Client ID, Secret et OAuth"
                  onClick={() => setActiveTab("spotify")}
                />
              </div>
            </div>
          )}

          {/* ================= SECTION CHATBOT ================= */}
{activeTab === "chatbot" && (() => {
  const selectedProvider = chatbotProviders.find((provider) => provider.id === selectedBot) ?? chatbotProviders[0];
  const command = getBotCommand(selectedProvider.id);
  const previewText = getBotPreviewText(selectedProvider.id);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-purple-400">Intégration</p>
        <h1 className="mt-2 text-4xl font-black tracking-tighter text-white">Configuration Bot</h1>
      </div>

      {/* Container principal */}
      <div className="rounded-3xl border border-purple-500/20 bg-zinc-950 p-6 sm:p-8 shadow-2xl space-y-8">
        
        {/* Sélecteur de Bot */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Plateforme du bot</span>
          <div className="inline-flex flex-wrap justify-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 p-1.5">
            {chatbotProviders.map((provider) => {
              const isActive = selectedBot === provider.id;
              return (
                <button
                  key={provider.id}
                  onClick={() => setSelectedBot(provider.id)}
                  className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                    isActive
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                  }`}
                >
                  {provider.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Étapes de configuration */}
        <div className="space-y-5">

          {/* Étape 1 : Ouverture du Dashboard */}
          <div className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 transition-all duration-200 hover:border-purple-500/40 hover:bg-zinc-900/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-black text-xs">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Accéder au tableau de bord</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Rendez-vous dans la rubrique <strong className="text-zinc-200">Commandes personnalisées</strong> sur le site de {selectedProvider.name}.
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.open(selectedProvider.docsUrl, "_blank", "noopener,noreferrer")}
                className="flex items-center justify-center gap-2 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 px-4 py-2.5 text-xs font-bold text-purple-300 transition-colors shrink-0"
              >
                <MessageSquareText size={15} />
                Ouvrir {selectedProvider.name}
              </button>
            </div>
          </div>

          {/* Étape 2 : Copie du script */}
          <div className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 transition-all duration-200 hover:border-purple-500/40 hover:bg-zinc-900/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-black text-xs">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Ajouter la commande</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Créez une nouvelle commande (ex: <code className="text-purple-300 font-mono font-bold bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-500/20">!song</code>) et collez ce code dans le champ de réponse :
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleCopyCommand(command)}
                className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-4 py-2.5 text-xs font-bold text-white transition-colors shrink-0"
              >
                <Copy size={14} className="text-purple-400" />
                {copiedCommand === command ? "Copié !" : "Copier le script"}
              </button>
            </div>

            <div className="rounded-xl border border-purple-500/20 bg-zinc-950 p-4 font-mono text-xs text-purple-300 overflow-x-auto shadow-inner">
              <code>{command}</code>
            </div>
          </div>

          {/* Étape 3 : Message Personnalisé */}
          <div className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 space-y-4 transition-all duration-200 hover:border-purple-500/40 hover:bg-zinc-900/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-black text-xs">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Message de réponse</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Personnalisez le texte qui sera renvoyé dans le chat par le bot.</p>
                </div>
              </div>
              <button
                onClick={saveBotMessage}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50 shrink-0"
              >
                {loading ? "Enregistrement..." : "Enregistrer le message"}
              </button>
            </div>

            <textarea
              value={customBotMessage}
              onChange={(e) => setCustomBotMessage(e.target.value)}
              placeholder="Musique en cours : {song}"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/60 transition-all"
              rows={3}
            />

            <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Variables dynamiques :</span>
              {[
                { tag: '{artist}', label: 'Artiste' },
                { tag: '{title}', label: 'Titre' },
                { tag: '{song}', label: 'Artiste - Titre' },
              ].map((v) => (
                <span key={v.tag} className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-[11px] font-mono text-purple-300">
                  <strong>{v.tag}</strong>
                  <span className="text-[9px] text-zinc-400">({v.label})</span>
                </span>
              ))}
            </div>
          </div>

          {/* Aperçu Chat Twitch */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Rendu dans votre chat Twitch</span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Aperçu
              </span>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-purple-500/20 bg-purple-950/20 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white font-black shadow-md shadow-purple-600/30">
                <MessageSquareText size={16} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{selectedProvider.name}</span>
                  <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-purple-300 border border-purple-500/30">
                    BOT
                  </span>
                </div>
                <p className="text-xs text-zinc-200 break-words leading-relaxed">{previewText}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
})()}

          {activeTab === "spotify" && (
            <div className="space-y-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-purple-400">Paramètres API</p>
                <h1 className="mt-2 text-4xl font-black tracking-tighter text-white">Connectez Spotify</h1>
              </div> 

              <div className="rounded-[32px] border border-zinc-800 bg-zinc-950/60 p-8 shadow-2xl shadow-black/30">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <InfoStep
                    step="Étape 1"
                    title="Créer l’app"
                    text="Rendez-vous sur le Dashboard de Spotify Developer pour créer une application."
                    href="https://developer.spotify.com/dashboard"
                  />
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                    <span className="inline-flex rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-purple-300">Étape 2</span>
                    <h3 className="mt-3 text-base font-bold text-white">Redirect URI</h3>
                    <p className="mt-2 text-sm text-zinc-400">Ajoutez exactement cette URL dans votre app Spotify :</p>
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-700 bg-black/40 p-2">
                      <code className="flex-1 truncate text-[11px] text-zinc-200">{redirectUri}</code>
                      <button
                        onClick={handleCopyRedirectUri}
                        className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] transition ${copiedUri ? "bg-emerald-500/20 text-emerald-300" : "bg-purple-600 text-white"}`}
                      >
                        {copiedUri ? "Copié" : "Copier"}
                      </button>
                    </div>
                  </div>
                  <InfoStep
                    step="Prérequis"
                    title="Spotify Premium"
                    text="Un compte Spotify Premium actif est nécessaire pour lire la musique en direct via l’API web."
                    href="https://developer.spotify.com/documentation/web-api"
                    tone="amber"
                  />
                </div>

                <div className="rounded-[28px] border border-zinc-800 bg-black/20 p-6">
                  <div className="flex items-center gap-2 pb-4">
                    <Sliders size={16} className="text-purple-400" />
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-300">Identifiants d’accès</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Client ID</label>
                      <input
                        type="text"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="Ex: 8a4c..."
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-950/80 p-4 text-sm text-white outline-none transition focus:border-purple-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Client Secret</label>
                      <div className="relative">
                        <input
                          type={showClientSecret ? "text" : "password"}
                          value={clientSecret}
                          onChange={(e) => setClientSecret(e.target.value)}
                          placeholder="Ex: ••••••••••••••••"
                          className="w-full rounded-2xl border border-zinc-700 bg-zinc-950/80 p-4 pr-12 text-sm text-white outline-none transition focus:border-purple-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowClientSecret(!showClientSecret)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                        >
                          {showClientSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row gap-4 border-t border-zinc-800 pt-6">
                    <button
                      onClick={saveSpotifyKeys}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-black transition hover:bg-zinc-200 disabled:opacity-60"
                    >
                      <Save size={16} />
                      Sauvegarder
                    </button>

                    {isConnected ? (
                      <button
                        onClick={handleDisconnectSpotify}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-red-300 transition hover:bg-red-500/20"
                      >
                        <Unlink size={16} />
                        Se déconnecter
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          const res = await fetch("/api/spotify/auth-url");
                          const data = await res.json();
                          if (data.url) window.location.href = data.url;
                        }}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-[#1DB954] px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-black transition hover:bg-[#1ed760]"
                      >
                        <Music size={16} />
                        Associer mon compte
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "design" && (
            <div className="space-y-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-purple-400">Personnalisation</p>
                <h1 className="mt-2 text-4xl font-black tracking-tighter text-white">Design du widget</h1>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                <div className="rounded-[32px] border border-zinc-800 bg-zinc-950/60 p-8 shadow-2xl shadow-black/30 space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2"><Layout size={12} /> Structure</label>
                      <select value={layout} onChange={(e) => setLayout(e.target.value)} className="w-full rounded-2xl border border-zinc-700 bg-zinc-950/80 p-4 text-[10px] font-black uppercase tracking-[0.15em] text-white outline-none focus:border-purple-500">
                        <option value="default">Horizontal (Slim)</option>
                        <option value="minimal">Vertical (Compact)</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2"><Type size={12} /> Typographie</label>
                      <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full rounded-2xl border border-zinc-700 bg-zinc-950/80 p-4 text-[10px] font-black uppercase tracking-[0.15em] text-white outline-none focus:border-purple-500">
                        <option value="font-sans">Modern Sans</option>
                        <option value="font-mono">Retro Mono</option>
                        <option value="font-serif">Elegant Serif</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "cover", label: "Pochette", state: showCover, setter: setShowCover, icon: <ImageIcon size={14} /> },
                      { id: "artist", label: "Artiste", state: showArtist, setter: setShowArtist, icon: <Music size={14} /> },
                      { id: "progress", label: "Progression", state: showProgress, setter: setShowProgress, icon: <Zap size={14} /> },
                      { id: "time", label: "Horodatage", state: showTimestamp, setter: setShowTimestamp, icon: <Clock size={14} /> },
                      { id: "rotate", label: "Rotation CD", state: isRotating, setter: setIsRotating, icon: <RotateCw size={14} /> },
                      { id: "glow", label: "Effet néon", state: enableGlow, setter: setEnableGlow, icon: <Sparkles size={14} /> },
                      { id: "blur", label: "Flou fond", state: enableBlurBg, setter: setEnableBlurBg, icon: <Palette size={14} /> },
                    ].map((option) => (
                      <button
                        key={option.id}
                        onClick={() => option.setter(!option.state)}
                        className={`flex items-center justify-between rounded-2xl border p-4 text-[9px] font-black uppercase tracking-[0.18em] transition ${
                          option.state ? "border-purple-500/50 bg-purple-500/10 text-white" : "border-zinc-800 bg-zinc-900/40 text-zinc-500"
                        }`}
                      >
                        <span className="flex items-center gap-2">{option.icon} {option.label}</span>
                        {option.state ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-8 border-t border-zinc-800 pt-6">
                    <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-black/30 p-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Couleur d’accent</p>
                        <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-zinc-600">Mise en avant de la barre</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-zinc-300">{accentColor}</span>
                        <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-10 w-10 rounded-xl border-2 border-zinc-700 bg-transparent p-0" />
                      </div>
                    </div>

                    <SliderRow label="Puissance du flou" value={blurAmount} onChange={setBlurAmount} suffix="px" max={40} />
                    <SliderRow label="Transparence fond" value={bgOpacity} onChange={setBgOpacity} suffix="%" max={100} />
                    <SliderRow label="Rayon de courbure" value={borderRadius} onChange={setBorderRadius} suffix="px" max={40} />
                  </div>

                  <button
                    onClick={saveDesign}
                    disabled={loading}
                    className="w-full rounded-[24px] bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-[11px] font-black uppercase tracking-[0.25em] text-white transition hover:brightness-110 disabled:opacity-60"
                  >
                    {loading ? "Mise à jour..." : "Appliquer la configuration"}
                  </button>
                </div>

                <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[60px] bg-black/40 p-12 min-h-[450px] sticky top-12 overflow-hidden shadow-inner group transition-all">
                  <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-all pointer-events-none duration-1000"></div>
                  <p className="absolute top-10 text-[10px] font-black text-zinc-700 uppercase tracking-[0.6em] z-30 pointer-events-none">Zone OBS 475x125 pixels</p>
                  
                  <div 
                    className={`relative flex items-center transition-all duration-1000 ${fontFamily}
                      ${layout === 'minimal' ? 'flex-col w-[200px] p-5 text-center mt-10' : 'flex-row w-[380px] h-[100px] p-4'}
                    `}
                    style={{ 
                      backgroundColor: `rgba(15, 17, 23, ${parseInt(bgOpacity)/100})`,
                      borderRadius: `${borderRadius}px`,
                      boxShadow: enableGlow ? `0 20px 50px -10px ${accentColor}55` : 'none',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
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

                    {showCover && (
                      <div className="relative z-30 shrink-0 mr-5 -ml-8 transition-transform duration-500">
                        <img src={currentTrack?.albumImageUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop"} 
                          className="w-28 h-28 object-cover shadow-[0_15px_35px_rgba(0,0,0,0.6)] border-2 border-white/10"
                          style={{ 
                            borderRadius: isRotating ? '999px' : `${Math.max(8, parseInt(borderRadius))}px`,
                            animation: isRotating ? 'spin-slow 12s linear infinite' : 'none',
                          }}
                          alt="Album Cover"
                        />
                      </div>
                    )}

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
        </div>
      </div>
    </main>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "emerald" | "amber" | "purple" }) {
  const toneMap = {
    emerald: "border-emerald-500/20 bg-emerald-500/10",
    amber: "border-amber-500/20 bg-amber-500/10",
    purple: "border-purple-500/20 bg-purple-500/10",
  };

  return (
    <div className={`rounded-[28px] border ${toneMap[tone]} p-6 shadow-xl shadow-black/20`}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950/70 border border-zinc-800">{icon}</div>
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">{label}</p>
      <p className="mt-3 text-2xl font-black tracking-tighter text-white">{value}</p>
    </div>
  );
}

function QuickAction({ icon, title, subtitle, onClick }: { icon: React.ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center justify-between rounded-[28px] border border-zinc-800 bg-zinc-950/60 p-6 text-left transition hover:border-purple-500/40 hover:bg-zinc-950/80"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800">{icon}</div>
        <div>
          <h3 className="text-base font-bold text-white">{title}</h3>
          <p className="text-sm text-zinc-500">{subtitle}</p>
        </div>
      </div>
      <span className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">Ouvrir</span>
    </button>
  );
}

function InfoStep({ step, title, text, href, tone = "purple" }: { step: string; title: string; text: string; href: string; tone?: "purple" | "amber" }) {
  const toneMap = {
    purple: "border-purple-500/20 bg-purple-500/10 text-purple-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${toneMap[tone]}`}>{step}</span>
      <h3 className="mt-3 text-base font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{text}</p>
      <a href={href} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-purple-300">
        Ouvrir <ExternalLink size={12} />
      </a>
    </div>
  );
}

function SliderRow({ label, value, onChange, suffix, max }: { label: string; value: string; onChange: (value: string) => void; suffix: string; max: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
        <span>{label}</span>
        <span className="rounded-md bg-purple-600 px-2 py-1 text-white font-mono">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min="0"
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-1.5 w-full cursor-pointer accent-purple-600"
      />
    </div>
  );
}
