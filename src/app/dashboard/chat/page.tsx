"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import {
  Palette, Sliders, Shield, Bot, Layout, Sparkles, Zap, Eye, EyeOff, Check,
  ChevronRight, MessageSquare, Clock, Save, RefreshCw,
} from "lucide-react";
import { PageHeader, SliderRow } from "@/components/dashboard/DashboardUI";
import { useToast, ToastDisplay } from "@/components/dashboard/useToast";
import { getChatThemeClasses } from "@/lib/chat-widget-theme";

export default function DashboardChat() {
  const { data: session } = useSession();
  const twitchLogin = (session?.user as any)?.name?.toLowerCase();
  const { toast, showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [chatTheme, setChatTheme] = useState("glass");
  const [chatFontSize, setChatFontSize] = useState("14");
  const [showBadges, setShowBadges] = useState(true);
  const [hideBots, setHideBots] = useState(false);
  const [chatAnimation, setChatAnimation] = useState("slide");
  const [hideCommands, setHideCommands] = useState(false);
  const [maxMessages, setMaxMessages] = useState("8");
  const [chatPosition, setChatPosition] = useState("bottom-left");
  const [chatWidgetWidth, setChatWidgetWidth] = useState("380");
  const [chatConfigSubTab, setChatConfigSubTab] = useState("apparence");

  const [showTimestamps, setShowTimestamps] = useState(false);
  const [showColors, setShowColors] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [charLimit, setCharLimit] = useState("0");
  const [roleHighlights, setRoleHighlights] = useState({
    moderator: { enabled: false, color: "#22c55e" },
    subscriber: { enabled: false, color: "#a855f7" },
    vip: { enabled: false, color: "#ec4899" },
    broadcaster: { enabled: false, color: "#ef4444" },
    bot: { enabled: false, color: "#f97316" },
  });
  const [moderationWordsText, setModerationWordsText] = useState("");
  const [moderationMode, setModerationMode] = useState<"hide" | "censor">("hide");
  const [messageLifetime, setMessageLifetime] = useState("15");
  const [showReplies, setShowReplies] = useState(false);
  const [highlightFirstMessage, setHighlightFirstMessage] = useState(false);
  const [ignoredUsersText, setIgnoredUsersText] = useState("");

  const [badgeMap, setBadgeMap] = useState<Record<string, Record<string, string>>>({});
  const [previewMessages, setPreviewMessages] = useState<any[]>([]);

  const loadUserData = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.chatWidgetSettings) {
          const c = data.chatWidgetSettings;
          setChatTheme(c.theme || "glass");
          setChatFontSize(c.fontSize || "14");
          setShowBadges(c.showBadges !== false);
          setHideBots(!!c.hideBots);
          setHideCommands(!!c.hideCommands);
          setChatAnimation(c.animation || "slide");
          setMaxMessages(c.maxMessages || "8");
          setChatPosition(c.position || "bottom-left");
          setChatWidgetWidth(c.widgetWidth || "380");
          setShowTimestamps(!!c.showTimestamps);
          setShowColors(c.showColors !== false);
          setCompactMode(!!c.compactMode);
          setCharLimit(String(c.charLimit ?? 0));
          if (c.roleHighlights) {
            setRoleHighlights({
              moderator: { enabled: !!c.roleHighlights.moderator?.enabled, color: c.roleHighlights.moderator?.color || "#22c55e" },
              subscriber: { enabled: !!c.roleHighlights.subscriber?.enabled, color: c.roleHighlights.subscriber?.color || "#a855f7" },
              vip: { enabled: !!c.roleHighlights.vip?.enabled, color: c.roleHighlights.vip?.color || "#ec4899" },
              broadcaster: { enabled: !!c.roleHighlights.broadcaster?.enabled, color: c.roleHighlights.broadcaster?.color || "#ef4444" },
              bot: { enabled: !!c.roleHighlights.bot?.enabled, color: c.roleHighlights.bot?.color || "#f97316" },
            });
          }
          setModerationWordsText((c.moderationWords || []).join(", "));
          setModerationMode(c.moderationMode === "censor" ? "censor" : "hide");
          setMessageLifetime(String(c.messageLifetime ?? 15));
          setShowReplies(!!c.showReplies);
          setHighlightFirstMessage(!!c.highlightFirstMessage);
          setIgnoredUsersText((c.ignoredUsers || []).join(", "));
        }
      }
    } catch (e) {
      console.error("Erreur de chargement profil", e);
    }
  }, []);

  useEffect(() => {
    if (session) loadUserData();
  }, [session, loadUserData]);

  useEffect(() => {
    if (!twitchLogin) return;
    fetch(`/api/twitch/badges/${twitchLogin}`)
      .then((r) => r.json())
      .then(setBadgeMap)
      .catch(() => setBadgeMap({}));
  }, [twitchLogin]);

  const saveChatDesign = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/chat-widget-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: chatTheme,
          fontSize: chatFontSize,
          showBadges,
          hideBots,
          hideCommands,
          animation: chatAnimation,
          maxMessages,
          position: chatPosition,
          widgetWidth: chatWidgetWidth,
          showTimestamps,
          showColors,
          compactMode,
          charLimit: Number(charLimit) || 0,
          messageLifetime: Number(messageLifetime) || 0,
          showReplies,
          highlightFirstMessage,
          ignoredUsers: ignoredUsersText
            .split(",")
            .map((u) => u.trim().replace(/^@/, ""))
            .filter(Boolean),
          roleHighlights,
          moderationWords: moderationWordsText
            .split(",")
            .map((w) => w.trim())
            .filter(Boolean),
          moderationMode,
        }),
      });

      if (res.ok) {
        showToast("Design du widget chat mis à jour !");
      } else {
        showToast("Erreur lors de la sauvegarde.", "error");
      }
    } catch (error) {
      console.error("Erreur saveChatDesign:", error);
      showToast("Erreur lors de la sauvegarde.", "error");
    } finally {
      setLoading(false);
    }
  };

  const getChatThemeClasses_ = () => getChatThemeClasses(chatTheme);

  const chatPresets = [
    { id: "streamer-pro", label: "Streamer Pro", desc: "Glass + slide", config: { theme: "glass", animation: "slide", fontSize: "14" } },
    { id: "minimaliste", label: "Minimaliste", desc: "Épuré + fondu", config: { theme: "epure", animation: "fade", fontSize: "13" } },
    { id: "compact-preset", label: "Compact", desc: "Dense, sans anim", config: { theme: "compact", animation: "none", fontSize: "12" } },
    { id: "arcade", label: "Arcade Rétro", desc: "Rétro + rebond", config: { theme: "retro", animation: "bounce", fontSize: "14" } },
    { id: "cyber", label: "Cyber Néon", desc: "Néon + glissement", config: { theme: "neon", animation: "slide", fontSize: "15" } },
    { id: "cosmic", label: "Cosmic", desc: "Aurora + fondu", config: { theme: "aurora", animation: "fade", fontSize: "14" } },
  ];

  const applyPreset = (config: { theme: string; animation: string; fontSize: string }) => {
    setChatTheme(config.theme);
    setChatAnimation(config.animation);
    setChatFontSize(config.fontSize);
  };

  const broadcasterBadgeUrl = badgeMap.broadcaster?.["1"];
  const modBadgeUrl = badgeMap.moderator ? Object.values(badgeMap.moderator)[0] : null;
  const vipBadgeUrl = badgeMap.vip ? Object.values(badgeMap.vip)[0] : null;
  const subBadgeUrl = badgeMap.subscriber ? Object.values(badgeMap.subscriber)[0] : null;

  const demoMessagePool = [
    { username: twitchLogin || "TonPseudo", color: "#8B5CF6", message: "Super stream aujourd'hui !", isBot: false, isCommand: false, badgeUrl: broadcasterBadgeUrl, role: "broadcaster" as const },
    { username: "Nightbot", color: "#a78bfa", message: "🎵 Now playing: Track - Artist", isBot: true, isCommand: false, badgeUrl: null, role: "bot" as const },
    { username: "ViewerFan22", color: "#22d3ee", message: "GG les gars 🔥", isBot: false, isCommand: false, badgeUrl: modBadgeUrl, role: "moderator" as const },
    { username: "VIPGamer", color: "#ec4899", message: "Hyyype ce moment 😍", isBot: false, isCommand: false, badgeUrl: vipBadgeUrl, role: "vip" as const },
    { username: "SubFan99", color: "#a855f7", message: "Merci pour le stream !", isBot: false, isCommand: false, badgeUrl: subBadgeUrl, role: "subscriber" as const, replyTo: { user: twitchLogin || "TonPseudo", body: "Super stream aujourd'hui !" } },
    { username: "SniperKiller67", color: "#22d3ee", message: "!discord", isBot: false, isCommand: true, badgeUrl: null, role: null },
    { username: "StreamElements", color: "#a78bfa", message: "PogChamp raid incoming!", isBot: true, isCommand: false, badgeUrl: null, role: "bot" as const },
    { username: "xX_Chatteur_Xx", color: "#f97316", message: "quelqu'un sait le nom de la track ?", isBot: false, isCommand: false, badgeUrl: null, role: null, replyTo: { user: "Nightbot", body: "🎵 Now playing: Track - Artist" } },
    { username: "LurkerPro", color: "#ec4899", message: "premier message du stream hehe", isBot: false, isCommand: false, badgeUrl: null, role: null, isFirst: true },
  ];

  const PREVIEW_MESSAGE_LIFETIME = 6000;
  const PREVIEW_SPAWN_INTERVAL = 2200;

  useEffect(() => {
    let counter = 0;

    const spawn = () => {
      const template = demoMessagePool[counter % demoMessagePool.length];
      counter++;

      if (hideBots && template.isBot) return;
      if (hideCommands && template.isCommand) return;

      const newMsg = {
        ...template,
        id: `preview-${Date.now()}-${counter}`,
        timestamp: Date.now(),
        removing: false,
      };

      setPreviewMessages((prev) => {
        const updated = [...prev, newMsg];
        const cap = maxMessages ? Number(maxMessages) : 8;
        return updated.length > cap + 3 ? updated.slice(-(cap + 3)) : updated;
      });
    };

    spawn();
    const spawnTimer = setInterval(spawn, PREVIEW_SPAWN_INTERVAL);

    const purgeTimer = setInterval(() => {
      const now = Date.now();
      setPreviewMessages((prev) =>
        prev.map((m) =>
          !m.removing && now - m.timestamp >= PREVIEW_MESSAGE_LIFETIME
            ? { ...m, removing: true }
            : m
        )
      );
    }, 1000);

    return () => {
      clearInterval(spawnTimer);
      clearInterval(purgeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideBots, hideCommands, maxMessages, twitchLogin, broadcasterBadgeUrl, modBadgeUrl]);

  useEffect(() => {
    const toRemove = previewMessages.filter((m) => m.removing);
    if (toRemove.length === 0) return;
    const timers = toRemove.map((m) =>
      setTimeout(() => {
        setPreviewMessages((prev) => prev.filter((msg) => msg.id !== m.id));
      }, 350)
    );
    return () => timers.forEach(clearTimeout);
  }, [previewMessages]);

  const positionMap: Record<string, string> = {
    "bottom-left": "justify-end items-start",
    "bottom-right": "justify-end items-end",
    "top-left": "justify-start items-start",
    "top-right": "justify-start items-end",
  };

  const positionLabelMap: Record<string, string> = {
    "top-left": "Haut Gauche",
    "top-right": "Haut Droite",
    "bottom-left": "Bas Gauche",
    "bottom-right": "Bas Droite",
  };

  const getPreviewHighlight = (role: string | null | undefined) => {
    if (!role) return null;
    const rh = roleHighlights as Record<string, { enabled: boolean; color: string }>;
    return rh[role]?.enabled ? rh[role].color : null;
  };

  const formatChatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  if (!session) return null;

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Widgets"
        title="Widget chat"
        action={
          <button
            onClick={saveChatDesign}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white text-black hover:bg-zinc-200 px-6 py-3 text-xs font-black uppercase tracking-[0.1em] shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">
        <div className="rounded-3xl border border-white/5 bg-zinc-900/40 p-8 shadow-2xl backdrop-blur-sm space-y-8">
          <div className="flex items-center gap-1.5 rounded-2xl border border-white/5 bg-black/30 p-1.5 flex-wrap">
            {[
              { id: "apparence", label: "Apparence", icon: Palette },
              { id: "comportement", label: "Comportement", icon: Sliders },
              { id: "roles", label: "Rôles", icon: Shield },
              { id: "moderation", label: "Modération", icon: Bot },
              { id: "position", label: "Position", icon: Layout },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setChatConfigSubTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                  chatConfigSubTab === id
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {chatConfigSubTab === "apparence" && (
            <div className="space-y-10 animate-in fade-in duration-300">
              <div className="space-y-4">
                <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <Sparkles size={14} className="text-violet-400" /> Presets rapides
                </label>
                <div className="flex flex-wrap gap-2">
                  {chatPresets.map((preset) => {
                    const isActive =
                      chatTheme === preset.config.theme &&
                      chatAnimation === preset.config.animation &&
                      chatFontSize === preset.config.fontSize;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => applyPreset(preset.config)}
                        className={`rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest border transition-all ${
                          isActive
                            ? "border-violet-500 bg-violet-500/15 text-violet-300"
                            : "border-white/10 bg-black/20 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                        }`}
                        title={preset.desc}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <Palette size={14} className="text-violet-400" /> Thème Visuel
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: "glass", label: "Glassmorphism", desc: "Verre flouté" },
                    { id: "dark", label: "Dark Clean", desc: "Fond uni sombre" },
                    { id: "neon", label: "Neon Cyber", desc: "Bordures lumineuses" },
                    { id: "transparent", label: "Invisible", desc: "Texte uniquement" },
                    { id: "compact", label: "Compact", desc: "Dense, sans marges" },
                    { id: "epure", label: "Épuré", desc: "Minimal, séparateur fin" },
                    { id: "retro", label: "Rétro Synthwave", desc: "Angles nets, néon rose" },
                    { id: "aurora", label: "Aurora", desc: "Dégradé violet/cyan" },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setChatTheme(theme.id)}
                      className={`flex flex-col items-start p-4 rounded-2xl border transition-all duration-200 text-left hover:scale-[1.02] active:scale-[0.98] ${
                        chatTheme === theme.id
                          ? "border-violet-500 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                          : "border-white/5 bg-black/20 hover:bg-white/5"
                      }`}
                    >
                      <span className={`text-[12px] font-bold ${chatTheme === theme.id ? "text-violet-400" : "text-zinc-300"}`}>
                        {theme.label}
                      </span>
                      <span className="text-[10px] text-zinc-500">{theme.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <Zap size={14} className="text-violet-400" /> Animation
                </label>
                <div className="relative">
                  <select
                    value={chatAnimation}
                    onChange={(e) => setChatAnimation(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-white/10 bg-zinc-950/80 p-4 pr-10 text-[11px] font-black uppercase tracking-widest text-white outline-none focus:border-violet-500/50 cursor-pointer"
                  >
                    <option value="slide">Glissement (Slide)</option>
                    <option value="fade">Fondu (Fade In)</option>
                    <option value="bounce">Rebond (Bounce)</option>
                    <option value="none">Aucune</option>
                  </select>
                  <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 rotate-90 pointer-events-none" />
                </div>
              </div>

              <SliderRow label="Taille de la police" value={chatFontSize} onChange={setChatFontSize} suffix="px" max={32} />

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowColors(!showColors)}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                    showColors
                      ? "border-violet-500/50 bg-violet-500/10 text-white shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                      : "border-white/5 bg-black/20 text-zinc-500 hover:bg-black/40 hover:text-zinc-300"
                  }`}
                >
                  <span className="flex items-center gap-2.5"><Palette size={16} /> Couleurs pseudo</span>
                  {showColors ? <Check size={16} className="text-violet-400" /> : <Eye size={16} />}
                </button>

                <button
                  onClick={() => setCompactMode(!compactMode)}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                    compactMode
                      ? "border-violet-500/50 bg-violet-500/10 text-white shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                      : "border-white/5 bg-black/20 text-zinc-500 hover:bg-black/40 hover:text-zinc-300"
                  }`}
                >
                  <span className="flex items-center gap-2.5"><Layout size={16} /> Mode compact</span>
                  {compactMode ? <Check size={16} className="text-violet-400" /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {chatConfigSubTab === "comportement" && (
            <div className="space-y-10 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowBadges(!showBadges)}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                    showBadges
                      ? "border-emerald-500/50 bg-emerald-500/10 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                      : "border-white/5 bg-black/20 text-zinc-500 hover:bg-black/40 hover:text-zinc-300"
                  }`}
                >
                  <span className="flex items-center gap-2.5"><Shield size={16} /> Badges</span>
                  {showBadges ? <Eye size={16} className="text-emerald-400" /> : <EyeOff size={16} />}
                </button>

                <button
                  onClick={() => setHideBots(!hideBots)}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                    hideBots
                      ? "border-violet-500/50 bg-violet-500/10 text-white shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                      : "border-white/5 bg-black/20 text-zinc-500 hover:bg-black/40 hover:text-zinc-300"
                  }`}
                >
                  <span className="flex items-center gap-2.5"><Bot size={16} /> Masquer Bots</span>
                  {hideBots ? <Check size={16} className="text-violet-400" /> : <Eye size={16} />}
                </button>

                <button
                  onClick={() => setHideCommands(!hideCommands)}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                    hideCommands
                      ? "border-cyan-500/50 bg-cyan-500/10 text-white shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                      : "border-white/5 bg-black/20 text-zinc-500 hover:bg-black/40 hover:text-zinc-300"
                  }`}
                >
                  <span className="flex items-center gap-2.5"><MessageSquare size={16} /> Masquer !cmd</span>
                  {hideCommands ? <Check size={16} className="text-cyan-400" /> : <Eye size={16} />}
                </button>

                <button
                  onClick={() => setShowTimestamps(!showTimestamps)}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                    showTimestamps
                      ? "border-amber-500/50 bg-amber-500/10 text-white shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                      : "border-white/5 bg-black/20 text-zinc-500 hover:bg-black/40 hover:text-zinc-300"
                  }`}
                >
                  <span className="flex items-center gap-2.5"><Clock size={16} /> Timestamps</span>
                  {showTimestamps ? <Check size={16} className="text-amber-400" /> : <Eye size={16} />}
                </button>
              </div>

              <SliderRow label="Messages affichés max" value={maxMessages} onChange={setMaxMessages} suffix="" max={20} />

              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  <span>Durée d'affichage</span>
                  <span className="rounded-md bg-purple-600 px-2 py-1 text-white font-mono">
                    {messageLifetime === "0" ? "Permanent" : `${messageLifetime} s`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={120}
                  step={5}
                  value={messageLifetime}
                  onChange={(e) => setMessageLifetime(e.target.value)}
                  className="twichify-slider h-1.5 w-full cursor-pointer"
                  style={{ background: `linear-gradient(to right, #9333ea ${(Number(messageLifetime) / 120) * 100}%, #3f3f46 ${(Number(messageLifetime) / 120) * 100}%)` }}
                />
                <p className="text-[10px] text-zinc-600">0 = les messages ne disparaissent jamais (seuls les plus récents restent visibles).</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowReplies(!showReplies)}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                    showReplies
                      ? "border-cyan-500/50 bg-cyan-500/10 text-white shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                      : "border-white/5 bg-black/20 text-zinc-500 hover:bg-black/40 hover:text-zinc-300"
                  }`}
                >
                  <span className="flex items-center gap-2.5"><MessageSquare size={16} /> Afficher réponses</span>
                  {showReplies ? <Check size={16} className="text-cyan-400" /> : <Eye size={16} />}
                </button>

                <button
                  onClick={() => setHighlightFirstMessage(!highlightFirstMessage)}
                  className={`flex items-center justify-between rounded-2xl border p-4 text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                    highlightFirstMessage
                      ? "border-amber-500/50 bg-amber-500/10 text-white shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                      : "border-white/5 bg-black/20 text-zinc-500 hover:bg-black/40 hover:text-zinc-300"
                  }`}
                >
                  <span className="flex items-center gap-2.5"><Sparkles size={16} /> 1er message</span>
                  {highlightFirstMessage ? <Check size={16} className="text-amber-400" /> : <Eye size={16} />}
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  <span>Limite de caractères</span>
                  <span className="rounded-md bg-purple-600 px-2 py-1 text-white font-mono">
                    {charLimit === "0" ? "Illimité" : `${charLimit} car.`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={300}
                  step={10}
                  value={charLimit}
                  onChange={(e) => setCharLimit(e.target.value)}
                  className="twichify-slider h-1.5 w-full cursor-pointer"
                  style={{ background: `linear-gradient(to right, #9333ea ${(Number(charLimit) / 300) * 100}%, #3f3f46 ${(Number(charLimit) / 300) * 100}%)` }}
                />
                <p className="text-[10px] text-zinc-600">0 = illimité. Les messages plus longs sont tronqués avec …</p>
              </div>
            </div>
          )}

          {chatConfigSubTab === "roles" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Shield size={14} className="text-violet-400" /> Surbrillance par rôle
              </label>
              <p className="text-[11px] text-zinc-600 -mt-2">
                Les messages des rôles activés sont mis en avant avec une bordure et un fond teintés. Priorité : Streamer &gt; Modérateur &gt; VIP &gt; Sub.
              </p>

              {([
                { key: "broadcaster", label: "Streamer" },
                { key: "moderator", label: "Modérateur" },
                { key: "vip", label: "VIP" },
                { key: "subscriber", label: "Abonné" },
                { key: "bot", label: "Bot" },
              ] as const).map(({ key, label }) => {
                const role = roleHighlights[key];
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between rounded-2xl border p-4 transition-all duration-200 ${
                      role.enabled
                        ? "border-violet-500/50 bg-violet-500/10"
                        : "border-white/5 bg-black/20"
                    }`}
                  >
                    <button
                      onClick={() =>
                        setRoleHighlights((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], enabled: !prev[key].enabled },
                        }))
                      }
                      className="flex items-center gap-2.5 text-[11px] font-black uppercase tracking-widest text-white"
                    >
                      {role.enabled ? <Check size={16} className="text-violet-400" /> : <EyeOff size={16} className="text-zinc-500" />}
                      {label}
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-zinc-400">{role.color}</span>
                      <input
                        type="color"
                        value={role.color}
                        onChange={(e) =>
                          setRoleHighlights((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], color: e.target.value },
                          }))
                        }
                        className="h-9 w-9 rounded-lg border-2 border-zinc-700 bg-transparent p-0 cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {chatConfigSubTab === "moderation" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Bot size={14} className="text-violet-400" /> Filtre de mots
              </label>
              <p className="text-[11px] text-zinc-600 -mt-2">
                Tout message contenant l'un de ces mots (insensible à la casse) sera filtré selon le mode choisi ci-dessous. Sépare les mots par des virgules.
              </p>
              <textarea
                value={moderationWordsText}
                onChange={(e) => setModerationWordsText(e.target.value)}
                placeholder="ex: motinterdit1, motinterdit2, spam"
                rows={5}
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 p-4 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500/50 transition-all resize-none"
              />
              <p className="text-[10px] text-zinc-600">
                {moderationWordsText.split(",").map((w) => w.trim()).filter(Boolean).length} mot(s) actuellement filtré(s)
              </p>

              <div className="space-y-3">
                <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                  Comportement du filtre
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setModerationMode("hide")}
                    className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all duration-200 ${
                      moderationMode === "hide"
                        ? "border-violet-500/50 bg-violet-500/10 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                        : "border-white/5 bg-black/20 hover:bg-black/40"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white">
                      {moderationMode === "hide" && <Check size={14} className="text-violet-400" />}
                      Masquer le message
                    </span>
                    <span className="text-[10px] text-zinc-500">Le message entier disparaît du widget.</span>
                  </button>
                  <button
                    onClick={() => setModerationMode("censor")}
                    className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all duration-200 ${
                      moderationMode === "censor"
                        ? "border-violet-500/50 bg-violet-500/10 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                        : "border-white/5 bg-black/20 hover:bg-black/40"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white">
                      {moderationMode === "censor" && <Check size={14} className="text-violet-400" />}
                      Censurer le mot
                    </span>
                    <span className="text-[10px] text-zinc-500">Seul le mot est remplacé par des ****, le reste du message reste visible.</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4 border-t border-white/5 pt-6">
                <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <Shield size={14} className="text-violet-400" /> Utilisateurs ignorés
                </label>
                <p className="text-[11px] text-zinc-600 -mt-2">
                  Les messages de ces pseudos ne s'affichent jamais dans le widget (ex : tes bots, un troll). Sépare les pseudos par des virgules.
                </p>
                <textarea
                  value={ignoredUsersText}
                  onChange={(e) => setIgnoredUsersText(e.target.value)}
                  placeholder="ex: nightbot, streamelements, pseudo_troll"
                  rows={3}
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 p-4 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-500/50 transition-all resize-none"
                />
                <p className="text-[10px] text-zinc-600">
                  {ignoredUsersText.split(",").map((u) => u.trim()).filter(Boolean).length} pseudo(s) ignoré(s)
                </p>
              </div>
            </div>
          )}

          {chatConfigSubTab === "position" && (
            <div className="space-y-10 animate-in fade-in duration-300">
              <div className="space-y-4">
                <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <Layout size={14} className="text-violet-400" /> Position à l'écran
                </label>
                <div className="relative aspect-video rounded-2xl border border-white/10 bg-black/30 p-3">
                  <div className="absolute inset-3 grid grid-cols-2 grid-rows-2 gap-2">
                    {[
                      { id: "top-left", justify: "justify-start items-start" },
                      { id: "top-right", justify: "justify-end items-start" },
                      { id: "bottom-left", justify: "justify-start items-end" },
                      { id: "bottom-right", justify: "justify-end items-end" },
                    ].map((pos) => (
                      <div key={pos.id} className={`flex ${pos.justify}`}>
                        <button
                          onClick={() => setChatPosition(pos.id)}
                          title={positionLabelMap[pos.id]}
                          className={`w-6 h-6 rounded-md border-2 transition-all ${
                            chatPosition === pos.id
                              ? "border-violet-500 bg-violet-500/40 shadow-[0_0_12px_rgba(139,92,246,0.5)]"
                              : "border-white/15 bg-white/5 hover:bg-white/10"
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="absolute bottom-1 right-1 text-[8px] font-black text-zinc-700 uppercase tracking-widest">
                    Zone OBS
                  </p>
                </div>
                <p className="text-[10px] text-zinc-500 text-center">
                  {positionLabelMap[chatPosition]}
                </p>
              </div>

              <SliderRow label="Largeur du widget" value={chatWidgetWidth} onChange={setChatWidgetWidth} suffix="px" max={600} />
            </div>
          )}
        </div>

        <div className="relative flex flex-col border border-white/10 rounded-3xl bg-zinc-950/80 min-h-[500px] sticky top-28 overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />

          <div className="relative z-30 flex items-center justify-between px-6 pt-6">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Aperçu OBS {twitchLogin ? `· #${twitchLogin}` : "· chargement…"}
            </p>
            <button
              onClick={() => setPreviewMessages([])}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-violet-400 transition-colors"
            >
              <RefreshCw size={12} /> Vider
            </button>
          </div>

          <div className={`relative z-10 flex-1 flex flex-col p-6 ${positionMap[chatPosition] || positionMap["bottom-left"]}`}>
            <div className={`${compactMode ? "space-y-1" : "space-y-3"}`} style={{ maxWidth: `${chatWidgetWidth}px`, width: "100%" }}>
              {previewMessages.slice(-(maxMessages ? Number(maxMessages) : 8)).map((msg) => {
                const isFirstHighlighted = highlightFirstMessage && !!msg.isFirst;
                const highlightColor = getPreviewHighlight(msg.role) ?? (isFirstHighlighted ? "#facc15" : null);
                const charLimitNum = Number(charLimit) || 0;
                const displayMessage = charLimitNum > 0 && msg.message.length > charLimitNum
                  ? msg.message.slice(0, charLimitNum) + "…"
                  : msg.message;
                return (
                  <div
                    key={msg.id}
                    className={`${compactMode ? "px-2.5 py-1.5 gap-0.5" : "p-3 gap-1"} flex flex-col transition-all ${getChatThemeClasses_()} ${
                      msg.removing
                        ? (chatAnimation === "slide" ? "msg-out-slide" : chatAnimation === "fade" ? "msg-out-fade" : chatAnimation === "bounce" ? "msg-out-bounce" : "msg-out-instant")
                        : (chatAnimation === "slide" ? "msg-in-slide" : chatAnimation === "fade" ? "msg-in-fade" : chatAnimation === "bounce" ? "msg-in-bounce" : "")
                    }`}
                    style={{
                      fontSize: `${chatFontSize}px`,
                      borderColor: highlightColor
                        ? highlightColor
                        : ["dark", "neon", "outline"].includes(chatTheme) ? msg.color : "rgba(255,255,255,0.1)",
                      ...(highlightColor && {
                        boxShadow: `inset 3px 0 0 0 ${highlightColor}`,
                        backgroundColor: `${highlightColor}14`,
                      }),
                    }}
                  >
                    {showReplies && msg.replyTo && (
                      <div className="flex items-center gap-1.5 truncate border-l-2 border-white/20 pl-2 text-[0.75em] text-zinc-400">
                        <span className="opacity-70">↪</span>
                        <span className="font-semibold text-zinc-300">@{msg.replyTo.user}</span>
                        <span className="truncate">{msg.replyTo.body}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {showBadges && msg.badgeUrl && (
                        <img src={msg.badgeUrl} alt="badge" className="w-4 h-4 object-contain" />
                      )}
                      {showBadges && !msg.badgeUrl && (
                        <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                      )}
                      <span className="font-bold drop-shadow-sm" style={{ color: showColors ? msg.color : "#FFFFFF" }}>
                        {msg.username}
                      </span>
                      {isFirstHighlighted && (
                        <span className="rounded-full border border-amber-400/40 bg-amber-400/20 px-1.5 py-[1px] text-[0.6em] font-black uppercase tracking-wider text-amber-300">
                          Nouveau
                        </span>
                      )}
                      {showTimestamps && (
                        <span className="text-[0.75em] text-zinc-400/70 font-mono ml-auto shrink-0">
                          {formatChatTimestamp(msg.timestamp)}
                        </span>
                      )}
                    </div>
                    <span className="text-zinc-200 break-words leading-snug">{displayMessage}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {!twitchLogin && (
            <p className="relative z-20 text-center text-[10px] text-zinc-600 pb-4">
              Connecte-toi avec Twitch pour voir tes vrais badges dans l'aperçu.
            </p>
          )}
        </div>
      </div>

      <ToastDisplay toast={toast} />
    </div>
  );
}
