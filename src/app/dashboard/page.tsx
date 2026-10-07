"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  CheckCircle2, Music, Activity, MessageSquare, MessageSquareText, Palette, Lightbulb, History, RefreshCw,
} from "lucide-react";
import { PageHeader, StatCard, SourceCard, QuickActionLink } from "@/components/dashboard/DashboardUI";
import { useToast, ToastDisplay } from "@/components/dashboard/useToast";
import { useWidgetToken } from "@/components/dashboard/useWidgetToken";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";

export default function DashboardOverview() {
  const { data: session } = useSession();
  const twitchLogin = (session?.user as any)?.name?.toLowerCase();

  const [isConnected, setIsConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedChat, setCopiedChat] = useState(false);
  const { toast, showToast } = useToast();
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const { token: widgetToken, legacyActive, regenerating, regenerate } = useWidgetToken(!!session);

  useEffect(() => {
    if (!session) return;
    fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setIsConnected(!!data.hasSpotifyToken);
      })
      .catch(() => {});
  }, [session]);

  const widgetUrl = typeof window !== "undefined" && widgetToken
    ? `${window.location.origin}/widget/${widgetToken}`
    : "";

  const chatWidgetUrl = typeof window !== "undefined" && widgetToken
    ? `${window.location.origin}/widget/chat/${widgetToken}`
    : "";

  const handleRegenerate = async () => {
    const ok = await regenerate();
    setShowRegenerateModal(false);
    showToast(
      ok ? "Nouveaux liens générés. Mets à jour OBS et ton bot." : "Impossible de régénérer les liens.",
      ok ? "success" : "error"
    );
  };

  if (!session) return null;

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Centre de contrôle" title="Accueil" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          icon={<Activity className="text-emerald-400" />}
          label="Connexion Spotify"
          value={isConnected ? "Opérationnel" : "Non configuré"}
          tone={isConnected ? "emerald" : "amber"}
        />
        <StatCard
          icon={<MessageSquare className="text-purple-400" />}
          label="Connexion Twitch"
          value={twitchLogin ? `@${twitchLogin}` : "Non connecté"}
          tone={twitchLogin ? "purple" : "amber"}
        />
        <StatCard
          icon={<Activity className="text-amber-400" />}
          label="Widgets actifs"
          value={`${(isConnected ? 1 : 0) + (twitchLogin ? 1 : 0)} / 2`}
          tone="amber"
        />
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600 mb-4">Sources OBS</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SourceCard
            icon={copied ? <CheckCircle2 size={24} /> : <Music size={24} />}
            label="Widget Musique"
            statusText={copied ? "Lien copié dans le presse-papier !" : "Cliquez pour copier l'URL musique"}
            gradient="from-purple-600 to-indigo-600"
            glow="bg-purple-600/10"
            onClick={() => {
              if (!widgetUrl) return;
              navigator.clipboard.writeText(widgetUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          />
          <SourceCard
            icon={copiedChat ? <CheckCircle2 size={24} /> : <MessageSquareText size={24} />}
            label="Widget Chat Twitch"
            statusText={copiedChat ? "Lien copié dans le presse-papier !" : "Cliquez pour copier l'URL du chat"}
            gradient="from-emerald-600 to-teal-600"
            glow="bg-emerald-600/10"
            onClick={() => {
              if (!chatWidgetUrl) return;
              navigator.clipboard.writeText(chatWidgetUrl);
              setCopiedChat(true);
              setTimeout(() => setCopiedChat(false), 2000);
            }}
          />
        </div>
      </div>

      <div>
        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-white">Sécurité des liens</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              {legacyActive
                ? "Ton ancien lien (basé sur l'identifiant du compte) fonctionne encore. Régénère les liens pour le désactiver."
                : "Ces liens sont personnels : ne les montre pas à l'écran. S'ils fuitent, régénère-les."}
            </p>
          </div>
          <button
            onClick={() => setShowRegenerateModal(true)}
            disabled={!widgetToken || regenerating}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-200 transition hover:border-purple-500/50 hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={14} className={regenerating ? "animate-spin" : ""} />
            Régénérer les liens
          </button>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600 mb-4">Accès rapide</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <QuickActionLink
            icon={<Palette className="text-purple-400" />}
            title="Personnaliser le widget musique"
            subtitle="Typographie, couleurs, flou et animations"
            href="/dashboard/design"
          />
          <QuickActionLink
            icon={<Music className="text-emerald-400" />}
            title="Gérer la connexion Spotify"
            subtitle="Client ID, Secret et OAuth"
            href="/dashboard/spotify"
          />
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600 mb-4">Communauté</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <QuickActionLink
            icon={<Lightbulb className="text-amber-400" />}
            title="Proposer une idée"
            subtitle="Votez pour les prochaines fonctionnalités"
            href="/ideas"
          />
          <QuickActionLink
            icon={<History className="text-blue-400" />}
            title="Voir les nouveautés"
            subtitle="Journal des dernières mises à jour"
            href="/changelog"
          />
        </div>
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
