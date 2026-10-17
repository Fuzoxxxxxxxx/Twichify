"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Music, MessageSquareText, X, ArrowRight, Sparkles } from "lucide-react";

/**
 * Assistant de première installation (page d'accueil du dashboard) : 4 étapes, chacune avec sa coche verte.
 *
 *  1. Spotify relié          → état du compte (/api/user/setup-status)
 *  2. Twitch connecté        → compte Twitch de la session
 *  3. Lien OBS copié         → clic sur « Copier » (mémorisé dans ce navigateur) ou widget déjà détecté
 *  4. Widget chargé dans OBS → détection réelle côté serveur : le widget annonce chaque chargement (`?w=1`),
 *                              le mode test et l'aperçu du dashboard ne comptent pas
 *
 * Les comptes déjà installés (widget qui a déjà tourné) ne voient jamais l'assistant : il n'apparaît que s'il reste
 * une étape à faire, et il affiche un message de réussite quand la dernière est cochée.
 */

interface SetupStatus {
  spotifyCredentials: boolean;
  spotifyConnected: boolean;
  twitchLogin: string | null;
  musicSeenAt: string | null;
  chatSeenAt: string | null;
}

const STORAGE_DISMISSED = "twichify:setup-wizard:dismissed";
const STORAGE_COPIED = "twichify:setup-wizard:copied";
const POLL_MS = 4000;
// Le serveur n'écrit la date de chargement qu'une fois par minute : au-delà de ~2,5 min sans signe, le widget est considéré hors ligne.
const LIVE_WINDOW_MS = 150_000;

function ago(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 10) return "à l'instant";
  if (s < 60) return `il y a ${s} s`;
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

function StepRow({
  index, done, title, summary, children, last,
}: {
  index: number;
  done: boolean;
  title: string;
  summary?: string;
  children?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-black transition-all duration-500 ${
            done
              ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.25)]"
              : "border-white/10 bg-black/30 text-zinc-500"
          }`}
        >
          {done ? <Check size={16} strokeWidth={3} /> : index}
        </div>
        {!last && <div className={`mt-1 w-px flex-1 ${done ? "bg-emerald-500/30" : "bg-white/10"}`} />}
      </div>
      <div className={`min-w-0 flex-1 ${last ? "" : "pb-6"}`}>
        <p className={`text-sm font-bold ${done ? "text-zinc-400" : "text-white"}`}>{title}</p>
        {done && summary && <p className="mt-0.5 text-xs text-zinc-500">{summary}</p>}
        {!done && <div className="mt-1.5 space-y-3 text-xs leading-relaxed text-zinc-400">{children}</div>}
      </div>
    </div>
  );
}

export default function SetupWizard({ widgetUrl, chatWidgetUrl }: { widgetUrl: string; chatWidgetUrl: string }) {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [dismissed, setDismissed] = useState(true); // true tant que le stockage n'est pas lu : évite un flash
  const [copied, setCopied] = useState<{ music: boolean; chat: boolean }>({ music: false, chat: false });
  const [flash, setFlash] = useState<"music" | "chat" | null>(null);
  const [sawIncomplete, setSawIncomplete] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_DISMISSED) === "1");
      const saved = localStorage.getItem(STORAGE_COPIED);
      if (saved) setCopied({ music: false, chat: false, ...JSON.parse(saved) });
    } catch {
      setDismissed(false);
    }
  }, []);

  const spotifyDone = !!status?.spotifyConnected;
  const twitchDone = !!status?.twitchLogin;
  const musicSeen = !!status?.musicSeenAt;
  const chatSeen = !!status?.chatSeenAt;
  const widgetDone = musicSeen || chatSeen;
  // Un widget détecté prouve que le lien a bien été copié, même depuis un autre navigateur.
  const linkDone = copied.music || copied.chat || widgetDone;
  const flags = [spotifyDone, twitchDone, linkDone, widgetDone];
  const doneCount = flags.filter(Boolean).length;
  const complete = !!status && doneCount === flags.length;

  // Interrogation régulière tant que l'installation n'est pas terminée (une dernière lecture suffit ensuite).
  useEffect(() => {
    if (dismissed) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/user/setup-status", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        setStatus(await res.json());
        setNow(Date.now());
      } catch {}
    };
    load();
    if (complete) return () => { cancelled = true; };
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [dismissed, complete]);

  // On ne félicite que celui qui a vu l'assistant incomplet : un compte déjà installé ne voit rien.
  useEffect(() => {
    if (status && !complete) setSawIncomplete(true);
  }, [status, complete]);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_DISMISSED, "1");
    } catch {}
  };

  const copy = async (kind: "music" | "chat", url: string) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    const next = { ...copied, [kind]: true };
    setCopied(next);
    try {
      localStorage.setItem(STORAGE_COPIED, JSON.stringify(next));
    } catch {}
    setFlash(kind);
    setTimeout(() => setFlash(null), 2000);
  };

  if (dismissed || !status) return null;
  if (complete && !sawIncomplete) return null;

  if (complete) {
    return (
      <div className="relative flex items-center gap-4 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
          <Sparkles size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Installation terminée</p>
          <p className="mt-0.5 text-xs text-zinc-400">
            Ton widget est bien chargé dans OBS
            {musicSeen && status.musicSeenAt ? ` (musique : ${ago(status.musicSeenAt, now)})` : ""}
            {chatSeen && status.chatSeenAt ? ` (chat : ${ago(status.chatSeenAt, now)})` : ""}. Tu peux maintenant régler le design.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="rounded-xl border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/5"
        >
          Masquer
        </button>
      </div>
    );
  }

  const detectionRow = (label: string, icon: React.ReactNode, seenAt: string | null) => {
    const seen = !!seenAt;
    const live = seen && now - new Date(seenAt!).getTime() < LIVE_WINDOW_MS;
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 px-4 py-3">
        <span className="flex items-center gap-2 text-xs font-bold text-zinc-200">
          {icon} {label}
        </span>
        {seen ? (
          <span className="flex items-center gap-2 text-[11px] font-bold text-emerald-400">
            {live && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />}
            <Check size={14} strokeWidth={3} />
            {live ? "En ligne" : "Détecté"} · {ago(seenAt!, now)}
          </span>
        ) : (
          <span className="flex items-center gap-2 text-[11px] text-zinc-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            En attente…
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-950/60 p-6 shadow-2xl backdrop-blur-sm">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-violet-400">Assistant d'installation</p>
          <p className="mt-1 text-lg font-black text-white">Mets ton widget en place en 4 étapes</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${(doneCount / flags.length) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {doneCount}/{flags.length}
            </span>
          </div>
        </div>
        <button
          onClick={dismiss}
          title="Masquer l'assistant"
          className="rounded-lg p-1.5 text-zinc-600 transition hover:bg-white/5 hover:text-zinc-300"
        >
          <X size={16} />
        </button>
      </div>

      <StepRow index={1} done={spotifyDone} title="Relier Spotify" summary="Compte Spotify relié.">
        <p>
          {status.spotifyCredentials
            ? "Tes identifiants développeur sont enregistrés : il reste à autoriser l'accès à ton compte Spotify."
            : "Renseigne tes identifiants développeur Spotify (Client ID et Client Secret), puis autorise l'accès à ton compte."}
        </p>
        <Link
          href="/dashboard/spotify"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black transition hover:bg-zinc-200"
        >
          Configurer Spotify <ArrowRight size={12} />
        </Link>
      </StepRow>

      <StepRow
        index={2}
        done={twitchDone}
        title="Connecter Twitch"
        summary={status.twitchLogin ? `Connecté en tant que ${status.twitchLogin}.` : undefined}
      >
        <p>Connecte-toi avec ton compte Twitch pour retrouver ton chat et tes réglages.</p>
      </StepRow>

      <StepRow index={3} done={linkDone} title="Copier les liens OBS" summary="Lien copié.">
        <p>
          Copie le lien du widget, puis dans OBS : <span className="text-zinc-200">Sources → + → Navigateur</span> et colle-le dans le champ URL.
          Musique : largeur <span className="font-mono text-zinc-200">475</span>, hauteur <span className="font-mono text-zinc-200">125</span>.
          Chat : plein écran (<span className="font-mono text-zinc-200">1920×1080</span>).
        </p>
        <div className="flex flex-wrap gap-2">
          {([
            { id: "music", label: "Lien Musique", url: widgetUrl },
            { id: "chat", label: "Lien Chat", url: chatWidgetUrl },
          ] as const).map(({ id, label, url }) => (
            <button
              key={id}
              disabled={!url}
              onClick={() => copy(id, url)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-200 transition hover:border-violet-500/50 hover:text-white disabled:opacity-50"
            >
              {flash === id || copied[id] ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {flash === id ? "Copié" : label}
            </button>
          ))}
        </div>
      </StepRow>

      <StepRow index={4} done={widgetDone} title="Vérifier que le widget se charge dans OBS" summary="Widget détecté dans OBS." last>
        <p>
          Dès que la source OBS est active, la coche s'allume toute seule (vérification toutes les quelques secondes).
          Rien ne s'affiche ? Vérifie que la source est visible et que le lien est bien collé en entier.
        </p>
        <div className="space-y-2">
          {detectionRow("Widget musique", <Music size={14} className="text-violet-400" />, status.musicSeenAt)}
          {detectionRow("Widget chat", <MessageSquareText size={14} className="text-cyan-400" />, status.chatSeenAt)}
        </div>
        <p className="text-zinc-500">
          Pas encore OBS sous la main ? Le mode test affiche le widget avec de fausses données, mais il ne compte pas comme un chargement :{" "}
          <a
            href={widgetUrl ? `${widgetUrl}?test=1` : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-zinc-300 underline decoration-white/20 underline-offset-2 hover:text-white"
          >
            tester le widget musique <ExternalLink size={11} />
          </a>
          .
        </p>
      </StepRow>
    </div>
  );
}
