"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { Music, Sliders, Eye, EyeOff, Save, Unlink } from "lucide-react";
import { PageHeader, InfoStep } from "@/components/dashboard/DashboardUI";
import { useToast, ToastDisplay } from "@/components/dashboard/useToast";

export default function DashboardSpotify() {
  const { data: session } = useSession();
  const { toast, showToast } = useToast();

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);
  const [loading, setLoading] = useState(false);

  const redirectUri = typeof window !== "undefined"
    ? `${window.location.origin}/api/callback/spotify`
    : "";

  const loadUserData = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setIsConnected(!!data.hasSpotifyToken);
        if (data.spotifyClientId) setClientId(data.spotifyClientId);
      }
    } catch (e) {
      console.error("Erreur de chargement profil", e);
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
    if (!confirm("Voulez-vous vraiment vous déconnecter de Spotify ?")) return;
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

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Intégrations" title="Spotify" />

      <div className="rounded-[32px] border border-zinc-800 bg-zinc-950/60 p-8 shadow-2xl shadow-black/30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <InfoStep
            step="Étape 1"
            title="Créer l'app"
            text="Rendez-vous sur le Dashboard de Spotify Developer pour créer une application."
            href="https://developer.spotify.com/dashboard"
          />
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <span className="inline-flex rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-purple-300">Étape 2</span>
            <h3 className="mt-3 text-base font-bold text-white">Redirect URI</h3>
            <p className="mt-2 text-sm text-zinc-400">Ajoutez exactement cette URL dans votre app Spotify :</p>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-700 bg-black/40 p-2">
              <code className="flex-1 truncate text-[11px] text-zinc-200">{redirectUri}</code>
              <button
                onClick={handleCopyRedirectUri}
                className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] transition ${copiedUri ? "bg-emerald-500/20 text-emerald-300" : "bg-purple-600 text-white"}`}
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

        <div className="rounded-[28px] border border-zinc-800 bg-black/20 p-6">
          <div className="flex items-center gap-2 pb-4">
            <Sliders size={16} className="text-purple-400" />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-300">Identifiants d'accès</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Ex: 8a4c..."
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950/80 p-4 text-sm text-white outline-none transition focus:border-purple-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Client Secret</label>
              <div className="relative">
                <input
                  type={showClientSecret ? "text" : "password"}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Ex: ••••••••••••••••"
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-950/80 p-4 pr-12 text-sm text-white outline-none transition focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowClientSecret(!showClientSecret)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showClientSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-4 border-t border-zinc-800 pt-6">
            <button
              onClick={saveSpotifyKeys}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-black transition hover:bg-zinc-200 disabled:opacity-60"
            >
              <Save size={16} />
              Sauvegarder
            </button>

            {isConnected ? (
              <button
                onClick={handleDisconnectSpotify}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-red-300 transition hover:bg-red-500/20"
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
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#1DB954] px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-black transition hover:bg-[#1ed760]"
              >
                <Music size={16} />
                Associer mon compte
              </button>
            )}
          </div>
        </div>
      </div>

      <ToastDisplay toast={toast} />
    </div>
  );
}
