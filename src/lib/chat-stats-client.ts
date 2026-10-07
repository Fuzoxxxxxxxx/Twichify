/**
 * Collecte des statistiques de chat côté widget (navigateur / source OBS).
 *
 * Le widget chat reçoit déjà tous les messages : il en tire des COMPTEURS (jamais le texte) qu'il envoie
 * à Twichify toutes les 30 secondes. Ce module est volontairement sans dépendance serveur : il est importé
 * par le widget, et son type `StatsPayload` est aussi utilisé par l'API qui reçoit ces données.
 */

export type StatsPayload = {
  messages: number; // messages de conversation (hors bots et hors commandes)
  botMessages: number;
  commandMessages: number; // messages qui sont des commandes (!song, !discord…)
  firstTimers: number; // premiers messages de spectateurs
  emoteUses: number;
  activity: { t: number; n: number }[]; // t = minute (époque / 60 000), n = messages
  chatters: { i: string; l: string; n: string; c: number }[]; // identifiant Twitch, login, pseudo affiché, messages
  emotes: { k: string; c: number }[];
  commands: { k: string; c: number }[];
};

export type RecordedMessage = {
  userId?: string;
  login: string;
  name: string;
  message: string;
  isBot: boolean;
  isFirst: boolean;
  twitchEmotes?: Record<string, string[]>; // balise `emotes` du message IRC
  thirdPartyEmotes: Record<string, string>; // nom -> URL (BTTV, 7TV, FFZ)
};

// Limites d'un envoi (30 s de chat) : elles bornent la taille de la requête, même sur un très gros chat.
const SEND_MAX_CHATTERS = 500;
const SEND_MAX_EMOTES = 200;
const SEND_MAX_COMMANDS = 50;

type Chatter = { i: string; l: string; n: string; c: number };

function emptyState() {
  return {
    messages: 0,
    botMessages: 0,
    commandMessages: 0,
    firstTimers: 0,
    emoteUses: 0,
    activity: new Map<number, number>(),
    chatters: new Map<string, Chatter>(),
    emotes: new Map<string, number>(),
    commands: new Map<string, number>(),
  };
}

function bump<K>(map: Map<K, number>, key: K, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

export function createStatsBuffer() {
  let state = emptyState();

  return {
    /** Enregistre un message reçu. Ne conserve jamais son texte : seulement des compteurs. */
    record(m: RecordedMessage) {
      const s = state;

      if (m.isBot) {
        s.botMessages++;
        return;
      }

      const text = m.message.trim();

      // Les commandes sont comptées à part : elles ne font pas partie de la conversation.
      if (text.startsWith("!")) {
        s.commandMessages++;
        const command = text.split(/\s+/)[0].toLowerCase();
        if (/^![a-z0-9_-]{1,29}$/.test(command)) bump(s.commands, command);
        return;
      }

      s.messages++;
      bump(s.activity, Math.floor(Date.now() / 60000));
      if (m.isFirst) s.firstTimers++;

      const key = m.userId || m.login;
      const chatter = s.chatters.get(key);
      if (chatter) {
        chatter.c++;
        chatter.n = m.name; // le pseudo affiché peut changer de casse
      } else {
        s.chatters.set(key, { i: m.userId || "", l: m.login, n: m.name, c: 1 });
      }

      // Emotes Twitch : la balise donne, pour chaque emote, les positions [début-fin] dans le message.
      if (m.twitchEmotes) {
        for (const positions of Object.values(m.twitchEmotes)) {
          for (const range of positions) {
            const [start, end] = range.split("-").map(Number);
            if (!Number.isInteger(start) || !Number.isInteger(end)) continue;
            const name = m.message.substring(start, end + 1);
            if (!name) continue;
            bump(s.emotes, name);
            s.emoteUses++;
          }
        }
      }

      // Emotes tierces (BTTV, 7TV, FFZ) : un mot du message qui correspond au nom d'une emote.
      for (const word of text.split(/\s+/)) {
        if (m.thirdPartyEmotes[word]) {
          bump(s.emotes, word);
          s.emoteUses++;
        }
      }
    },

    /** Vide le tampon et renvoie son contenu (null s'il n'y a rien à envoyer). */
    take(): StatsPayload | null {
      const s = state;
      const empty = s.messages === 0 && s.botMessages === 0 && s.commandMessages === 0;
      state = emptyState();
      if (empty) return null;

      return {
        messages: s.messages,
        botMessages: s.botMessages,
        commandMessages: s.commandMessages,
        firstTimers: s.firstTimers,
        emoteUses: s.emoteUses,
        activity: [...s.activity.entries()].map(([t, n]) => ({ t, n })),
        chatters: [...s.chatters.values()].sort((a, b) => b.c - a.c).slice(0, SEND_MAX_CHATTERS),
        emotes: [...s.emotes.entries()]
          .map(([k, c]) => ({ k, c }))
          .sort((a, b) => b.c - a.c)
          .slice(0, SEND_MAX_EMOTES),
        commands: [...s.commands.entries()]
          .map(([k, c]) => ({ k, c }))
          .sort((a, b) => b.c - a.c)
          .slice(0, SEND_MAX_COMMANDS),
      };
    },

    /** Remet dans le tampon un envoi qui a échoué, pour le retenter au prochain tour. */
    restore(p: StatsPayload) {
      const s = state;
      s.messages += p.messages;
      s.botMessages += p.botMessages;
      s.commandMessages += p.commandMessages;
      s.firstTimers += p.firstTimers;
      s.emoteUses += p.emoteUses;
      for (const a of p.activity) bump(s.activity, a.t, a.n);
      for (const c of p.chatters) {
        const key = c.i || c.l;
        const existing = s.chatters.get(key);
        if (existing) existing.c += c.c;
        else s.chatters.set(key, { ...c });
      }
      for (const e of p.emotes) bump(s.emotes, e.k, e.c);
      for (const c of p.commands) bump(s.commands, c.k, c.c);
    },

    /** Abandonne ce qui a été compté (statistiques désactivées). */
    clear() {
      state = emptyState();
    },
  };
}
