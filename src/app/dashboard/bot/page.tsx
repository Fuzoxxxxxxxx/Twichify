"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { ExternalLink, Save } from "lucide-react";
import { PageHeader, DashboardLoading, DashboardLoadError } from "@/components/dashboard/DashboardUI";
import { useToast, ToastDisplay } from "@/components/dashboard/useToast";
import UnsavedChangesBar, { useUnsavedChangesGuard } from "@/components/dashboard/UnsavedChangesBar";
import { useWidgetToken } from "@/components/dashboard/useWidgetToken";
import { StepRail } from "@/components/dashboard/StepRail";
import { ACTION_BTN, MaskedField, StatusPill } from "@/components/dashboard/WidgetUI";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

// Même message que celui que la route du bot envoie tant que rien n'est enregistré.
const DEFAULT_MESSAGE = "Musique en cours : {song}";
// Limite d'un message Twitch.
const TWITCH_MAX = 500;
const LIVE_POLL_MS = 8000;

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

const SCRIPT_MODES = [
  { id: "command", title: "Commande", desc: "Répond quand un viewer tape la commande dans le chat" },
  { id: "timer", title: "Timer", desc: "Annonce la musique toute seule, toutes les X minutes" },
] as const;

const VARIABLES = [
  { tag: "{artist}", label: "Artiste" },
  { tag: "{title}", label: "Titre" },
  { tag: "{song}", label: "Artiste - Titre" },
] as const;

// Un seul passage, et une fonction de remplacement : un titre contenant « $& » ou « $$ » n'est pas altéré,
// et une variable utilisée deux fois est remplacée partout (comme dans la vraie réponse du bot).
function renderTemplate(template: string, artist: string, title: string): string {
  return template.replace(/\{(artist|title|song)\}/g, (_match, key: string) =>
    key === "artist" ? artist : key === "title" ? title : `${artist} - ${title}`
  );
}

export default function DashboardBot() {
  const { data: session } = useSession();
  const { toast, showToast } = useToast();
  const { token: widgetToken, loading: tokenLoading } = useWidgetToken(!!session);

  const [selectedBot, setSelectedBot] = useState<(typeof chatbotProviders)[number]["id"]>("nightbot");
  const [scriptMode, setScriptMode] = useState<(typeof SCRIPT_MODES)[number]["id"]>("command");
  const [customBotMessage, setCustomBotMessage] = useState(DEFAULT_MESSAGE);
  const [savedMessage, setSavedMessage] = useState(DEFAULT_MESSAGE);
  const [liveTrack, setLiveTrack] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  // Message du bot et état Spotify viennent du serveur : rien n'est affiché avant leur arrivée.
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  // Première réponse de la route now-playing (utilisée seulement si Spotify est connecté) : évite d'afficher un morceau d'exemple d'abord.
  const [liveLoaded, setLiveLoaded] = useState(false);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const loadUserData = useCallback(async () => {
    setLoadState("loading");
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setIsConnected(!!data.hasSpotifyToken);
      const message = data.botSettings?.customMessage || DEFAULT_MESSAGE;
      setCustomBotMessage(message);
      setSavedMessage(message);
      setLoadState("ready");
    } catch (e) {
      console.error("Erreur de chargement profil", e);
      setLoadState("error");
    }
  }, []);

  // Booléen (et non l'objet `session`, recréé à chaque retour sur l'onglet) : sinon le message serait rechargé,
  // et les modifications non enregistrées écrasées, chaque fois qu'on revient sur la page.
  const signedIn = !!session;
  useEffect(() => {
    if (signedIn) loadUserData();
  }, [signedIn, loadUserData]);

  // Confirmation avant de quitter la page avec un message non enregistré.
  useUnsavedChangesGuard(customBotMessage !== savedMessage);

  useEffect(() => {
    if (!signedIn || !isConnected || !widgetToken) return;

    const fetchLiveTrack = async () => {
      if (document.visibilityState !== "visible") return;
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
    const interval = setInterval(fetchLiveTrack, LIVE_POLL_MS);
    return () => clearInterval(interval);
  }, [signedIn, isConnected, widgetToken]);

  const saveBotMessage = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/bot-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customMessage: customBotMessage }),
      });
      if (res.ok) {
        setSavedMessage(customBotMessage);
        showToast("Message enregistré.");
      } else showToast("Erreur lors de la sauvegarde.", "error");
    } catch (e) {
      console.error("Erreur sauvegarde message bot", e);
      showToast("Erreur lors de la sauvegarde du message.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Insère une variable à l'endroit du curseur (ou remplace la sélection) puis remet le curseur juste après.
  const insertVariable = (tag: string) => {
    const el = messageRef.current;
    if (!el) {
      setCustomBotMessage((m) => m + tag);
      return;
    }
    const start = el.selectionStart ?? customBotMessage.length;
    const end = el.selectionEnd ?? customBotMessage.length;
    setCustomBotMessage(customBotMessage.slice(0, start) + tag + customBotMessage.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + tag.length;
      el.setSelectionRange(pos, pos);
    });
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

  const selectedProvider = chatbotProviders.find((provider) => provider.id === selectedBot) ?? chatbotProviders[0];
  const command = getBotCommand(selectedProvider.id);

  // Connecté : on attend la vraie musique avant d'afficher l'aperçu (sinon on verrait d'abord un titre d'exemple).
  const previewPending = isConnected && !!widgetToken && !liveLoaded;
  const hasLive = isConnected && !!liveTrack?.isPlaying && !!liveTrack?.title;
  const previewArtist = hasLive ? liveTrack.artist || "" : "The Weeknd";
  const previewTitle = hasLive ? liveTrack.title : "Blinding Lights";
  const previewText = renderTemplate(customBotMessage || DEFAULT_MESSAGE, previewArtist, previewTitle);

  const dirty = customBotMessage !== savedMessage;
  const canSave = dirty && customBotMessage.trim() !== "" && !saving;
  const mode = SCRIPT_MODES.find((m) => m.id === scriptMode) ?? SCRIPT_MODES[0];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Intégrations" title="Bot" />

      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        <StepRail index={1} state="plain" title="Choisis ta plateforme">
          <div className="flex flex-wrap items-center gap-3">
            <div role="group" aria-label="Plateforme du bot" className="flex flex-wrap gap-1 rounded-xl border border-white/10 p-1">
              {chatbotProviders.map((provider) => {
                const isActive = selectedBot === provider.id;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => setSelectedBot(provider.id)}
                    aria-pressed={isActive}
                    className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors ${FOCUS} ${
                      isActive ? "bg-white/[0.08] text-white" : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    {provider.name}
                  </button>
                );
              })}
            </div>
            <a href={selectedProvider.docsUrl} target="_blank" rel="noopener noreferrer" className={ACTION_BTN}>
              Ouvrir les commandes de {selectedProvider.name}
              <ExternalLink size={14} />
            </a>
          </div>
        </StepRail>

        <StepRail index={2} state="plain" title={`Colle le script dans ${selectedProvider.name}`}>
          <div role="group" aria-label="Type de réponse" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SCRIPT_MODES.map((m) => {
              const isActive = scriptMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setScriptMode(m.id)}
                  aria-pressed={isActive}
                  className={`flex cursor-pointer flex-col items-start rounded-xl border p-4 text-left transition-colors ${FOCUS} ${
                    isActive
                      ? "border-purple-500/60 bg-purple-500/10"
                      : "border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
                  }`}
                >
                  <span className={`text-sm font-semibold ${isActive ? "text-purple-200" : "text-zinc-200"}`}>{m.title}</span>
                  <span className="mt-0.5 text-sm text-zinc-400">{m.desc}</span>
                </button>
              );
            })}
          </div>

          <p>
            {mode.id === "command" ? (
              <>
                Dans la rubrique <strong className="font-semibold text-zinc-200">Commandes personnalisées</strong> de{" "}
                {selectedProvider.name}, crée une commande (par exemple{" "}
                <code className="rounded border border-purple-500/25 bg-purple-500/10 px-1.5 py-0.5 font-mono text-purple-200">!song</code>
                ) et colle ce script comme réponse.
              </>
            ) : (
              <>
                Crée un <strong className="font-semibold text-zinc-200">Timer</strong> chez {selectedProvider.name} (répondre toutes
                les X minutes) et colle exactement le même script. C'est le timer qui rend l'annonce automatique : rien d'autre à
                configurer chez nous.
              </>
            )}
          </p>

          <MaskedField
            value={command}
            secret={widgetToken}
            label={`Script ${selectedProvider.name}`}
            tone={mode.id === "timer" ? "emerald" : "purple"}
            wrap
          />
          <p className="text-sm text-zinc-400">
            Le lien contient ton jeton personnel : il est masqué par défaut et copié en entier.
          </p>
        </StepRail>

        <StepRail index={3} state="plain" title="Personnalise le message" last>
          <div className="space-y-2">
            <label htmlFor="bot-message" className="text-sm font-medium text-zinc-200">
              Message envoyé dans le chat
            </label>
            <textarea
              id="bot-message"
              ref={messageRef}
              value={customBotMessage}
              onChange={(e) => setCustomBotMessage(e.target.value)}
              placeholder={DEFAULT_MESSAGE}
              rows={2}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.02] p-4 text-base text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-400">Insérer :</span>
            {VARIABLES.map((v) => (
              <button
                key={v.tag}
                type="button"
                onClick={() => insertVariable(v.tag)}
                title={`Insère ${v.tag} à l'endroit du curseur`}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-purple-500/25 bg-purple-500/10 px-2.5 py-1 font-mono text-sm text-purple-200 transition-colors hover:bg-purple-500/20 ${FOCUS}`}
              >
                <strong>{v.tag}</strong>
                <span className="font-sans text-xs text-zinc-400">{v.label}</span>
              </button>
            ))}
            {customBotMessage !== DEFAULT_MESSAGE && (
              <button
                type="button"
                onClick={() => setCustomBotMessage(DEFAULT_MESSAGE)}
                className={`ml-auto cursor-pointer rounded-md px-2 py-1 text-sm text-zinc-400 transition-colors hover:text-white ${FOCUS}`}
              >
                Rétablir le message par défaut
              </button>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-zinc-200">Rendu dans ton chat Twitch</p>
              {hasLive ? (
                <StatusPill tone="live">Ta musique en direct</StatusPill>
              ) : (
                <StatusPill tone="idle">{isConnected ? "Exemple, rien en lecture" : "Exemple"}</StatusPill>
              )}
            </div>

            <div className="flex items-baseline gap-2 text-sm leading-relaxed">
              <span className="shrink-0 rounded border border-white/15 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-zinc-300">
                BOT
              </span>
              <p className="min-w-0 break-words text-zinc-100">
                {previewPending ? (
                  <span className="twichify-skeleton inline-block h-3 w-56 rounded align-middle" />
                ) : (
                  <>
                    <span className="font-bold text-sky-400">{selectedProvider.name}</span>: {previewText}
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-400">
              <span className={previewText.length > 400 ? "text-amber-300" : ""}>
                {previewText.length}/{TWITCH_MAX} caractères
              </span>
              {!isConnected && (
                <Link href="/dashboard/spotify" className="text-zinc-300 underline decoration-white/30 underline-offset-2 hover:text-white">
                  Relie Spotify pour voir ta vraie musique
                </Link>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={saveBotMessage}
            disabled={!canSave}
            className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
          >
            <Save size={16} />
            {saving ? "Enregistrement..." : dirty ? "Enregistrer le message" : "Message enregistré"}
          </button>
        </StepRail>
      </section>

      <UnsavedChangesBar
        isDirty={dirty}
        saving={saving}
        canSave={customBotMessage.trim() !== ""}
        onSave={saveBotMessage}
        onDiscard={() => setCustomBotMessage(savedMessage)}
      />

      <ToastDisplay toast={toast} />
    </div>
  );
}
