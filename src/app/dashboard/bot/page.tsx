"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { Copy, MessageSquareText, Timer } from "lucide-react";
import { PageHeader, DashboardLoading, DashboardLoadError } from "@/components/dashboard/DashboardUI";
import { useToast, ToastDisplay } from "@/components/dashboard/useToast";
import { useWidgetToken } from "@/components/dashboard/useWidgetToken";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

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

// Numéro d'étape : la configuration d'un bot est une vraie séquence.
function StepNumber({ n, tone = "purple" }: { n: number; tone?: "purple" | "emerald" }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : "border-purple-500/30 bg-purple-500/10 text-purple-200";
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-display text-sm font-bold ${toneClass}`}
    >
      {n}
    </span>
  );
}

export default function DashboardBot() {
  const { data: session } = useSession();
  const { toast, showToast } = useToast();
  const { token: widgetToken, loading: tokenLoading } = useWidgetToken(!!session);

  const [selectedBot, setSelectedBot] = useState("nightbot");
  const [customBotMessage, setCustomBotMessage] = useState("Now playing: {artist} - {title}");
  const [liveTrack, setLiveTrack] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // Message du bot et état Spotify viennent du serveur : rien n'est affiché avant leur arrivée.
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  // Première réponse de la route now-playing (utilisée seulement si Spotify est connecté) : évite d'afficher un morceau d'exemple d'abord.
  const [liveLoaded, setLiveLoaded] = useState(false);

  const loadUserData = useCallback(async () => {
    setLoadState("loading");
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setIsConnected(!!data.hasSpotifyToken);
      if (data.botSettings?.customMessage) setCustomBotMessage(data.botSettings.customMessage);
      setLoadState("ready");
    } catch (e) {
      console.error("Erreur de chargement profil", e);
      setLoadState("error");
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
      } finally {
        setLiveLoaded(true);
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
  if (loadState === "loading" || tokenLoading) return <DashboardLoading eyebrow="Intégrations" title="Bot" />;
  if (loadState === "error") return <DashboardLoadError eyebrow="Intégrations" title="Bot" onRetry={loadUserData} />;

  // Connecté : on attend la vraie musique avant d'afficher l'aperçu (sinon on verrait d'abord un titre d'exemple).
  const previewPending = isConnected && !!widgetToken && !liveLoaded;

  const selectedProvider = chatbotProviders.find((provider) => provider.id === selectedBot) ?? chatbotProviders[0];
  const command = getBotCommand(selectedProvider.id);
  const previewText = getBotPreviewText();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Intégrations" title="Bot" />

      {/* Plateforme du bot */}
      <div className="flex flex-col gap-3">
        <p id="bot-provider-label" className="text-sm font-medium text-zinc-200">
          Plateforme du bot
        </p>
        <div
          role="group"
          aria-labelledby="bot-provider-label"
          className="flex w-fit flex-wrap gap-1 rounded-xl border border-white/10 p-1"
        >
          {chatbotProviders.map((provider) => {
            const isActive = selectedBot === provider.id;
            return (
              <button
                key={provider.id}
                onClick={() => setSelectedBot(provider.id)}
                aria-pressed={isActive}
                className={`cursor-pointer rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${FOCUS} ${
                  isActive ? "bg-white/[0.08] text-white" : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {provider.name}
              </button>
            );
          })}
        </div>
      </div>

      <ol className="space-y-4">
        {/* 1 */}
        <li className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3.5">
              <StepNumber n={1} />
              <div>
                <h2 className="text-base font-semibold text-white">Accéder au tableau de bord</h2>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  Rendez-vous dans la rubrique <strong className="font-semibold text-zinc-200">Commandes personnalisées</strong> sur le site de {selectedProvider.name}.
                </p>
              </div>
            </div>
            <button
              onClick={() => window.open(selectedProvider.docsUrl, "_blank", "noopener,noreferrer")}
              className={`flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:text-white ${FOCUS}`}
            >
              <MessageSquareText size={15} />
              Ouvrir {selectedProvider.name}
            </button>
          </div>
        </li>

        {/* 2 */}
        <li className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3.5">
              <StepNumber n={2} />
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                  <MessageSquareText size={15} className="text-purple-300" />
                  Réponse à la demande
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  Créez une <strong className="font-semibold text-zinc-200">Commande</strong> (ex :{" "}
                  <code className="rounded border border-purple-500/25 bg-purple-500/10 px-1.5 py-0.5 font-mono text-purple-200">!song</code>) : elle ne répond que quand un viewer la tape dans le chat. Collez ce script dans le champ de réponse :
                </p>
              </div>
            </div>
            <button
              onClick={() => handleCopyCommand(command)}
              className={`flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-500 ${FOCUS}`}
            >
              <Copy size={14} />
              {copiedCommand === command ? "Copié !" : "Copier le script"}
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-sm text-purple-200">
            <code>{command}</code>
          </div>
        </li>

        {/* 3 */}
        <li className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3.5">
              <StepNumber n={3} tone="emerald" />
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                  <Timer size={15} className="text-emerald-300" />
                  Réponse automatique <span className="font-normal text-zinc-400">(optionnel)</span>
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  Pour que le bot annonce la musique <strong className="font-semibold text-zinc-200">tout seul</strong>, sans qu'un viewer ait besoin de taper quoi que ce soit, créez plutôt un <strong className="font-semibold text-zinc-200">Timer</strong> (répondre toutes les X minutes) chez {selectedProvider.name}, avec exactement le même script :
                </p>
              </div>
            </div>
            <button
              onClick={() => handleCopyCommand(command)}
              className="flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            >
              <Copy size={14} />
              {copiedCommand === command ? "Copié !" : "Copier le même script"}
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-emerald-500/20 bg-black/40 p-4 font-mono text-sm text-emerald-200">
            <code>{command}</code>
          </div>

          <p className="text-sm leading-relaxed text-zinc-400">
            C'est le fait de le mettre dans un <strong className="font-semibold text-zinc-300">Timer</strong> plutôt qu'une <strong className="font-semibold text-zinc-300">Commande</strong> qui rend l'annonce automatique : le script est identique, rien d'autre à configurer chez nous.
          </p>
        </li>

        {/* 4 */}
        <li className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3.5">
              <StepNumber n={4} />
              <div>
                <h2 className="text-base font-semibold text-white">Message de réponse</h2>
                <p className="mt-1 text-sm text-zinc-400">Personnalisez le texte utilisé à la fois pour la commande et le timer.</p>
              </div>
            </div>
            <button
              onClick={saveBotMessage}
              disabled={loading}
              className={`flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-50 ${FOCUS}`}
            >
              {loading ? "Enregistrement..." : "Enregistrer le message"}
            </button>
          </div>

          <textarea
            value={customBotMessage}
            onChange={(e) => setCustomBotMessage(e.target.value)}
            aria-label="Message de réponse du bot"
            placeholder="Musique en cours : {song}"
            className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.02] p-4 text-base text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
            rows={3}
          />

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-sm text-zinc-400">Variables dynamiques :</span>
            {[
              { tag: "{artist}", label: "Artiste" },
              { tag: "{title}", label: "Titre" },
              { tag: "{song}", label: "Artiste - Titre" },
            ].map((v) => (
              <span
                key={v.tag}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/25 bg-purple-500/10 px-2.5 py-1 font-mono text-sm text-purple-200"
              >
                <strong>{v.tag}</strong>
                <span className="font-sans text-xs text-zinc-400">({v.label})</span>
              </span>
            ))}
          </div>
        </li>
      </ol>

      {/* Aperçu */}
      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Rendu dans votre chat Twitch</h2>
          <span className="flex items-center gap-1.5 text-sm text-zinc-400">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-400" />
            Aperçu
          </span>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-white">
            <MessageSquareText size={16} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{selectedProvider.name}</span>
              <span className="rounded border border-purple-500/30 bg-purple-500/15 px-1.5 py-0.5 text-xs font-semibold text-purple-200">
                BOT
              </span>
            </div>
            <p className="break-words text-sm leading-relaxed text-zinc-200">
              {previewPending ? <span className="twichify-skeleton inline-block h-3 w-48 rounded align-middle" /> : previewText}
            </p>
          </div>
        </div>
      </section>

      <ToastDisplay toast={toast} />
    </div>
  );
}
