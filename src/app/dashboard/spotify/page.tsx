"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { Music, Eye, EyeOff, Save, Unlink, ExternalLink, Info } from "lucide-react";
import { PageHeader, DashboardLoading, DashboardLoadError } from "@/components/dashboard/DashboardUI";
import { useToast, ToastDisplay } from "@/components/dashboard/useToast";
import { useWidgetToken } from "@/components/dashboard/useWidgetToken";
import { useDialog } from "@/components/DialogProvider";
import { StepRail, type StepState } from "@/components/dashboard/StepRail";
import { ACTION_BTN, MaskedField, StatusPill, type PillTone } from "@/components/dashboard/WidgetUI";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";
const INPUT =
  "w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-base text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60";
const SECTION_TITLE = "mb-4 font-display text-lg font-bold tracking-tight text-white";

// Vérification de la connexion : la lecture en cours telle que la renvoie la route du widget.
type Probe =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "playing"; title: string; artist: string; cover: string | null }
  | { state: "empty" }
  | { state: "error" };

const PROBE_POLL_MS = 8000;

// Une fois le compte relié, la page ne montre plus un tutoriel mais la preuve que ça marche : ta lecture en cours,
// sur la pochette floutée, comme le widget lui-même.
function NowPlayingHero({ probe }: { probe: Probe }) {
  const cover = probe.state === "playing" ? probe.cover : null;
  const pending = probe.state === "loading" || probe.state === "idle";
  const tone: PillTone = probe.state === "playing" ? "live" : probe.state === "error" ? "warn" : "idle";

  return (
    <section aria-label="Test de connexion" className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
      {cover ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${cover})`, filter: "blur(36px) brightness(0.4)", transform: "scale(1.4)" }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-purple-600/15 via-transparent to-transparent" />
      )}

      <div role="status" aria-live="polite" className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.05] text-zinc-500 shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
          {probe.state === "playing" && probe.cover ? (
            <img src={probe.cover} alt="" className="h-full w-full object-cover" />
          ) : pending ? (
            <div className="twichify-skeleton h-full w-full" />
          ) : (
            <Music size={36} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {pending ? (
            <div className="space-y-3">
              <div className="twichify-skeleton h-4 w-24 rounded" />
              <div className="twichify-skeleton h-8 w-64 max-w-full rounded" />
              <div className="twichify-skeleton h-5 w-40 rounded" />
            </div>
          ) : (
            <>
              <StatusPill tone={tone}>
                {probe.state === "playing" ? "En lecture" : probe.state === "error" ? "Connexion instable" : "Compte relié"}
              </StatusPill>
              <p
                className={`mt-2 truncate font-display text-3xl font-extrabold tracking-tight ${
                  probe.state === "playing" ? "text-white" : "text-zinc-200"
                }`}
              >
                {probe.state === "playing"
                  ? probe.title
                  : probe.state === "error"
                    ? "Spotify ne répond pas"
                    : "Rien en lecture"}
              </p>
              <p className="mt-1 max-w-xl text-base leading-relaxed text-zinc-300">
                {probe.state === "playing"
                  ? probe.artist
                  : probe.state === "error"
                    ? "Nouvel essai automatique dans quelques secondes. Si le problème dure, réassocie ton compte."
                    : "Lance un morceau dans Spotify : il apparaît ici en quelques secondes."}
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// Ligne de réglage : titre et explication à gauche, action à droite, contenu déplié dessous.
function SettingRow({
  title,
  description,
  action,
  highlight = false,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  highlight?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`p-5 ${highlight ? "bg-amber-500/[0.05]" : ""}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-400">{description}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export default function DashboardSpotify() {
  const { data: session } = useSession();
  const { toast, showToast } = useToast();
  const { confirm } = useDialog();
  const { token: widgetToken } = useWidgetToken(!!session);

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  // Client ID tel qu'il est enregistré côté serveur : sert à savoir si les identifiants existent et si le formulaire a été modifié.
  const [savedClientId, setSavedClientId] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  // Compte relié : le formulaire d'identifiants est replié tant qu'on ne clique pas sur « Modifier ».
  const [editing, setEditing] = useState(false);
  // Identifiants changés alors que le compte était déjà relié : l'ancien accès Spotify ne vaut plus, il faut réassocier.
  const [needsReauth, setNeedsReauth] = useState(false);
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [probe, setProbe] = useState<Probe>({ state: "idle" });
  // Les identifiants et l'état de connexion viennent du serveur : rien n'est affiché avant leur arrivée.
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  const redirectUri = typeof window !== "undefined" ? `${window.location.origin}/api/callback/spotify` : "";

  const loadUserData = useCallback(async () => {
    setLoadState("loading");
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setIsConnected(!!data.hasSpotifyToken);
      if (data.spotifyClientId) {
        setClientId(data.spotifyClientId);
        setSavedClientId(data.spotifyClientId);
      }
      setLoadState("ready");
    } catch (e) {
      console.error("Erreur de chargement profil", e);
      setLoadState("error");
    }
  }, []);

  // Booléen (et non l'objet `session`, recréé à chaque retour sur l'onglet) : sinon la page se recharge, et le formulaire
  // d'identifiants en cours de saisie est effacé, chaque fois qu'on revient dessus.
  const signedIn = !!session;
  useEffect(() => {
    if (signedIn) loadUserData();
  }, [signedIn, loadUserData]);

  // Test de connexion : une fois le compte relié, on affiche la vraie lecture en cours pour confirmer que tout fonctionne.
  useEffect(() => {
    if (!signedIn || !isConnected || !widgetToken) {
      setProbe({ state: "idle" });
      return;
    }
    let cancelled = false;

    const run = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/spotify/now-playing/${widgetToken}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (cancelled) return;
        if (data?.error) setProbe({ state: "error" });
        else if (data?.isPlaying && data.title)
          setProbe({ state: "playing", title: data.title, artist: data.artist || "", cover: data.albumImageUrl || null });
        else setProbe({ state: "empty" });
      } catch {
        if (!cancelled) setProbe({ state: "error" });
      }
    };

    setProbe({ state: "loading" });
    run();
    const id = setInterval(run, PROBE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [signedIn, isConnected, widgetToken]);

  const credentialsSaved = savedClientId !== "";
  // Le Client Secret n'est jamais renvoyé par le serveur : dès qu'on le saisit, ou qu'on change le Client ID, le formulaire est modifié.
  const dirty = clientId.trim() !== savedClientId || clientSecret.length > 0;
  // Les deux champs sont enregistrés ensemble : enregistrer un Client ID sans Secret écraserait le Secret existant par une valeur vide.
  const canSave = clientId.trim() !== "" && clientSecret.trim() !== "" && !saving;

  const saveSpotifyKeys = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const trimmedId = clientId.trim();
      const res = await fetch("/api/user/spotify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: trimmedId, clientSecret: clientSecret.trim() }),
      });
      if (res.ok) {
        setClientId(trimmedId);
        setSavedClientId(trimmedId);
        setClientSecret("");
        setShowClientSecret(false);
        setEditing(false);
        if (isConnected) setNeedsReauth(true);
        showToast(
          isConnected
            ? "Identifiants enregistrés. Réassocie ton compte pour qu'ils soient pris en compte."
            : "Identifiants enregistrés. Il reste à associer ton compte."
        );
      } else showToast("Erreur lors de la sauvegarde.", "error");
    } catch (e) {
      showToast("Erreur lors de la sauvegarde.", "error");
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setClientId(savedClientId);
    setClientSecret("");
    setShowClientSecret(false);
    setEditing(false);
  };

  const startOAuth = async () => {
    setLinking(true);
    try {
      const res = await fetch("/api/spotify/auth-url");
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      showToast("Impossible de lancer l'association. Vérifie tes identifiants.", "error");
    } catch (e) {
      showToast("Impossible de lancer l'association Spotify.", "error");
    }
    setLinking(false);
  };

  const handleDisconnectSpotify = async () => {
    const ok = await confirm({
      title: "Se déconnecter de Spotify ?",
      description: "Ton widget musique n'affichera plus ta musique tant que tu n'auras pas réassocié ton compte.",
      confirmLabel: "Se déconnecter",
    });
    if (!ok) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/spotify/disconnect", { method: "POST" });
      if (res.ok) {
        setIsConnected(false);
        setNeedsReauth(false);
        setEditing(false);
        showToast("Compte Spotify déconnecté avec succès.");
      } else showToast("Erreur lors de la déconnexion.", "error");
    } catch (e) {
      showToast("Erreur lors de la déconnexion.", "error");
    } finally {
      setDisconnecting(false);
    }
  };

  if (!session) return null;
  if (loadState === "loading") return <DashboardLoading eyebrow="Intégrations" title="Spotify" />;
  if (loadState === "error") return <DashboardLoadError eyebrow="Intégrations" title="Spotify" onRetry={loadUserData} />;

  // Formulaire des identifiants : le même dans le déroulé d'installation et dans la vue « compte relié ».
  const credentialsForm = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveSpotifyKeys();
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="spotify-client-id" className="text-sm font-medium text-zinc-200">
            Client ID
          </label>
          <input
            id="spotify-client-id"
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Colle ton Client ID"
            autoComplete="off"
            spellCheck={false}
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
              placeholder={credentialsSaved ? "Enregistré : saisis-le pour le modifier" : "Colle ton Client Secret"}
              autoComplete="off"
              spellCheck={false}
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

      <p className="text-sm text-zinc-400">
        Le Client Secret est chiffré à l'enregistrement et n'est jamais réaffiché. Pour modifier ton Client ID, saisis aussi le
        Client Secret.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!canSave}
          className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
        >
          <Save size={16} />
          {saving ? "Enregistrement..." : "Enregistrer les identifiants"}
        </button>
        {isConnected && (
          <button type="button" onClick={cancelEditing} className={ACTION_BTN}>
            Annuler
          </button>
        )}
      </div>
    </form>
  );

  const reassociateButton = (
    <button
      type="button"
      onClick={startOAuth}
      disabled={!credentialsSaved || dirty || linking}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        needsReauth
          ? "bg-[#1DB954] text-black hover:bg-[#1ed760] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1DB954]"
          : `border border-white/15 text-zinc-200 hover:border-purple-500/50 hover:text-white ${FOCUS}`
      }`}
    >
      <Music size={15} />
      {linking ? "Redirection..." : "Réassocier mon compte"}
    </button>
  );

  // Prérequis affiché dans les deux vues : sans Spotify Premium, la lecture en direct ne fonctionne pas.
  const premiumNotice = (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
      <Info size={18} className="mt-0.5 shrink-0 text-amber-300" />
      <p className="text-sm leading-relaxed text-zinc-300">
        <strong className="font-semibold text-amber-200">Spotify Premium obligatoire.</strong> D'après la documentation de
        Spotify, le propriétaire d'une application en mode développement (c'est-à-dire toi) doit avoir un compte Premium actif,
        sinon elle ne fonctionne pas.{" "}
        <a
          href="https://developer.spotify.com/documentation/web-api/concepts/quota-modes"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-200 underline decoration-white/30 underline-offset-2 hover:text-white"
        >
          Lire la documentation Spotify
        </a>
      </p>
    </div>
  );

  // ───────── Compte relié : preuve que ça marche, puis réglages ─────────
  if (isConnected) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Intégrations" title="Spotify" action={<StatusPill tone="ok">Compte relié</StatusPill>} />

        {premiumNotice}

        <NowPlayingHero probe={probe} />

        <section aria-labelledby="spotify-app-title">
          <h2 id="spotify-app-title" className={SECTION_TITLE}>
            Application Spotify
          </h2>
          <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02]">
            <SettingRow
              title="Client ID"
              description="Identifiant de ton application dans le Dashboard Spotify Developer."
              action={
                !editing && (
                  <button type="button" onClick={() => setEditing(true)} className={ACTION_BTN}>
                    Modifier
                  </button>
                )
              }
            >
              {editing ? (
                credentialsForm
              ) : (
                <code className="block truncate rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 font-mono text-xs text-zinc-200">
                  {savedClientId}
                </code>
              )}
            </SettingRow>

            <SettingRow
              title="Redirect URI"
              description="À ajouter exactement telle quelle dans les réglages de ton application Spotify."
            >
              <MaskedField value={redirectUri} label="Redirect URI" />
            </SettingRow>

            <SettingRow
              title="Compte Spotify"
              description={
                needsReauth
                  ? "Identifiants modifiés : réassocie ton compte pour qu'ils soient pris en compte."
                  : "Réassocie ton compte si le widget ne reçoit plus ta musique."
              }
              highlight={needsReauth}
              action={reassociateButton}
            />
          </div>
        </section>

        <section aria-labelledby="spotify-disconnect-title" className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="spotify-disconnect-title" className="text-sm font-semibold text-white">
                Se déconnecter de Spotify
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-400">
                Le widget musique n'affichera plus ta musique tant que tu n'auras pas réassocié ton compte.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDisconnectSpotify}
              disabled={disconnecting}
              className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Unlink size={15} />
              {disconnecting ? "Déconnexion..." : "Se déconnecter"}
            </button>
          </div>
        </section>

        <ToastDisplay toast={toast} />
      </div>
    );
  }

  // ───────── Compte non relié : le déroulé d'installation ─────────
  // Les deux étapes côté Spotify sont considérées faites dès que les identifiants sont enregistrés
  // (impossible de les enregistrer sans avoir créé l'application).
  const done = [credentialsSaved, credentialsSaved, credentialsSaved && !dirty, false];
  const currentIndex = done.findIndex((d) => !d);
  const stateOf = (i: number): StepState => (done[i] ? "done" : i === currentIndex ? "current" : "todo");

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Intégrations" title="Spotify" action={<StatusPill tone="warn">Compte non relié</StatusPill>} />

      <div className="max-w-3xl space-y-6">
        {premiumNotice}

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
          <StepRail index={1} state={stateOf(0)} title="Créer une application Spotify" summary="Application créée.">
            <p>Rends-toi sur le Dashboard Spotify Developer pour créer une application.</p>
            <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" className={ACTION_BTN}>
              Ouvrir le dashboard Spotify
              <ExternalLink size={14} />
            </a>
          </StepRail>

          <StepRail index={2} state={stateOf(1)} title="Ajouter la Redirect URI" summary="Redirect URI ajoutée.">
            <p>Ajoute exactement cette URL dans les réglages de ton application Spotify.</p>
            <MaskedField value={redirectUri} label="Redirect URI" />
          </StepRail>

          <StepRail
            index={3}
            state={stateOf(2)}
            title="Enregistrer tes identifiants"
            summary={`Client ID enregistré (${savedClientId.slice(0, 6)}…).`}
          >
            {credentialsForm}
          </StepRail>

          <StepRail index={4} state={stateOf(3)} title="Associer ton compte Spotify" last>
            <p>Spotify te demande d'autoriser l'accès, puis te ramène ici.</p>
            <button
              type="button"
              onClick={startOAuth}
              disabled={!credentialsSaved || dirty || linking}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1DB954] px-6 py-3 text-base font-semibold text-black transition-colors hover:bg-[#1ed760] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1DB954] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Music size={16} />
              {linking ? "Redirection..." : "Associer mon compte"}
            </button>
            {(!credentialsSaved || dirty) && (
              <p className="text-sm text-zinc-400">Enregistre d'abord tes identifiants pour activer ce bouton.</p>
            )}
          </StepRail>
        </section>
      </div>

      <ToastDisplay toast={toast} />
    </div>
  );
}
