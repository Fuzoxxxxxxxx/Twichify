// Rendu partagé du widget chat : utilisé par le vrai widget (/widget/chat/[userId]), le
// dashboard et l'aperçu interactif de la page d'accueil. Une seule source de vérité, pour que
// l'aperçu ne puisse pas s'éloigner du vrai design.

export const CHAT_THEMES = [
  { id: "glass", label: "Glassmorphism", desc: "Verre flouté" },
  { id: "dark", label: "Dark Clean", desc: "Fond uni sombre" },
  { id: "neon", label: "Neon Cyber", desc: "Bordures lumineuses" },
  { id: "transparent", label: "Invisible", desc: "Texte uniquement" },
  { id: "compact", label: "Compact", desc: "Dense, sans marges" },
  { id: "epure", label: "Épuré", desc: "Minimal, séparateur fin" },
  { id: "retro", label: "Rétro Synthwave", desc: "Angles nets, néon rose" },
  { id: "aurora", label: "Aurora", desc: "Dégradé violet/cyan" },
] as const;

export const CHAT_ANIMATIONS = [
  { id: "slide", label: "Glissement" },
  { id: "fade", label: "Fondu" },
  { id: "bounce", label: "Rebond" },
  { id: "none", label: "Aucune" },
] as const;

export function getChatThemeClasses(theme?: string): string {
  switch (theme) {
    case "glass": return "bg-zinc-900/60 backdrop-blur-md rounded-xl border border-white/10";
    case "dark": return "bg-zinc-900 rounded-lg border-l-4";
    case "neon": return "bg-black border shadow-[0_0_15px_rgba(255,255,255,0.1)] rounded-lg";
    case "transparent": return "bg-transparent text-shadow-md";
    case "compact": return "bg-zinc-900/70 rounded-md px-2.5 py-1.5";
    case "epure": return "bg-transparent border-b border-white/5 pb-2 rounded-none";
    case "retro": return "bg-[#1a1025] border-2 border-[#ff6ac1] rounded-none shadow-[3px_3px_0_#ff6ac1]";
    case "aurora": return "bg-gradient-to-br from-violet-900/40 via-fuchsia-900/30 to-cyan-900/40 backdrop-blur-lg rounded-2xl border border-white/10";
    case "outline": return "bg-black/20 rounded-xl border-2";
    default: return "bg-zinc-900/60 backdrop-blur-md rounded-xl";
  }
}

export function getChatAnimationClass(animation: string | undefined, removing?: boolean): string {
  if (removing) {
    switch (animation) {
      case "slide": return "msg-out-slide";
      case "fade": return "msg-out-fade";
      case "bounce": return "msg-out-bounce";
      case "none": return "msg-out-instant";
      default: return "msg-out-slide";
    }
  }
  switch (animation) {
    case "slide": return "msg-in-slide";
    case "fade": return "msg-in-fade";
    case "bounce": return "msg-in-bounce";
    case "none": return "";
    default: return "msg-in-slide";
  }
}

// Keyframes des animations de messages (mêmes valeurs que le vrai widget).
export const CHAT_ANIMATION_KEYFRAMES = `
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
  @media (prefers-reduced-motion: reduce) {
    .msg-in-slide, .msg-in-fade, .msg-in-bounce, .msg-out-slide, .msg-out-fade, .msg-out-bounce { animation: none; }
  }
`;

export type MessageSegment = { type: "text" | "emote"; content: string; url?: string };

// Découpe un message en segments texte / emote (Twitch natif par position + BTTV/7TV par mot)
export function renderMessageSegments(
  message: string,
  twitchEmotes: Record<string, string[]> | undefined,
  thirdPartyMap: Record<string, string>
): MessageSegment[] {
  const positions: { start: number; end: number; id: string }[] = [];
  if (twitchEmotes) {
    for (const [id, ranges] of Object.entries(twitchEmotes)) {
      for (const range of ranges) {
        const [start, end] = range.split("-").map(Number);
        positions.push({ start, end, id });
      }
    }
  }
  positions.sort((a, b) => a.start - b.start);

  const chars = Array.from(message);
  const segments: MessageSegment[] = [];
  let cursor = 0;

  for (const pos of positions) {
    if (pos.start > cursor) {
      segments.push({ type: "text", content: chars.slice(cursor, pos.start).join("") });
    }
    segments.push({
      type: "emote",
      content: chars.slice(pos.start, pos.end + 1).join(""),
      url: `https://static-cdn.jtvnw.net/emoticons/v2/${pos.id}/default/dark/2.0`,
    });
    cursor = pos.end + 1;
  }
  if (cursor < chars.length) {
    segments.push({ type: "text", content: chars.slice(cursor).join("") });
  }
  if (segments.length === 0) segments.push({ type: "text", content: message });

  // Sur les segments texte restants, remplace les mots correspondant à une emote BTTV/7TV
  const final: MessageSegment[] = [];
  for (const seg of segments) {
    if (seg.type === "emote") {
      final.push(seg);
      continue;
    }
    const words = seg.content.split(/(\s+)/);
    for (const word of words) {
      if (!word.trim()) {
        final.push({ type: "text", content: word });
        continue;
      }
      const url = thirdPartyMap[word];
      final.push(url ? { type: "emote", content: word, url } : { type: "text", content: word });
    }
  }
  return final;
}
