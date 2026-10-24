"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { Music, Sliders, Eye, EyeOff, Save, Unlink } from "lucide-react";
import { PageHeader, InfoStep, DashboardLoading, DashboardLoadError } from "@/components/dashboard/DashboardUI";
import { useToast, ToastDisplay } from "@/components/dashboard/useToast";
import { useDialog } from "@/components/DialogProvider";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";
const INPUT =
  "w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-base text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60";

export default function DashboardSpotify() {
  const { data: session } = useSession();
  const { toast, showToast } = useToast();
  const { confirm } = useDialog();

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);
  const [loading, setLoading] = useState(false);
  // Les identifiants et l'état de connexion viennent du serveur : rien n'est affiché avant leur arrivée.
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  const redirectUri = typeof window !== "undefined"
    ? `${window.location.origin}/api/callback/spotify`
    : "";

  const loadUserData = useCallback(async () => {
    setLoadState("loading");
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setIsConnected(!!data.hasSpotifyToken);
      if (data.spotifyClientId) setClientId(data.spotifyClientId);
      setLoadState("ready");
    } catch (e) {
      console.error("Erreur de chargement profil", e);
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    if (session) loadUserData();
  }, [session, loadUserData]);

  const saveSpotifyKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/spotify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      if (res.ok) showToast("Configuration Spotify enregistrée avec succès !");
      else showToast("Erreur lors de la sauvegarde.", "error");
    } catch (e) {
      showToast("Erreur lors de la sauvegarde.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectSpotify = async () => {
    const ok = await confirm({
      title: "Se déconnecter de Spotify ?",
      description: "Ton widget musique n'affichera plus ta musique tant que tu n'auras pas réassocié ton compte.",
      confirmLabel: "Se déconnecter",
    });
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch("/api/spotify/disconnect", { method: "POST" });
      if (res.ok) {
        setIsConnected(false);
        showToast("Compte Spotify déconnecté avec succès.");
      }
    } catch (e) {
      showToast("Erreur lors de la déconnexion.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRedirectUri = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopiedUri(true);
      setTimeout(() => setCopiedUri(false), 2000);
    } catch (e) {
      console.error("Erreur de copie URL", e);
    }
  };

  if (!session) return null;
  if (loadState === "loading") return <DashboardLoading eyebrow="Intégrations" title="Spotify" />;
  if (loadState === "error") return <DashboardLoadError eyebrow="Intégrations" title="Spotify" onRetry={loadUserData} />;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Intégrations" title="Spotify" />

      {/* Préparation côté Spotify : trois repères avant de saisir les identifiants */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <InfoStep
          step="Étape 1"
          title="Créer l'app"
          text="Rendez-vous sur le Dashboard de Spotify Developer pour créer une application."
          href="https://developer.spotify.com/dashboard"
        />

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <span className="inline-flex rounded-full border border-purple-500/25 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-200">
            Étape 2
          </span>
          <h3 className="mt-3 text-base font-semibold text-white">Redirect URI</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">Ajoutez exactement cette URL dans votre app Spotify :</p>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 p-2">
            <code className="flex-1 truncate px-1 font-mono text-xs text-zinc-200">{redirectUri}</code>
            <button
              onClick={handleCopyRedirectUri}
              className={`shrink-0 cursor-pointer rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${FOCUS} ${
                copiedUri ? "bg-emerald-500/20 text-emerald-200" : "bg-purple-600 text-white hover:bg-purple-500"
              }`}
            >
              {copiedUri ? "Copié" : "Copier"}
            </button>
          </div>
        </div>

        <InfoStep
          step="Prérequis"
          title="Spotify Premium"
          text="Un compte Spotify Premium actif est nécessaire pour lire la musique en direct via l'API web."
          href="https://developer.spotify.com/documentation/web-api"
          tone="amber"
        />
      </div>

      {/* Identifiants */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        <h2 className="flex items-center gap-2.5 font-display text-xl font-bold text-white">
          <Sliders size={18} className="text-purple-300" />
          Identifiants d'accès
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="spotify-client-id" className="text-sm font-medium text-zinc-200">
              Client ID
            </label>
            <input
              id="spotify-client-id"
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Ex: 8a4c..."
              autoComplete="off"
              className={INPUT}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="spotify-client-secret" className="text-sm font-medium text-zinc-200">
              Client Secret
            </label>
            <div className="relative">
              <input
                id="spotify-client-secret"
                type={showClientSecret ? "text" : "password"}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Ex: ••••••••••••••••"
                autoComplete="off"
                className={`${INPUT} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowClientSecret(!showClientSecret)}
                aria-label={showClientSecret ? "Masquer le Client Secret" : "Afficher le Client Secret"}
                className={`absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-zinc-400 transition-colors hover:text-white ${FOCUS}`}
              >
                {showClientSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row">
          <button
            onClick={saveSpotifyKeys}
            disabled={loading}
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-60 ${FOCUS}`}
          >
            <Save size={16} />
            Sauvegarder
          </button>

          {isConnected ? (
            <button
              onClick={handleDisconnectSpotify}
              disabled={loading}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-3.5 text-base font-semibold text-red-200 transition-colors hover:bg-red-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:opacity-60"
            >
              <Unlink size={16} />
              Se déconnecter
            </button>
          ) : (
            <button
              onClick={async () => {
                const res = await fetch("/api/spotify/auth-url");
                const data = await res.json();
                if (data.url) window.location.href = data.url;
              }}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1DB954] px-6 py-3.5 text-base font-semibold text-black transition-colors hover:bg-[#1ed760] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1DB954]"
            >
              <Music size={16} />
              Associer mon compte
            </button>
          )}
        </div>
      </section>

      <ToastDisplay toast={toast} />
    </div>
  );
}
