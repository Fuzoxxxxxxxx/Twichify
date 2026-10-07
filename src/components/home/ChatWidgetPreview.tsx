"use client";

import { useEffect, useRef, useState } from "react";
import { Shield, Star, Crown, Radio } from "lucide-react";
import {
  CHAT_ANIMATION_KEYFRAMES,
  getChatAnimationClass,
  getChatThemeClasses,
  renderMessageSegments,
} from "@/lib/chat-widget-theme";

// Aperçu statique du widget chat pour la page d'accueil. Il réutilise le vrai rendu du widget
// (thème "glass", animation "slide", découpage des emotes via @/lib/chat-widget-theme) et de
// vrais badges Twitch ; seuls les pseudos et les messages sont fictifs. Aucune connexion à Twitch.

const THEME = "glass";
const ANIMATION = "slide";

type Role = "broadcaster" | "moderator" | "vip" | "subscriber" | null;

interface DemoMessage {
  id: number;
  username: string;
  color: string;
  message: string;
  role: Role;
  isFirst: boolean;
  removing?: boolean;
}

const MAX_MESSAGES = 5;
const TICK_MS = 2400;
const REMOVE_ANIM_MS = 350;

const NAME_PREFIXES = ["Luna", "Pixel", "Kevin", "Nox", "Zeph", "Miaou", "Sushi", "Turbo", "Cosmo", "Neko", "Mélo", "Sakura", "Rex", "Blue", "Gaby", "Yuki"];
const NAME_SUFFIXES = ["Breeze", "Gamer", "_TV", "Plays", "Fox", "Wolf", "Craft", "Vibes", "Shadow", "LeBoss", "Live", "Zen"];
const COLORS = ["#FF4500", "#9ACD32", "#1E90FF", "#FF69B4", "#8A2BE2", "#00FF7F", "#FFD700", "#5F9EA0", "#DAA520", "#FF7F50", "#B22222", "#2E8B57"];

const emote = (id: number) => `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`;
const EMOTE_MAP: Record<string, string> = {
  Kappa: emote(25),
  LUL: emote(425618),
  Kreygasm: emote(41),
  BibleThump: emote(86),
  "4Head": emote(354),
};

const MESSAGE_POOL = [
  "cette musique est trop bien Kreygasm",
  "c'est quoi le titre ?",
  "Blinding Lights, un classique !",
  "GG pour le clutch !! LUL",
  "salut tout le monde Kappa",
  "l'overlay est trop propre",
  "quelqu'un a le lien du discord ?",
  "trop chill ce stream 4Head",
  "il est en boucle depuis 3h LUL",
  "ambiance de dingue ce soir",
  "première fois ici, ça a l'air génial",
  "lance la playlist synthwave stp",
  "BibleThump déjà fini ?",
  "quelle partie de fou Kreygasm",
  "on est combien à regarder depuis ce matin ?",
  "le son est nickel aujourd'hui",
];

const ROLE_COLORS: Record<Exclude<Role, null>, string> = {
  broadcaster: "#ef4444",
  moderator: "#22c55e",
  vip: "#ec4899",
  subscriber: "#a855f7",
};

const FALLBACK_ICON = { broadcaster: Radio, moderator: Shield, vip: Crown, subscriber: Star } as const;

const rand = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

function randomUsername() {
  const base = rand(NAME_PREFIXES) + rand(NAME_SUFFIXES);
  const withNumber = Math.random() < 0.35 ? base + Math.floor(Math.random() * 99 + 1) : base;
  return Math.random() < 0.15 ? `xX_${withNumber}_Xx` : withNumber;
}

function randomRole(): Role {
  const r = Math.random();
  if (r < 0.06) return "broadcaster";
  if (r < 0.18) return "moderator";
  if (r < 0.26) return "vip";
  if (r < 0.5) return "subscriber";
  return null;
}

export default function ChatWidgetPreview() {
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [badgeMap, setBadgeMap] = useState<Record<string, Record<string, string>>>({});
  const idRef = useRef(0);
  const lastTextRef = useRef("");

  // Vrais badges Twitch (globaux). En cas d'échec, des icônes de remplacement s'affichent.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/twitch/global-badges")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (!cancelled) setBadgeMap(data || {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Les valeurs aléatoires sont générées uniquement côté client, après le montage :
  // sinon le HTML rendu côté serveur ne correspondrait pas à celui du navigateur.
  useEffect(() => {
    const makeMessage = (): DemoMessage => {
      let text = rand(MESSAGE_POOL);
      while (text === lastTextRef.current) text = rand(MESSAGE_POOL);
      lastTextRef.current = text;

      const role = randomRole();
      return {
        id: ++idRef.current,
        username: randomUsername(),
        color: rand(COLORS),
        message: text,
        role,
        isFirst: !role && Math.random() < 0.15,
      };
    };

    const push = () => {
      setMessages((prev) => {
        const next = [...prev, makeMessage()];
        // Au-delà du maximum affiché, le plus ancien passe « en sortie » (animation), puis est retiré.
        const visible = next.filter((m) => !m.removing);
        if (visible.length > MAX_MESSAGES) {
          const oldestId = visible[0].id;
          return next.map((m) => (m.id === oldestId ? { ...m, removing: true } : m));
        }
        return next;
      });
    };

    push();
    const seed1 = setTimeout(push, 500);
    const seed2 = setTimeout(push, 1100);
    const interval = setInterval(() => {
      if (!document.hidden) push();
    }, TICK_MS);

    return () => {
      clearTimeout(seed1);
      clearTimeout(seed2);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const leaving = messages.filter((m) => m.removing);
    if (leaving.length === 0) return;
    const timers = leaving.map((m) =>
      setTimeout(() => setMessages((prev) => prev.filter((x) => x.id !== m.id)), REMOVE_ANIM_MS)
    );
    return () => timers.forEach(clearTimeout);
  }, [messages]);

  const badgeUrlFor = (role: Role): string | null => {
    if (!role) return null;
    const set = badgeMap[role];
    if (!set) return null;
    return (role === "subscriber" ? set[Object.keys(set)[0]] : set["1"]) ?? Object.values(set)[0] ?? null;
  };

  return (
    <div
      className="relative flex flex-col justify-end gap-3 overflow-hidden font-sans"
      style={{ width: "min(380px, 100%)", height: 372 }}
      aria-label="Aperçu du widget chat avec des messages de démonstration"
    >
      <style>{CHAT_ANIMATION_KEYFRAMES}</style>

      {messages.map((msg) => {
        const highlightColor = (msg.role ? ROLE_COLORS[msg.role] : null) ?? (msg.isFirst ? "#facc15" : null);
        const badgeUrl = badgeUrlFor(msg.role);
        const FallbackIcon = msg.role ? FALLBACK_ICON[msg.role] : null;

        return (
          <div
            key={msg.id}
            className={`flex shrink-0 flex-col gap-1 p-3 ${getChatThemeClasses(THEME)} ${getChatAnimationClass(ANIMATION, msg.removing)}`}
            style={{
              fontSize: "15px",
              borderColor: highlightColor ? highlightColor : "rgba(255,255,255,0.1)",
              ...(highlightColor && {
                boxShadow: `inset 3px 0 0 0 ${highlightColor}`,
                backgroundColor: `${highlightColor}14`,
              }),
            }}
          >
            <div className="flex items-center gap-2">
              {msg.role && (
                <div className="flex items-center gap-1">
                  {badgeUrl ? (
                    <img src={badgeUrl} alt={msg.role} className="inline-block h-4 w-4 object-contain" />
                  ) : (
                    FallbackIcon && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-[3px] bg-white/10" aria-label={msg.role}>
                        <FallbackIcon size={10} className="text-white" />
                      </span>
                    )
                  )}
                </div>
              )}
              <span className="font-bold drop-shadow-sm" style={{ color: msg.color }}>
                {msg.username}
              </span>
              {msg.isFirst && (
                <span className="rounded-full border border-amber-400/40 bg-amber-400/20 px-1.5 py-[1px] text-[0.6em] font-black uppercase tracking-wider text-amber-300">
                  Nouveau
                </span>
              )}
            </div>
            <span className="inline-flex flex-wrap items-center gap-x-1 break-words leading-snug text-zinc-100 drop-shadow-sm">
              {renderMessageSegments(msg.message, undefined, EMOTE_MAP).map((seg, i) =>
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
    </div>
  );
}
