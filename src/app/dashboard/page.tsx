"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  Music,
  MessageSquareText,
  Palette,
  Play,
  RefreshCw,
  Lightbulb,
  History,
  ShieldCheck,
  Users,
  Megaphone,
  Tv,
  Activity,
  ChevronRight,
} from "lucide-react";
import { DashboardLoading, DashboardLoadError } from "@/components/dashboard/DashboardUI";
import { useToast, ToastDisplay } from "@/components/dashboard/useToast";
import { useWidgetToken } from "@/components/dashboard/useWidgetToken";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import SetupWizard from "@/components/dashboard/SetupWizard";
import {
  ACTION_BTN,
  LIVE_WINDOW_MS,
  MaskedField,
  StatusDot,
  StatusPill,
  ago,
  type PillTone,
} from "@/components/dashboard/WidgetUI";

interface SetupStatus {
  spotifyCredentials: boolean;
  spotifyConnected: boolean;
  twitchLogin: string | null;
  musicSeenAt: string | null;
  chatSeenAt: string | null;
  bannerSeenAt: string | null;
}

// Même route que l'assistant d'installation : booléens et dates uniquement, jamais d'identifiants.
const POLL_MS = 10_000;

interface WidgetStatus {
  tone: PillTone;
  label: string;
  detail?: string;
  live: boolean;
}

// État d'un widget dans OBS, d'après le dernier chargement détecté par le serveur.
function widgetStatus(kind: "music" | "chat" | "banner", status: SetupStatus, now: number): WidgetStatus {
  if (kind === "music" && !status.spotifyConnected) return { tone: "warn", label: "Spotify non relié", live: false };
  if (kind === "chat" && !status.twitchLogin) return { tone: "warn", label: "Twitch non connecté", live: false };

  const seenAt = kind === "music" ? status.musicSeenAt : kind === "chat" ? status.chatSeenAt : status.bannerSeenAt;
  if (!seenAt) return { tone: "idle", label: "Jamais chargé dans OBS", live: false };

  const isLive = now - new Date(seenAt).getTime() < LIVE_WINDOW_MS;
  return isLive
    ? { tone: "live", label: "En ligne dans OBS", detail: ago(seenAt, now), live: true }
    : { tone: "seen", label: "Hors ligne", detail: `dernier chargement ${ago(seenAt, now)}`, live: false };
}

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

const PRIMARY_BTN = `inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-500 ${FOCUS}`;
const TEXT_LINK = `inline-flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-white ${FOCUS}`;

// Un indicateur de la bande d'état : un clic mène à la page qui permet d'agir dessus.
function VitalTile({
  href,
  icon,
  label,
  value,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: PillTone;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-black/25 p-4 transition-colors hover:border-white/20 hover:bg-white/[0.04] ${FOCUS}`}
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-zinc-200"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-zinc-400">{label}</span>
        <span className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-white">
          <StatusDot tone={tone} />
          <span className="truncate">{value}</span>
        </span>
      </span>
      <ChevronRight
        size={16}
        aria-hidden="true"
        className="shrink-0 text-zinc-600 transition-all group-hover:translate-x-0.5 group-hover:text-zinc-300"
      />
    </Link>
  );
}

// Un widget = une ligne : qui il est, son lien OBS, ses actions. Plus lisible qu'une carte haute quand il y en a trois.
function WidgetRow({
  gradient,
  icon,
  name,
  description,
  status,
  field,
  note,
  actions,
}: {
  gradient: string;
  icon: React.ReactNode;
  name: string;
  description: string;
  status: React.ReactNode;
  field: React.ReactNode;
  note: string;
  actions: React.ReactNode;
}) {
  return (
    <section
      aria-label={name}
      className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_11rem] lg:items-center lg:gap-8"
    >
      <div className="flex min-w-0 items-start gap-4">
        <div
          aria-hidden="true"
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg shadow-black/30`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold tracking-tight text-white">{name}</h3>
          <p className="mt-0.5 text-sm leading-relaxed text-zinc-400">{description}</p>
          <div className="mt-2.5">{status}</div>
        </div>
      </div>

      <div className="min-w-0 space-y-2">
        {field}
        <p className="text-sm text-zinc-400">{note}</p>
      </div>

      <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch [&>*]:justify-center">{actions}</div>
    </section>
  );
}

export default function DashboardOverview() {
  const { data: session } = useSession();
  const { toast, showToast } = useToast();
  const { token: widgetToken, legacyActive, regenerating, regenerate, loading: tokenLoading } = useWidgetToken(!!session);

  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [status, setStatus] = useState<SetupStatus | null>(null);
  // L'état Spotify, Twitch et OBS vient du serveur : on affiche un chargement plutôt que "Non configuré" en dur.
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async (initial: boolean) => {
    try {
      const res = await fetch("/api/user/setup-status", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setStatus(await res.json());
      setNow(Date.now());
      setLoadState("ready");
    } catch {
      // Un échec d'actualisation ne remplace pas la page : seul le premier chargement affiche l'erreur.
      if (initial) setLoadState("error");
    }
  }, []);

  // Booléen (et non l'objet `session`, recréé à chaque retour sur l'onglet) : le sondage ne repart pas à chaque focus.
  const signedIn = !!session;
  useEffect(() => {
    if (!signedIn) return;
    load(true);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load(false);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [signedIn, load]);

  const retry = () => {
    setLoadState("loading");
    load(true);
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const widgetUrl = widgetToken ? `${origin}/widget/${widgetToken}` : "";
  const chatWidgetUrl = widgetToken ? `${origin}/widget/chat/${widgetToken}` : "";
  const bannerWidgetUrl = widgetToken ? `${origin}/widget/banner/${widgetToken}` : "";

  const handleRegenerate = async () => {
    const ok = await regenerate();
    setShowRegenerateModal(false);
    showToast(
      ok ? "Nouveaux liens générés. Mets à jour OBS et ton bot." : "Impossible de régénérer les liens.",
      ok ? "success" : "error"
    );
  };

  if (!session) return null;
  if (loadState === "loading" || tokenLoading) return <DashboardLoading eyebrow="Centre de contrôle" title="Accueil" />;
  if (loadState === "error" || !status) return <DashboardLoadError eyebrow="Centre de contrôle" title="Accueil" onRetry={retry} />;

  const displayName = status.twitchLogin || session.user?.name || "";
  const avatar = session.user?.image || "";
  const music = widgetStatus("music", status, now);
  const chat = widgetStatus("chat", status, now);
  const banner = widgetStatus("banner", status, now);
  // Les trois widgets comptent dans la bande d'état (le bandeau est facultatif, mais il est suivi comme les autres).
  const liveCount = Number(music.live) + Number(chat.live) + Number(banner.live);

  const summary = !status.spotifyConnected
    ? "Il reste à relier Spotify pour afficher ta musique."
    : liveCount === 3
      ? "Tes trois widgets sont en ligne dans OBS."
      : liveCount > 1
        ? `${liveCount} de tes widgets sont en ligne dans OBS.`
        : liveCount === 1
          ? "Un de tes widgets est en ligne dans OBS."
          : "Aucun widget n'est en ligne dans OBS pour l'instant.";

  // Mode test : mêmes URLs que OBS + ?test=1 (données factices, vrais réglages, aucune statistique).
  const testLink = (url: string) => ({
    href: url ? `${url}?test=1` : undefined,
    "aria-disabled": !url,
    className: `${ACTION_BTN} ${url ? "" : "pointer-events-none opacity-50"}`,
  });

  return (
    <div className="space-y-10">
      {/* Accueil : qui est connecté, et l'état des trois briques en un coup d'œil. */}
      <section
        aria-label="Accueil"
        className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-950/60 p-6 sm:p-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_90%_at_0%_0%,rgba(147,51,234,0.2),transparent_65%)]"
        />
        <div className="relative">
          <div className="flex items-center gap-4">
            {avatar ? (
              <img src={avatar} alt="" className="h-14 w-14 shrink-0 rounded-full border border-white/15 object-cover sm:h-16 sm:w-16" />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/15 bg-purple-500/20 font-display text-2xl font-extrabold text-white sm:h-16 sm:w-16"
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-purple-200/80">Centre de contrôle</p>
              <h1 className="truncate font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Salut, {displayName}
              </h1>
            </div>
          </div>

          <p className="mt-5 text-base text-zinc-300">{summary}</p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <VitalTile
              href="/dashboard/spotify"
              icon={<Music size={18} />}
              label="Spotify"
              value={status.spotifyConnected ? "Relié" : "À relier"}
              tone={status.spotifyConnected ? "ok" : "warn"}
            />
            <VitalTile
              href="/dashboard/account"
              icon={<Tv size={18} />}
              label="Twitch"
              value={status.twitchLogin ? `@${status.twitchLogin.toLowerCase()}` : "Non connecté"}
              tone={status.twitchLogin ? "ok" : "warn"}
            />
            <VitalTile
              href="#widgets-title"
              icon={<Activity size={18} />}
              label="Widgets dans OBS"
              value={`${liveCount} sur 3 en ligne`}
              tone={liveCount > 0 ? "live" : "idle"}
            />
          </div>
        </div>
      </section>

      {/* S'affiche seulement s'il reste une étape d'installation ; invisible pour un compte déjà en service. */}
      <SetupWizard widgetUrl={widgetUrl} chatWidgetUrl={chatWidgetUrl} />

      <section aria-labelledby="widgets-title" className="space-y-4">
        <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
          <h2 id="widgets-title" className="font-display text-xl font-bold tracking-tight text-white">
            Tes widgets
          </h2>
          <p className="text-sm text-zinc-400">
            « Tester » ouvre le widget avec de fausses données et tes réglages : aucune statistique n'est enregistrée.
          </p>
        </div>

        <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <WidgetRow
            gradient="from-purple-600 to-indigo-600"
            icon={<Music size={22} />}
            name="Widget musique"
            description="Affiche le morceau en cours dans OBS."
            status={
              <StatusPill tone={music.tone} detail={music.detail}>
                {music.label}
              </StatusPill>
            }
            field={<MaskedField value={widgetUrl} secret={widgetToken} label="Lien du widget musique" />}
            note="Source navigateur OBS : 475 × 125 px."
            actions={
              <>
                <Link href="/dashboard/design" className={PRIMARY_BTN}>
                  <Palette size={14} />
                  Personnaliser
                </Link>
                <a {...testLink(widgetUrl)} target="_blank" rel="noopener noreferrer">
                  <Play size={14} />
                  Tester
                </a>
              </>
            }
          />

          <WidgetRow
            gradient="from-emerald-600 to-teal-600"
            icon={<MessageSquareText size={22} />}
            name="Widget chat Twitch"
            description="Affiche ton chat Twitch dans OBS."
            status={
              <StatusPill tone={chat.tone} detail={chat.detail}>
                {chat.label}
              </StatusPill>
            }
            field={<MaskedField value={chatWidgetUrl} secret={widgetToken} label="Lien du widget chat" />}
            note="Source navigateur OBS : 1920 × 1080 px, plein écran."
            actions={
              <>
                <Link href="/dashboard/chat" className={PRIMARY_BTN}>
                  <Palette size={14} />
                  Personnaliser
                </Link>
                <a {...testLink(chatWidgetUrl)} target="_blank" rel="noopener noreferrer">
                  <Play size={14} />
                  Tester
                </a>
              </>
            }
          />

          {/* Widget facultatif : même suivi de chargement dans OBS que les autres, et même décompte « X sur 3 en ligne ». */}
          <WidgetRow
            gradient="from-sky-600 to-cyan-600"
            icon={<Megaphone size={22} />}
            name="Widget bandeau d'informations"
            description="Fait défiler tes messages (réseaux, commandes du chat, partenaires) dans OBS."
            status={
              <StatusPill tone={banner.tone} detail={banner.detail}>
                {banner.label}
              </StatusPill>
            }
            field={<MaskedField value={bannerWidgetUrl} secret={widgetToken} label="Lien du widget bandeau" />}
            note="Source navigateur OBS : largeur du bandeau plus des marges, par exemple 800 × 160 px."
            actions={
              <>
                <Link href="/dashboard/banner" className={PRIMARY_BTN}>
                  <Palette size={14} />
                  Personnaliser
                </Link>
                <a {...testLink(bannerWidgetUrl)} target="_blank" rel="noopener noreferrer">
                  <Play size={14} />
                  Tester
                </a>
              </>
            }
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section
          aria-labelledby="links-security-title"
          className={`flex flex-col justify-between gap-5 rounded-2xl border p-6 ${
            legacyActive ? "border-amber-500/25 bg-amber-500/[0.05]" : "border-white/[0.08] bg-white/[0.02]"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sky-300"
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 id="links-security-title" className="text-base font-semibold text-white">
                Sécurité des liens
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                {legacyActive
                  ? "Ton ancien lien (basé sur l'identifiant du compte) fonctionne encore. Régénère les liens pour le désactiver."
                  : "Ces liens sont personnels : ils sont masqués par défaut, ne les montre pas à l'écran. S'ils fuitent, régénère-les."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRegenerateModal(true)}
            disabled={!widgetToken || regenerating}
            className={`${ACTION_BTN} self-start disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <RefreshCw size={14} className={regenerating ? "animate-spin" : ""} />
            Régénérer les liens
          </button>
        </section>

        <section aria-labelledby="community-title" className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
          <div className="flex items-start gap-4">
            <div
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-purple-300"
            >
              <Users size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="community-title" className="text-base font-semibold text-white">
                Communauté
              </h2>
              <p className="mt-1 text-sm text-zinc-400">Dis ce que tu veux voir arriver, et suis les mises à jour.</p>
              <div className="-mx-3 mt-3 flex flex-col">
                <Link href="/ideas" className={TEXT_LINK}>
                  <Lightbulb size={16} className="text-amber-400" />
                  Proposer une idée
                </Link>
                <Link href="/changelog" className={TEXT_LINK}>
                  <History size={16} className="text-blue-400" />
                  Voir les nouveautés
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={showRegenerateModal}
        title="Régénérer les liens ?"
        description="Un nouveau jeton remplace l'ancien dans tous tes liens."
        confirmLabel="Régénérer"
        loadingLabel="Génération..."
        loading={regenerating}
        onConfirm={handleRegenerate}
        onCancel={() => setShowRegenerateModal(false)}
      >
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-400">
          <li>Les anciens liens des widgets et des commandes bot s'arrêtent immédiatement.</li>
          <li>Tu devras mettre à jour tes sources OBS et tes commandes bot avec les nouveaux liens.</li>
        </ul>
      </ConfirmDialog>
      <ToastDisplay toast={toast} />
    </div>
  );
}
