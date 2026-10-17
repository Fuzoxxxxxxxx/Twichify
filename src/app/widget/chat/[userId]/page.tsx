"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import tmi from "tmi.js";
import { getChatThemeClasses, getChatAnimationClass, renderMessageSegments } from "@/lib/chat-widget-theme";
import { createStatsBuffer } from "@/lib/chat-stats-client";
import { resolveFont, ensureStylesheet } from "@/lib/widget-fonts";

interface ChatMessage {
  id: string;
  username: string;
  color: string;
  message: string;
  badges: Record<string, string>;
  emotesTag?: Record<string, string[]>;
  isBot: boolean;
  isCommand: boolean;
  timestamp: number;
  isFirst?: boolean;
  replyTo?: { user: string; body: string };
  removing?: boolean;
}

const DEFAULT_LIFETIME_S = 15;
const REMOVE_ANIM_DURATION = 350;

// Statistiques de chat (optionnelles) : compteurs agrégés en mémoire, jamais le texte des messages.
const statsBuffer = createStatsBuffer();
const STATS_FLUSH_INTERVAL_MS = 30_000;

// ── MODE TEST (?test=1) ──
// Messages factices émis en boucle dans le même circuit que les vrais messages (filtres, modération, rôles, réponses,
// premier message...), avec les vrais réglages du streamer. Aucune connexion Twitch, aucune statistique enregistrée.
const TEST_INTERVAL_MS = 2200;
const TEST_CHAT_MESSAGES: {
  user: string;
  color: string;
  badges: Record<string, string>;
  message: string;
  first?: boolean;
  reply?: { user: string; body: string };
}[] = [
  { user: "StreamerPro", color: "#FF4500", badges: { broadcaster: "1" }, message: "Bienvenue sur le stream tout le monde !" },
  { user: "ModeratriceLea", color: "#00C8A0", badges: { moderator: "1" }, message: "Rappel : pas de spoil svp" },
  { user: "VipMarco", color: "#E91E63", badges: { vip: "1" }, message: "Cette musique est incroyable" },
  { user: "AbonneZed", color: "#9146FF", badges: { subscriber: "0" }, message: "Premier mois d'abonnement, merci !" },
  { user: "Nightbot", color: "#5B9BD5", badges: { moderator: "1" }, message: "N'oubliez pas de suivre la chaîne" },
  { user: "Viewer42", color: "#FFD700", badges: {}, message: "!song" },
  { user: "NouveauVenu", color: "#1E90FF", badges: {}, message: "Salut, c'est ma première fois ici", first: true },
  {
    user: "Curieuse",
    color: "#FF69B4",
    badges: {},
    message:
      "Un message beaucoup plus long pour vérifier le retour à la ligne, la largeur du widget et la limite de caractères réglée dans le dashboard.",
  },
  {
    user: "Replier",
    color: "#32CD32",
    badges: {},
    message: "Je suis d'accord !",
    reply: { user: "VipMarco", body: "Cette musique est incroyable" },
  },
];

const POSITION_CLASSES: Record<string, string> = {
  "bottom-left": "left-4 bottom-4",
  "bottom-right": "right-4 bottom-4 items-end",
  "top-left": "left-4 top-4",
  "top-right": "right-4 top-4 items-end",
};

// (le découpage texte / emotes et les classes de thème/animation vivent dans
// @/lib/chat-widget-theme, partagés avec le dashboard et l'aperçu de la page d'accueil)

export default function ChatWidget() {
  const params = useParams();
  const userId = params?.userId as string;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [twitchChannel, setTwitchChannel] = useState<string | null>(null);
  const [badgeMap, setBadgeMap] = useState<Record<string, Record<string, string>>>({});
  const [emoteMap, setEmoteMap] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mode test (?test=1) : null tant que l'URL n'est pas lue.
  const [testMode, setTestMode] = useState<boolean | null>(null);
  useEffect(() => {
    setTestMode(new URLSearchParams(window.location.search).get("test") === "1");
  }, []);

  const clientRef = useRef<tmi.Client | null>(null);
  const settingsRef = useRef<any>(null);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Statistiques de chat : activées côté dashboard (la config est relue toutes les 5 s).
  const statsEnabledRef = useRef(false);
  const emoteMapRef = useRef<Record<string, string>>({});
  useEffect(() => {
    emoteMapRef.current = emoteMap;
  }, [emoteMap]);

  // 1. Config (polling live). `?w=1` annonce un vrai chargement du widget (assistant d'installation) ; pas en mode test.
  useEffect(() => {
    if (!userId || userId === "undefined" || userId.includes("[") || testMode === null) return;

    const fetchSettings = async () => {
      try {
        const res = await fetch(`/api/widget/chat/config/${userId}${testMode ? "" : "?w=1"}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setSettings(data.chatWidgetSettings);
          statsEnabledRef.current = !!data.chatStatsEnabled;
          if (data.twitchUsername) {
            setTwitchChannel(data.twitchUsername.trim().toLowerCase());
          }
        }
      } catch (error) {
        console.error("Erreur de chargement de la config:", error);
      }
    };
    fetchSettings();
    const interval = setInterval(fetchSettings, 5000);
    return () => clearInterval(interval);
  }, [userId, testMode]);

  // 2. Badges + emotes tierces
  useEffect(() => {
    if (!twitchChannel) return;
    fetch(`/api/twitch/badges/${twitchChannel}`)
      .then((r) => r.json())
      .then(setBadgeMap)
      .catch((err) => console.error("Erreur badges:", err));

    fetch(`/api/emotes/${twitchChannel}`)
      .then((r) => r.json())
      .then(setEmoteMap)
      .catch((err) => console.error("Erreur emotes:", err));
  }, [twitchChannel]);

  // 3. Connexion tmi.js + modération (en mode test : pas de connexion, des messages factices passent par les mêmes handlers)
  useEffect(() => {
    if (testMode === null) return;
    if (!twitchChannel && !testMode) return;

    if (clientRef.current) {
      clientRef.current.disconnect().catch(() => {});
      clientRef.current = null;
    }

    const client = new tmi.Client({
      options: { debug: false },
      connection: { reconnect: true, secure: true },
      channels: testMode || !twitchChannel ? [] : [twitchChannel],
    });

    clientRef.current = client;
    let cancelled = false;

    if (!testMode) {
      client.connect().catch((err) => {
        if (cancelled) return;
        console.error("Erreur de connexion TMI.js:", err);
      });
    }

    client.on("message", (channel, tags, message, self) => {
      if (self) return;

      const currentSettings = settingsRef.current;
      if (!currentSettings) return;

      const lowerUser = tags.username?.toLowerCase() || "";
      const isBot =
        lowerUser.includes("bot") ||
        lowerUser === "nightbot" ||
        lowerUser === "wizebot" ||
        lowerUser === "streamelements";
      const isCommand = message.trim().startsWith("!");

      // Statistiques de chat (si activées) : comptées AVANT les filtres d'affichage, pour que masquer les bots,
      // les commandes ou des mots ne fausse pas les chiffres. Seuls les utilisateurs ignorés sont exclus.
      if (statsEnabledRef.current && !testMode) {
        const ignored = ((currentSettings.ignoredUsers || []) as string[]).some(
          (u) => u.trim().replace(/^@/, "").toLowerCase() === lowerUser
        );
        if (!ignored && lowerUser) {
          statsBuffer.record({
            userId: typeof tags["user-id"] === "string" ? tags["user-id"] : undefined,
            login: lowerUser,
            name: tags["display-name"] || tags.username || lowerUser,
            message,
            isBot: !!isBot,
            isFirst: (tags as any)["first-msg"] === true || (tags as any)["first-msg"] === "1",
            twitchEmotes: tags.emotes as Record<string, string[]> | undefined,
            thirdPartyEmotes: emoteMapRef.current,
          });
        }
      }

      if (currentSettings.hideBots && isBot) return;
      if (currentSettings.hideCommands && isCommand) return;

      // Utilisateurs ignorés (pseudo exact, insensible à la casse, "@" optionnel)
      const ignoredUsers: string[] = currentSettings.ignoredUsers || [];
      if (ignoredUsers.some((u) => u.trim().replace(/^@/, "").toLowerCase() === lowerUser)) return;

      // Filtre de mots (modération) : selon le mode choisi, soit tout le message est masqué,
      // soit seul(s) le(s) mot(s) banni(s) sont remplacés par des astérisques dans le message.
      const bannedWords: string[] = currentSettings.moderationWords || [];
      const moderationMode: "hide" | "censor" = currentSettings.moderationMode === "censor" ? "censor" : "hide";
      let censoredMessage = message;

      if (bannedWords.length > 0) {
        const activeWords = bannedWords.map((w) => w.trim()).filter(Boolean);
        const lowerMessage = message.toLowerCase();
        const isFiltered = activeWords.some((word) => lowerMessage.includes(word.toLowerCase()));

        if (isFiltered) {
          if (moderationMode === "hide") return;

          // Remplace chaque occurrence (insensible à la casse) par des astérisques de même longueur.
          for (const word of activeWords) {
            if (!word) continue;
            const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            censoredMessage = censoredMessage.replace(new RegExp(escaped, "gi"), (match) => "*".repeat(match.length));
          }
        }
      }

      // Limite de caractères (0 = illimité)
      const charLimit = Number(currentSettings.charLimit) || 0;
      const finalMessage = charLimit > 0 && censoredMessage.length > charLimit
        ? censoredMessage.slice(0, charLimit) + "…"
        : censoredMessage;

      const newMessage: ChatMessage = {
        id: tags.id || Math.random().toString(36).substr(2, 9),
        username: tags["display-name"] || tags.username || "Anonyme",
        color: tags.color || "#FFFFFF",
        message: finalMessage,
        badges: (tags.badges as Record<string, string>) || {},
        emotesTag: tags.emotes as Record<string, string[]> | undefined,
        isBot: !!isBot,
        isCommand,
        isFirst: (tags as any)["first-msg"] === true || (tags as any)["first-msg"] === "1",
        replyTo: (tags as any)["reply-parent-display-name"]
          ? {
              user: String((tags as any)["reply-parent-display-name"]),
              body: String((tags as any)["reply-parent-msg-body"] || ""),
            }
          : undefined,
        timestamp: Date.now(),
      };

      setMessages((prev) => {
        const updated = [...prev, newMessage];
        return updated.length > 100 ? updated.slice(updated.length - 100) : updated;
      });
    });

    client.on("messagedeleted", (channel, username, deletedMessage, tags) => {
      const targetId = (tags as any)?.["target-msg-id"];
      if (!targetId) return;
      setMessages((prev) => prev.filter((m) => m.id !== targetId));
    });

    const removeUserMessages = (username: string) => {
      setMessages((prev) => prev.filter((m) => m.username.toLowerCase() !== username.toLowerCase()));
    };
    client.on("ban", (channel, username) => removeUserMessages(username));
    client.on("timeout", (channel, username) => removeUserMessages(username));
    client.on("clearchat", () => setMessages([]));

    // Mode test : on émet de faux messages "message", traités exactement comme ceux de Twitch.
    let testTimer: ReturnType<typeof setInterval> | undefined;
    if (testMode) {
      let n = 0;
      const emitNext = () => {
        const m = TEST_CHAT_MESSAGES[n % TEST_CHAT_MESSAGES.length];
        const tags: Record<string, any> = {
          id: `test-${Date.now()}-${n}`,
          username: m.user.toLowerCase(),
          "display-name": m.user,
          color: m.color,
          badges: m.badges,
          "first-msg": !!m.first,
        };
        if (m.reply) {
          tags["reply-parent-display-name"] = m.reply.user;
          tags["reply-parent-msg-body"] = m.reply.body;
        }
        n++;
        (client as any).emit("message", "#test", tags, m.message, false);
      };
      emitNext();
      testTimer = setInterval(emitNext, TEST_INTERVAL_MS);
    }

    return () => {
      cancelled = true;
      if (testTimer) clearInterval(testTimer);
      if (clientRef.current === client) {
        clientRef.current.disconnect().catch(() => {});
        clientRef.current = null;
      }
    };
  }, [twitchChannel, testMode]);

  // Envoi des statistiques de chat toutes les 30 s (et à la fermeture de la source OBS).
  useEffect(() => {
    if (!userId || userId === "undefined" || userId.includes("[")) return;
    const url = `/api/widget/chat/stats/${userId}`;

    const send = (final = false) => {
      if (!statsEnabledRef.current) {
        statsBuffer.clear();
        return;
      }
      const payload = statsBuffer.take();
      if (!payload) return;
      const body = JSON.stringify(payload);

      // À la fermeture de la page, sendBeacon est la seule méthode fiable.
      if (final && typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
        return;
      }

      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true })
        .then((res) => {
          // Panne serveur ou trop de requêtes : on remet les compteurs pour le prochain envoi.
          // Les autres refus (4xx) sont volontaires (stats désactivées, données invalides) : on ne réessaie pas.
          if (res.status >= 500 || res.status === 429) throw new Error(String(res.status));
        })
        .catch(() => statsBuffer.restore(payload));
    };

    const interval = setInterval(() => send(), STATS_FLUSH_INTERVAL_MS);
    const onHide = () => send(true);
    window.addEventListener("pagehide", onHide);
    return () => {
      clearInterval(interval);
      window.removeEventListener("pagehide", onHide);
    };
  }, [userId]);

  // 4. Purge des messages expirés
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      // 0 = les messages ne disparaissent jamais
      const lifetimeSeconds = Number(settingsRef.current?.messageLifetime ?? DEFAULT_LIFETIME_S);
      const lifetimeMs = lifetimeSeconds > 0 ? lifetimeSeconds * 1000 : Infinity;
      setMessages((prev) =>
        prev.map((msg) =>
          !msg.removing && now - msg.timestamp >= lifetimeMs
            ? { ...msg, removing: true }
            : msg
        )
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const toRemove = messages.filter((m) => m.removing);
    if (toRemove.length === 0) return;
    const timers = toRemove.map((m) =>
      setTimeout(() => {
        setMessages((prev) => prev.filter((msg) => msg.id !== m.id));
      }, REMOVE_ANIM_DURATION)
    );
    return () => timers.forEach(clearTimeout);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Police : classe Tailwind (polices système) ou police Google Fonts chargée à la demande (lib/widget-fonts).
  const font = resolveFont(settings?.fontFamily);
  useEffect(() => {
    if (font.href && font.family) ensureStylesheet(`wf-${font.family}`, font.href);
  }, [font.href, font.family]);

  if (!settings) return null;

  const getThemeClasses = () => getChatThemeClasses(settings.theme);

  const getAnimationClasses = (removing?: boolean) => getChatAnimationClass(settings.animation, removing);

  const maxMessages = settings.maxMessages ? Number(settings.maxMessages) : 8;
  const visibleMessages = messages.slice(-maxMessages);
  const positionClass = POSITION_CLASSES[settings.position] || POSITION_CLASSES["bottom-left"];
  const widgetWidth = settings.widgetWidth || 380;
  const isCompact = !!settings.compactMode;
  const useColors = settings.showColors !== false;

  // Détermine le rôle prioritaire d'un message pour la surbrillance (broadcaster > mod > vip > sub > bot)
  const getHighlight = (badges: Record<string, string>, isBot?: boolean) => {
    const rh = settings.roleHighlights || {};
    if (badges.broadcaster && rh.broadcaster?.enabled) return rh.broadcaster.color;
    if (badges.moderator && rh.moderator?.enabled) return rh.moderator.color;
    if (badges.vip && rh.vip?.enabled) return rh.vip.color;
    if (badges.subscriber && rh.subscriber?.enabled) return rh.subscriber.color;
    if (isBot && rh.bot?.enabled) return rh.bot.color;
    return null;
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`h-screen w-screen overflow-hidden relative ${font.className}`}
      style={font.fontFamily ? { fontFamily: font.fontFamily } : undefined}
    >
      {testMode && (
        <div className="fixed right-2 top-2 z-50 rounded bg-amber-500/90 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-widest text-black">
          Mode test
        </div>
      )}
      <style jsx global>{`
        @keyframes msgInSlide { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes msgInFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes msgInBounce {
          0% { opacity: 0; transform: scale(0.3) translateY(10px); }
          50% { opacity: 1; transform: scale(1.08) translateY(-4px); }
          70% { transform: scale(0.95) translateY(2px); }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes msgOutSlide { from { opacity: 1; transform: translateX(0); max-height: 200px; } to { opacity: 0; transform: translateX(-16px); max-height: 0; margin-top: 0; } }
        @keyframes msgOutFade { from { opacity: 1; max-height: 200px; } to { opacity: 0; max-height: 0; margin-top: 0; } }
        @keyframes msgOutBounce {
          0% { opacity: 1; transform: scale(1); max-height: 200px; }
          30% { transform: scale(1.05); }
          100% { opacity: 0; transform: scale(0.3); max-height: 0; margin-top: 0; }
        }
        .msg-in-slide { animation: msgInSlide 0.3s ease-out both; }
        .msg-in-fade { animation: msgInFade 0.4s ease-out both; }
        .msg-in-bounce { animation: msgInBounce 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        .msg-out-slide { animation: msgOutSlide 0.35s ease-in forwards; overflow: hidden; }
        .msg-out-fade { animation: msgOutFade 0.35s ease-in forwards; overflow: hidden; }
        .msg-out-bounce { animation: msgOutBounce 0.35s ease-in forwards; overflow: hidden; }
        .msg-out-instant { animation: none; display: none; }
      `}</style>

      <div
        className={`fixed flex flex-col ${isCompact ? "gap-1" : "gap-3"} ${positionClass}`}
        style={{ width: `${widgetWidth}px` }}
      >
        {visibleMessages.map((msg) => {
          const isFirstHighlighted = !!settings.highlightFirstMessage && !!msg.isFirst;
          const highlightColor = getHighlight(msg.badges, msg.isBot) ?? (isFirstHighlighted ? "#facc15" : null);
          return (
            <div
              key={msg.id}
              className={`${isCompact ? "px-2.5 py-1.5" : "p-3"} flex flex-col ${isCompact ? "gap-0.5" : "gap-1"} transition-all ${getThemeClasses()} ${getAnimationClasses(msg.removing)}`}
              style={{
                fontSize: `${settings.fontSize}px`,
                borderColor: highlightColor
                  ? highlightColor
                  : ["dark", "neon", "outline"].includes(settings.theme) ? msg.color : "rgba(255,255,255,0.1)",
                ...(highlightColor && {
                  boxShadow: `inset 3px 0 0 0 ${highlightColor}`,
                  backgroundColor: `${highlightColor}14`,
                }),
              }}
            >
              {settings.showReplies && msg.replyTo && (
                <div className="flex items-center gap-1.5 truncate border-l-2 border-white/20 pl-2 text-[0.75em] text-zinc-400">
                  <span className="opacity-70">↪</span>
                  <span className="font-semibold text-zinc-300">@{msg.replyTo.user}</span>
                  <span className="truncate">{msg.replyTo.body}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                {settings.showBadges && msg.badges && (
                  <div className="flex gap-1 items-center">
                    {Object.entries(msg.badges).map(([badgeType, version]) => {
                      const url = badgeMap[badgeType]?.[version];
                      if (!url) return null;
                      return (
                        <img key={badgeType} src={url} alt={badgeType} className="w-4 h-4 object-contain inline-block" />
                      );
                    })}
                  </div>
                )}
                <span className="font-bold drop-shadow-sm" style={{ color: useColors ? msg.color : "#FFFFFF" }}>
                  {msg.username}
                </span>
                {isFirstHighlighted && (
                  <span className="rounded-full border border-amber-400/40 bg-amber-400/20 px-1.5 py-[1px] text-[0.6em] font-black uppercase tracking-wider text-amber-300">
                    Nouveau
                  </span>
                )}
                {settings.showTimestamps && (
                  <span className="text-[0.75em] text-zinc-400/70 font-mono ml-auto shrink-0">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                )}
              </div>
              <span className="text-zinc-100 break-words leading-snug drop-shadow-sm inline-flex flex-wrap items-center gap-x-1">
                {renderMessageSegments(msg.message, msg.emotesTag, emoteMap).map((seg, i) =>
                  seg.type === "emote" ? (
                    <img key={i} src={seg.url} alt={seg.content} className="inline-block h-6 align-middle" />
                  ) : (
                    <span key={i}>{seg.content}</span>
                  )
                )}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}