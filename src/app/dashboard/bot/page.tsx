"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { Copy, MessageSquareText, Timer } from "lucide-react";
import { PageHeader } from "@/components/dashboard/DashboardUI";
import { useToast, ToastDisplay } from "@/components/dashboard/useToast";
import { useWidgetToken } from "@/components/dashboard/useWidgetToken";

const chatbotProviders = [
  {
    id: "wizebot",
    name: "Wizebot",
    docsUrl: "https://panel.wizebot.tv/management_custom_commands",
  },
  {
    id: "nightbot",
    name: "Nightbot",
    docsUrl: "https://nightbot.tv/commands/custom",
  },
  {
    id: "streamelements",
    name: "StreamElements",
    docsUrl: "https://dashboard.streamelements.com/dashboard/bot/commands/custom",
  },
] as const;

export default function DashboardBot() {
  const { data: session } = useSession();
  const { toast, showToast } = useToast();
  const { token: widgetToken } = useWidgetToken(!!session);

  const [selectedBot, setSelectedBot] = useState("nightbot");
  const [customBotMessage, setCustomBotMessage] = useState("Now playing: {artist} - {title}");
  const [liveTrack, setLiveTrack] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const loadUserData = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setIsConnected(!!data.hasSpotifyToken);
        if (data.botSettings?.customMessage) setCustomBotMessage(data.botSettings.customMessage);
      }
    } catch (e) {
      console.error("Erreur de chargement profil", e);
    }
  }, []);

  useEffect(() => {
    if (session) loadUserData();
  }, [session, loadUserData]);

  useEffect(() => {
    if (!session || !isConnected || !widgetToken) return;

    const fetchLiveTrack = async () => {
      try {
        const res = await fetch(`/api/spotify/now-playing/${widgetToken}`);
        if (res.ok) setLiveTrack(await res.json());
      } catch (e) {
        console.error("Erreur chargement musique live", e);
      }
    };

    fetchLiveTrack();
    const interval = setInterval(fetchLiveTrack, 5000);
    return () => clearInterval(interval);
  }, [session, isConnected, widgetToken]);

  const handleCopyCommand = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCommand(command);
      setTimeout(() => setCopiedCommand(null), 1800);
    } catch (e) {
      console.error("Erreur lors de la copie de commande", e);
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
      if (res.ok) showToast("Message personnalisé enregistré !");
      else showToast("Erreur lors de la sauvegarde.", "error");
    } catch (e) {
      console.error("Erreur sauvegarde message bot", e);
      showToast("Erreur lors de la sauvegarde du message.", "error");
    } finally {
      setLoading(false);
    }
  };

  const getBotPreviewText = () => {
    const template = customBotMessage || "{artist} - {title}";
    const artist = liveTrack?.artist || "The Weeknd";
    const title = liveTrack?.title || "Blinding Lights";

    return template
      .replace("{artist}", artist)
      .replace("{title}", title)
      .replace("{song}", `${artist} - ${title}`);
  };

  const getBotCommand = (providerId: string) => {
    if (typeof window === "undefined" || !widgetToken) return "";

    const provider = chatbotProviders.find((item) => item.id === providerId) ?? chatbotProviders[0];
    const baseUrl = `${window.location.origin}/api/chatbot/${provider.id}?userId=${widgetToken}`;

    if (provider.id === "wizebot") return `$urlcall(${baseUrl})`;
    if (provider.id === "nightbot") return `$(urlfetch ${baseUrl})`;
    return "${customapi." + baseUrl + "}";
  };

  if (!session) return null;

  const selectedProvider = chatbotProviders.find((provider) => provider.id === selectedBot) ?? chatbotProviders[0];
  const command = getBotCommand(selectedProvider.id);
  const previewText = getBotPreviewText();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Intégrations" title="Bot" />

      <div className="rounded-3xl border border-purple-500/20 bg-zinc-950 p-6 sm:p-8 shadow-2xl space-y-8">
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

        <div className="space-y-5">
          <div className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 transition-all duration-200 hover:border-purple-500/40 hover:bg-zinc-900/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-black text-xs">1</span>
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

          <div className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 transition-all duration-200 hover:border-purple-500/40 hover:bg-zinc-900/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-black text-xs">2</span>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <MessageSquareText size={14} className="text-purple-400" />
                    Réponse à la demande
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Créez une <strong className="text-zinc-200">Commande</strong> (ex: <code className="text-purple-300 font-mono font-bold bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-500/20">!song</code>) : elle ne répond que quand un viewer la tape dans le chat. Collez ce script dans le champ de réponse :
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

          <div className="group rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-5 transition-all duration-200 hover:border-emerald-500/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black text-xs">3</span>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Timer size={14} className="text-emerald-400" />
                    Réponse automatique <span className="text-zinc-500 font-normal">(optionnel)</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Pour que le bot annonce la musique <strong className="text-zinc-200">tout seul</strong>, sans qu'un viewer ait besoin de taper quoi que ce soit, créez plutôt un <strong className="text-zinc-200">Timer</strong> (répondre toutes les X minutes) chez {selectedProvider.name}, avec exactement le même script :
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleCopyCommand(command)}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 px-4 py-2.5 text-xs font-bold text-emerald-200 transition-colors shrink-0"
              >
                <Copy size={14} className="text-emerald-300" />
                {copiedCommand === command ? "Copié !" : "Copier le même script"}
              </button>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-zinc-950 p-4 font-mono text-xs text-emerald-300 overflow-x-auto shadow-inner">
              <code>{command}</code>
            </div>

            <p className="text-[10px] text-zinc-500 leading-relaxed">
              C'est le fait de le mettre dans un <strong className="text-zinc-400">Timer</strong> plutôt qu'une <strong className="text-zinc-400">Commande</strong> qui rend l'annonce automatique — le script est identique, rien d'autre à configurer chez nous.
            </p>
          </div>

          <div className="group rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 space-y-4 transition-all duration-200 hover:border-purple-500/40 hover:bg-zinc-900/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-black text-xs">4</span>
                <div>
                  <h3 className="text-sm font-bold text-white">Message de réponse</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Personnalisez le texte utilisé à la fois pour la commande et le timer.</p>
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

      <ToastDisplay toast={toast} />
    </div>
  );
}
