"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useRef, type CSSProperties } from "react";
import {
  Layout, Type, Image as ImageIcon, Music, Zap, Clock, RotateCw, Sparkles, Palette, Eye, EyeOff,
  BarChart3, Timer, Activity, RefreshCw, Play, Sliders, Save, Check,
} from "lucide-react";
import { PageHeader, SliderRow, DashboardLoading, DashboardLoadError } from "@/components/dashboard/DashboardUI";
import { useToast, ToastDisplay } from "@/components/dashboard/useToast";
import { useWidgetToken } from "@/components/dashboard/useWidgetToken";
import {
  WIDGET_ENTRY_KEYFRAMES,
  entryAnimation,
  exitAnimation,
  exitDurationMs,
  revealCoverAnimation,
  revealCoverExitAnimation,
  speedFactorOf,
  type AnimationStyle,
} from "@/lib/widget-animation";
import {
  ALL_FONTS,
  GOOGLE_FONTS,
  FONT_CATEGORY_LABELS,
  ensureStylesheet,
  googleFontsUrl,
  resolveFont,
  type FontCategory,
} from "@/lib/widget-fonts";

type TabId = "apparence" | "elements" | "animation" | "comportement";
type Tone = "violet" | "emerald" | "cyan" | "amber";

// Styles d'un bouton interrupteur selon sa couleur (mêmes codes couleur que la page du widget chat).
const TONE_CLASSES: Record<Tone, { on: string; icon: string }> = {
  violet: { on: "border-violet-500/50 bg-violet-500/10", icon: "text-violet-400" },
  emerald: { on: "border-emerald-500/50 bg-emerald-500/10", icon: "text-emerald-400" },
  cyan: { on: "border-cyan-500/50 bg-cyan-500/10", icon: "text-cyan-400" },
  amber: { on: "border-amber-500/50 bg-amber-500/10", icon: "text-amber-400" },
};

function ToggleButton({
  active, onClick, icon, label, tone = "violet",
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone?: Tone;
}) {
  const t = TONE_CLASSES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-between rounded-xl border p-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 ${
        active ? `${t.on} text-white` : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
      }`}
    >
      <span className="flex items-center gap-2.5">{icon} {label}</span>
      {active ? <Check size={16} className={t.icon} /> : <Eye size={16} />}
    </button>
  );
}

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
      <span className="text-violet-400">{icon}</span> {children}
    </h3>
  );
}

const ANIMATION_OPTIONS: { id: AnimationStyle; label: string; desc: string }[] = [
  { id: "expand", label: "Déploiement", desc: "La carte monte et s'élargit" },
  { id: "reveal", label: "Pochette qui glisse", desc: "La pochette ouvre la carte" },
  { id: "slide", label: "Glissement", desc: "Entre depuis la gauche" },
  { id: "fade", label: "Fondu", desc: "Apparition en douceur" },
  { id: "pop", label: "Zoom", desc: "Léger effet de zoom" },
];

const SPEED_OPTIONS = [
  { id: "slow", label: "Lente" },
  { id: "normal", label: "Normale" },
  { id: "fast", label: "Rapide" },
];

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop";
// GIF transparent 1×1 : sert de pochette tant que la vraie musique n'est pas connue (pas de pochette d'exemple qui clignote).
const PLACEHOLDER_COVER = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export default function DashboardDesign() {
  const { data: session } = useSession();
  const { toast, showToast } = useToast();
  const { token: widgetToken, loading: tokenLoading } = useWidgetToken(!!session);

  const [tab, setTab] = useState<TabId>("apparence");

  const [layout, setLayout] = useState("default");
  const [fontFamily, setFontFamily] = useState("font-sans");
  const [showCover, setShowCover] = useState(true);
  const [showProgress, setShowProgress] = useState(true);
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [showArtist, setShowArtist] = useState(true);
  const [isRotating, setIsRotating] = useState(false);
  const [enableGlow, setEnableGlow] = useState(true);
  const [enableBlurBg, setEnableBlurBg] = useState(true);
  const [accentColor, setAccentColor] = useState("#22c55e");
  const [borderRadius, setBorderRadius] = useState("15");
  const [bgOpacity, setBgOpacity] = useState("60");
  const [blurAmount, setBlurAmount] = useState("10");
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [autoHide, setAutoHide] = useState(false);
  const [autoHideSeconds, setAutoHideSeconds] = useState("10");
  const [animationStyle, setAnimationStyle] = useState("expand");
  const [animationSpeed, setAnimationSpeed] = useState("normal");
  const [trackChangeAnimation, setTrackChangeAnimation] = useState(true);
  const [glowPulse, setGlowPulse] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  // Les réglages viennent du serveur : rien n'est affiché (ni enregistrable) avant leur arrivée.
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  // Première réponse de la route now-playing : évite d'afficher d'abord un morceau d'exemple dans l'aperçu.
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [fontCategory, setFontCategory] = useState<FontCategory | "all">("all");
  // Modifications non enregistrées : on compare les réglages actuels à un instantané pris au chargement puis à chaque sauvegarde.
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [loadTick, setLoadTick] = useState(0);

  // Aperçu : relance de l'entrée (remontage) et lecture de la sortie (puis ré-entrée automatique).
  const [replayKey, setReplayKey] = useState(0);
  const [previewExiting, setPreviewExiting] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
  }, []);

  // ── Modifications non enregistrées ──
  const snapshot = JSON.stringify({
    layout, fontFamily, showCover, showProgress, showTimestamp, showArtist, isRotating, enableGlow, enableBlurBg,
    accentColor, borderRadius, bgOpacity, blurAmount, showEqualizer, autoHide, autoHideSeconds,
    animationStyle, animationSpeed, trackChangeAnimation, glowPulse,
  });
  const isDirty = savedSnapshot !== null && snapshot !== savedSnapshot;

  // Instantané de référence : pris dans le même rendu que les réglages chargés (loadTick change avec eux).
  useEffect(() => {
    if (loadTick > 0) setSavedSnapshot(snapshot);
  }, [loadTick]);

  // Fermeture ou rechargement de l'onglet.
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  // Navigation interne (liens du menu) : on demande confirmation avant de perdre les modifications.
  useEffect(() => {
    if (!isDirty) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm("Tu as des modifications non enregistrées. Quitter la page sans sauvegarder ?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isDirty]);

  // Polices : la police choisie est toujours chargée ; toute la bibliothèque seulement quand l'onglet Apparence est ouvert.
  const resolvedFont = resolveFont(fontFamily);
  useEffect(() => {
    if (resolvedFont.href && resolvedFont.family) ensureStylesheet(`wf-${resolvedFont.family}`, resolvedFont.href);
  }, [resolvedFont.href, resolvedFont.family]);
  useEffect(() => {
    if (tab === "apparence") ensureStylesheet("wf-all", googleFontsUrl(GOOGLE_FONTS));
  }, [tab]);

  const loadUserData = useCallback(async () => {
    setLoadState("loading");
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.widgetSettings) {
          const s = data.widgetSettings;
          setLayout(s.layout || "default");
          setFontFamily(s.fontFamily || "font-sans");
          setShowCover(s.showCover !== false);
          setShowProgress(s.showProgress !== false);
          setShowTimestamp(s.showTimestamp !== false);
          setShowArtist(s.showArtist !== false);
          setIsRotating(!!s.isRotating);
          setEnableGlow(s.enableGlow !== false);
          setEnableBlurBg(s.enableBlurBg !== false);
          setAccentColor(s.accentColor || "#22c55e");
          setBorderRadius(s.borderRadius || "15");
          setBgOpacity(s.bgOpacity || "60");
          setBlurAmount(s.blurAmount || "10");
          setShowEqualizer(!!s.showEqualizer);
          setAutoHide(!!s.autoHide);
          setAutoHideSeconds(String(s.autoHideSeconds || 10));
          setAnimationStyle(s.animationStyle || "expand");
          setAnimationSpeed(s.animationSpeed || "normal");
          setTrackChangeAnimation(s.trackChangeAnimation !== false);
          setGlowPulse(!!s.glowPulse);
        }
        setLoadTick((t) => t + 1);
        setLoadState("ready");
      } else {
        throw new Error(String(res.status));
      }
    } catch (e) {
      console.error("Erreur de chargement profil", e);
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    if (session) loadUserData();
  }, [session, loadUserData]);

  useEffect(() => {
    if (!session || !widgetToken) return;
    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/spotify/now-playing/${widgetToken}`);
        if (res.ok) setCurrentTrack(await res.json());
      } catch (e) {
        console.error("Erreur preview Spotify", e);
      } finally {
        setPreviewLoaded(true);
      }
    };

    fetchPreview();
    const interval = setInterval(fetchPreview, 5000);
    return () => clearInterval(interval);
  }, [session, widgetToken]);

  const saveDesign = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/design-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layout, fontFamily, showCover, showProgress, showTimestamp, showArtist,
          isRotating, enableGlow, enableBlurBg, accentColor, borderRadius, bgOpacity, blurAmount,
          showEqualizer, autoHide, autoHideSeconds: Number(autoHideSeconds) || 10,
          animationStyle, animationSpeed, trackChangeAnimation, glowPulse,
        }),
      });
      if (res.ok) {
        setSavedSnapshot(snapshot);
        showToast("Design du widget mis à jour !");
      } else showToast("Erreur lors de la sauvegarde.", "error");
    } catch (e) {
      showToast("Erreur lors de la sauvegarde.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Presets : appliquent plusieurs réglages d'un coup ──
  const values: Record<string, unknown> = {
    layout, fontFamily, accentColor, borderRadius, bgOpacity, blurAmount,
    enableGlow, enableBlurBg, glowPulse, animationStyle,
  };
  const setters: Record<string, (v: any) => void> = {
    layout: setLayout, fontFamily: setFontFamily, accentColor: setAccentColor, borderRadius: setBorderRadius,
    bgOpacity: setBgOpacity, blurAmount: setBlurAmount, enableGlow: setEnableGlow, enableBlurBg: setEnableBlurBg,
    glowPulse: setGlowPulse, animationStyle: setAnimationStyle,
  };
  const designPresets: { id: string; label: string; desc: string; config: Record<string, string | boolean> }[] = [
    {
      id: "classic", label: "Classique", desc: "Réglages par défaut",
      config: { layout: "default", fontFamily: "font-sans", accentColor: "#22c55e", borderRadius: "15", bgOpacity: "60", blurAmount: "10", enableGlow: true, enableBlurBg: true, glowPulse: false, animationStyle: "expand" },
    },
    {
      id: "neon", label: "Néon", desc: "Violet lumineux, pochette qui glisse",
      config: { layout: "default", fontFamily: "google:Orbitron", accentColor: "#a855f7", borderRadius: "18", bgOpacity: "55", blurAmount: "14", enableGlow: true, enableBlurBg: true, glowPulse: true, animationStyle: "reveal" },
    },
    {
      id: "minimal", label: "Minimal", desc: "Compact, sobre, fondu",
      config: { layout: "minimal", fontFamily: "google:Inter", accentColor: "#ffffff", borderRadius: "20", bgOpacity: "70", blurAmount: "12", enableGlow: false, enableBlurBg: true, glowPulse: false, animationStyle: "fade" },
    },
    {
      id: "retro", label: "Rétro", desc: "Mono ambre, angles nets",
      config: { layout: "default", fontFamily: "google:Space Mono", accentColor: "#f59e0b", borderRadius: "6", bgOpacity: "85", blurAmount: "10", enableGlow: false, enableBlurBg: false, glowPulse: false, animationStyle: "slide" },
    },
    {
      id: "glass", label: "Verre", desc: "Flou et transparence",
      config: { layout: "default", fontFamily: "google:Poppins", accentColor: "#38bdf8", borderRadius: "24", bgOpacity: "35", blurAmount: "24", enableGlow: true, enableBlurBg: true, glowPulse: false, animationStyle: "pop" },
    },
  ];
  const applyPreset = (config: Record<string, string | boolean>) => {
    Object.entries(config).forEach(([key, value]) => setters[key]?.(value));
    setReplayKey((n) => n + 1);
  };

  if (!session) return null;
  if (loadState === "loading") return <DashboardLoading eyebrow="Widgets" title="Widget musique" />;
  if (loadState === "error") return <DashboardLoadError eyebrow="Widgets" title="Widget musique" onRetry={loadUserData} />;

  // Aperçu : tant que la première réponse n'est pas arrivée, ni titre ni pochette d'exemple (sauf si aucun jeton ne viendra).
  const previewReady = previewLoaded || (!tokenLoading && !widgetToken);

  // Keyframes, durées et facteur de vitesse partagés avec le widget OBS (lib/widget-animation) : même rendu garanti.
  const speedK = speedFactorOf(animationSpeed);
  const styleId = animationStyle as AnimationStyle;
  // Style "reveal" en mode horizontal : la pochette est dessinée hors de la carte (comme dans le widget) pour apparaître avant elle.
  const isRevealDefault = animationStyle === "reveal" && layout !== "minimal";
  const previewCoverSrc = !previewReady ? PLACEHOLDER_COVER : currentTrack?.albumImageUrl || FALLBACK_COVER;
  const animationLabel = ANIMATION_OPTIONS.find((o) => o.id === animationStyle)?.label ?? "Déploiement";

  const playEntry = () => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    setPreviewExiting(false);
    setReplayKey((n) => n + 1);
  };
  // Joue la sortie, puis la carte revient toute seule (l'entrée se rejoue) après une courte pause.
  const playExit = () => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    setPreviewExiting(true);
    exitTimerRef.current = setTimeout(() => setPreviewExiting(false), exitDurationMs(styleId, speedK) + 700);
  };

  const cardAnimation = [
    previewExiting ? exitAnimation(styleId, speedK) : entryAnimation(styleId, speedK),
    enableGlow && glowPulse ? "glow-pulse 3.2s ease-in-out infinite" : "",
  ].filter(Boolean).join(", ");

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Widgets"
        title="Widget musique"
        action={
          <div className="flex flex-wrap items-center justify-end gap-4">
            {isDirty && (
              <span className="flex items-center gap-2 text-sm font-medium text-amber-300">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Modifications non enregistrées
              </span>
            )}
            <button
              onClick={saveDesign}
              disabled={loading}
              className="relative flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 disabled:opacity-50"
            >
              <Save size={16} />
              {loading ? "Sauvegarde..." : "Sauvegarder"}
              {isDirty && !loading && (
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-zinc-950 bg-amber-400" aria-hidden="true" />
              )}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">
        {/* ───────── Panneau de configuration ───────── */}
        <div className="space-y-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
          <div role="group" aria-label="Catégories de réglages" className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 p-1">
            {([
              { id: "apparence", label: "Apparence", icon: Palette },
              { id: "elements", label: "Éléments", icon: Layout },
              { id: "animation", label: "Animation", icon: Zap },
              { id: "comportement", label: "Comportement", icon: Sliders },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-pressed={tab === id}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 ${
                  tab === id
                    ? "bg-white/[0.08] text-white"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {tab === "apparence" && (
            <div className="space-y-10 animate-in fade-in duration-300">
              <div className="space-y-4">
                <SectionLabel icon={<Sparkles size={14} />}>Presets rapides</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {designPresets.map((preset) => {
                    const isActive = Object.entries(preset.config).every(([key, value]) => values[key] === value);
                    return (
                      <button
                        key={preset.id}
                        onClick={() => applyPreset(preset.config)}
                        title={preset.desc}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? "border-violet-500/60 bg-violet-500/15 text-violet-200"
                            : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <SectionLabel icon={<Layout size={14} />}>Structure</SectionLabel>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: "default", label: "Horizontal", desc: "Slim, pochette à gauche" },
                    { id: "minimal", label: "Vertical", desc: "Compact, pochette au-dessus" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setLayout(opt.id)}
                      aria-pressed={layout === opt.id}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 ${
                        layout === opt.id
                          ? "border-violet-500/60 bg-violet-500/10"
                          : "border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className={`text-sm font-semibold ${layout === opt.id ? "text-violet-300" : "text-zinc-200"}`}>{opt.label}</span>
                      <span className="text-xs text-zinc-400">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <SectionLabel icon={<Type size={14} />}>Typographie</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {(["all", "sans", "display", "mono", "serif", "script"] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFontCategory(cat)}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                        fontCategory === cat
                          ? "border-violet-500/60 bg-violet-500/15 text-violet-200"
                          : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {FONT_CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                  {ALL_FONTS.filter((f) => fontCategory === "all" || f.category === fontCategory).map((f) => {
                    const r = resolveFont(f.id);
                    const selected = fontFamily === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setFontFamily(f.id)}
                        aria-pressed={selected}
                        className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 ${
                          selected
                            ? "border-violet-500/60 bg-violet-500/10"
                            : "border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
                        }`}
                      >
                        <span
                          className={`w-full truncate text-lg font-black uppercase italic leading-tight ${r.className} ${selected ? "text-violet-300" : "text-zinc-200"}`}
                          style={r.fontFamily ? { fontFamily: r.fontFamily } : undefined}
                        >
                          Blinding Lights
                        </span>
                        <span className="flex w-full items-center justify-between text-xs text-zinc-400">
                          <span>{f.label}</span>
                          <span className="text-zinc-500">{f.family ? "Google" : "Système"}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-zinc-400">
                  {ALL_FONTS.length} polices. Les polices Google sont chargées par OBS à l'affichage du widget (connexion internet requise).
                </p>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 p-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-200">Couleur d'accent</p>
                  <p className="mt-1 text-xs text-zinc-400">Barre de progression, néon, égaliseur</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-zinc-300">{accentColor}</span>
                  <input
                    type="color"
                    aria-label="Couleur d'accent"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-10 rounded-xl border-2 border-zinc-700 bg-transparent p-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-8">
                <SliderRow label="Puissance du flou" value={blurAmount} onChange={setBlurAmount} suffix="px" max={40} />
                <SliderRow label="Transparence fond" value={bgOpacity} onChange={setBgOpacity} suffix="%" max={100} />
                <SliderRow label="Rayon de courbure" value={borderRadius} onChange={setBorderRadius} suffix="px" max={40} />
              </div>
            </div>
          )}

          {tab === "elements" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <SectionLabel icon={<Eye size={14} />}>Éléments affichés</SectionLabel>
              <div className="grid grid-cols-2 gap-4">
                <ToggleButton active={showCover} onClick={() => setShowCover(!showCover)} icon={<ImageIcon size={16} />} label="Pochette" />
                <ToggleButton active={showArtist} onClick={() => setShowArtist(!showArtist)} icon={<Music size={16} />} label="Artiste" />
                <ToggleButton active={showProgress} onClick={() => setShowProgress(!showProgress)} icon={<Zap size={16} />} label="Progression" tone="emerald" />
                <ToggleButton active={showTimestamp} onClick={() => setShowTimestamp(!showTimestamp)} icon={<Clock size={16} />} label="Horodatage" tone="amber" />
                <ToggleButton active={showEqualizer} onClick={() => setShowEqualizer(!showEqualizer)} icon={<BarChart3 size={16} />} label="Égaliseur" tone="cyan" />
                <ToggleButton active={isRotating} onClick={() => setIsRotating(!isRotating)} icon={<RotateCw size={16} />} label="Rotation CD" />
                <ToggleButton active={enableGlow} onClick={() => setEnableGlow(!enableGlow)} icon={<Sparkles size={16} />} label="Effet néon" tone="amber" />
                <ToggleButton active={enableBlurBg} onClick={() => setEnableBlurBg(!enableBlurBg)} icon={<Palette size={16} />} label="Flou fond" tone="cyan" />
              </div>
            </div>
          )}

          {tab === "animation" && (
            <div className="space-y-10 animate-in fade-in duration-300">
              <div className="space-y-4">
                <SectionLabel icon={<Zap size={14} />}>Style d'entrée et de sortie</SectionLabel>
                <div className="grid grid-cols-2 gap-4">
                  {ANIMATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setAnimationStyle(opt.id); playEntry(); }}
                      aria-pressed={animationStyle === opt.id}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 ${
                        animationStyle === opt.id
                          ? "border-violet-500/60 bg-violet-500/10"
                          : "border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className={`text-sm font-semibold ${animationStyle === opt.id ? "text-violet-300" : "text-zinc-200"}`}>{opt.label}</span>
                      <span className="text-xs text-zinc-400">{opt.desc}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-400">La sortie reprend le style choisi, en sens inverse.</p>
              </div>

              <div className="space-y-4">
                <SectionLabel icon={<Timer size={14} />}>Vitesse</SectionLabel>
                <div role="group" aria-label="Vitesse de l'animation" className="flex items-center gap-1 rounded-xl border border-white/10 p-1">
                  {SPEED_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setAnimationSpeed(opt.id)}
                      aria-pressed={animationSpeed === opt.id}
                      className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 ${
                        animationSpeed === opt.id
                          ? "bg-white/[0.08] text-white"
                          : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <ToggleButton
                  active={trackChangeAnimation}
                  onClick={() => setTrackChangeAnimation(!trackChangeAnimation)}
                  icon={<RefreshCw size={16} />}
                  label="Anim. changement"
                  tone="cyan"
                />
                <ToggleButton
                  active={glowPulse}
                  onClick={() => setGlowPulse(!glowPulse)}
                  icon={<Activity size={16} />}
                  label="Néon pulsant"
                  tone="amber"
                />
              </div>
              <p className="-mt-6 text-xs text-zinc-400">
                « Anim. changement » adoucit le titre et la pochette à chaque nouveau morceau. « Néon pulsant » demande l'effet néon.
              </p>
            </div>
          )}

          {tab === "comportement" && (
            <div className="space-y-10 animate-in fade-in duration-300">
              <div className="space-y-4">
                <SectionLabel icon={<Timer size={14} />}>Masquage automatique</SectionLabel>
                <ToggleButton active={autoHide} onClick={() => setAutoHide(!autoHide)} icon={<Timer size={16} />} label="Masquage auto" tone="emerald" />
                <p className="text-xs text-zinc-400">
                  Le widget ne s'affiche que quelques secondes à chaque nouveau morceau, puis se retire avec l'animation de sortie.
                </p>
                {autoHide && (
                  <SliderRow label="Durée d'affichage par morceau" value={autoHideSeconds} onChange={setAutoHideSeconds} suffix="s" max={60} />
                )}
              </div>

              <div className="space-y-4 border-t border-white/5 pt-6">
                <SectionLabel icon={<Play size={14} />}>Tester sans être en live</SectionLabel>
                <p className="-mt-2 text-sm text-zinc-400">
                  Le mode test ajoute <span className="font-mono text-zinc-300">?test=1</span> à l'URL du widget : il joue de fausses données
                  en boucle (titre très long, changements de morceau, pauses) avec tes réglages enregistrés. Pense à sauvegarder avant.
                </p>
                {widgetToken && (
                  <a
                    href={`/widget/${widgetToken}?test=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-violet-500/50 hover:text-white"
                  >
                    <Eye size={14} /> Ouvrir le widget en mode test
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ───────── Aperçu ───────── */}
        <div className="relative flex flex-col border border-white/10 rounded-2xl bg-zinc-950/80 min-h-[500px] sticky top-28 overflow-hidden">

          <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 px-6 pt-6">
            <p className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Aperçu OBS, animation {animationLabel}
            </p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={playEntry}
                className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition-colors hover:text-violet-300"
              >
                <Play size={12} /> Entrée
              </button>
              <button
                type="button"
                onClick={playExit}
                className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition-colors hover:text-violet-300"
              >
                <EyeOff size={12} /> Sortie
              </button>
              {widgetToken && (
                <a
                  href={`/widget/${widgetToken}?test=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ouvre le vrai widget avec des données factices (enregistre d'abord ta configuration)"
                  className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition-colors hover:text-emerald-300"
                >
                  <Eye size={12} /> Vrai widget
                </a>
              )}
            </div>
          </div>

          <style>{`
            ${WIDGET_ENTRY_KEYFRAMES}
            @keyframes glow-pulse { 0%, 100% { box-shadow: var(--glow-lo); } 50% { box-shadow: var(--glow-hi); } }
            @keyframes eq-bounce { 0%, 100% { transform: scaleY(0.25); } 50% { transform: scaleY(1); } }
            .eq-bar { display: inline-block; width: 3px; height: 100%; border-radius: 2px; transform-origin: bottom; animation: eq-bounce 0.9s ease-in-out infinite; }
          `}</style>

          <div className="relative z-10 flex-1 flex items-center justify-center p-8">
            <div key={replayKey} className="relative">
              {isRevealDefault && showCover && (
                <div
                  className="absolute z-30"
                  style={{
                    left: -16,
                    top: -6,
                    animation: previewExiting ? revealCoverExitAnimation(speedK) : revealCoverAnimation(speedK),
                    "--wa-reveal-dx": "150px",
                  } as CSSProperties}
                >
                  <img
                    src={previewCoverSrc}
                    className="w-28 h-28 object-cover shadow-[0_15px_35px_rgba(0,0,0,0.6)] border-2 border-white/10"
                    style={{
                      borderRadius: isRotating ? "999px" : `${Math.max(8, parseInt(borderRadius))}px`,
                      animation: isRotating ? "spin-slow 12s linear infinite" : "none",
                    }}
                    alt="Album Cover"
                  />
                </div>
              )}
              <div
                className={`relative flex items-center transition-all duration-1000 ${resolvedFont.className}
                  ${layout === "minimal" ? "flex-col w-[232px] px-5 pb-5 text-center mt-14" : "flex-row w-[380px] h-[100px] p-4"}
                `}
                style={{
                  fontFamily: resolvedFont.fontFamily,
                  ...(layout === "minimal" && { paddingTop: showCover ? 62 : 20 }),
                  backgroundColor: `rgba(15, 17, 23, ${parseInt(bgOpacity) / 100})`,
                  borderRadius: `${borderRadius}px`,
                  boxShadow: enableGlow ? `0 20px 50px -10px ${accentColor}55` : "none",
                  border: "1px solid rgba(255,255,255,0.08)",
                  animation: cardAnimation,
                  ...(enableGlow && glowPulse && ({
                    "--glow-lo": `0 20px 50px -10px ${accentColor}33`,
                    "--glow-hi": `0 20px 60px -6px ${accentColor}88`,
                  } as CSSProperties)),
                }}
              >
                {enableBlurBg && (
                  <div className="absolute inset-0 z-0 overflow-hidden" style={{ borderRadius: `${borderRadius}px` }}>
                    <div
                      className="absolute inset-0 transition-all duration-[2000ms]"
                      style={{
                        backgroundImage: `url(${previewCoverSrc})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: `blur(${blurAmount}px) brightness(0.35)`,
                        transform: "scale(1.2)",
                      }}
                    />
                  </div>
                )}

                {showCover && isRevealDefault && <div className="w-28 h-28 shrink-0 mr-5 -ml-8" aria-hidden="true" />}
                {showCover && !isRevealDefault && (
                  <div
                    className={layout === "minimal" ? "absolute -top-12 left-1/2 z-30 -translate-x-1/2" : "relative z-30 shrink-0 mr-5 -ml-8 transition-transform duration-500"}
                  >
                    <img
                      src={previewCoverSrc}
                      className={`${layout === "minimal" ? "w-24 h-24" : "w-28 h-28"} object-cover shadow-[0_15px_35px_rgba(0,0,0,0.6)] border-2 border-white/10`}
                      style={{
                        borderRadius: isRotating ? "999px" : `${Math.max(8, parseInt(borderRadius))}px`,
                        animation: isRotating ? "spin-slow 12s linear infinite" : "none",
                      }}
                      alt="Album Cover"
                    />
                  </div>
                )}

                <div className={`relative z-10 flex-1 min-w-0 flex flex-col justify-center ${layout === "minimal" ? "w-full" : ""}`}>
                  {showArtist && (
                    <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.25em] mb-0.5 truncate italic">
                      {previewReady ? currentTrack?.artist || "FOX STEVENSON" : <span className="twichify-skeleton inline-block h-2.5 w-24 rounded align-middle" />}
                    </p>
                  )}
                  <h2 className="text-base font-black text-white truncate leading-tight uppercase italic tracking-tighter">
                    {previewReady ? currentTrack?.title || "Don't Care Crown" : <span className="twichify-skeleton inline-block h-4 w-40 rounded align-middle" />}
                  </h2>

                  {showProgress && (
                    <div className="mt-2.5 space-y-1.5">
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden backdrop-blur-sm">
                        <div
                          className="h-full transition-all duration-1000 ease-out"
                          style={{
                            backgroundColor: accentColor,
                            width: "60%",
                            boxShadow: `0 0 12px ${accentColor}`,
                          }}
                        />
                      </div>
                      {(showTimestamp || showEqualizer) && (
                        <div className="grid grid-cols-3 items-center text-[8px] font-black text-white/40 font-mono italic tracking-tight">
                          {showTimestamp ? <span className="justify-self-start bg-black/40 px-1.5 py-0.5 rounded">01:42</span> : <span />}
                          <span className="justify-self-center">
                            {showEqualizer && (
                              <span className="inline-flex h-3 items-end gap-[2px]">
                                {[0, 1, 2, 3].map((i) => (
                                  <span key={i} className="eq-bar" style={{ backgroundColor: accentColor, animationDelay: `${i * 0.13}s`, animationDuration: `${0.7 + i * 0.11}s` }} />
                                ))}
                              </span>
                            )}
                          </span>
                          {showTimestamp ? <span className="justify-self-end bg-black/40 px-1.5 py-0.5 rounded">03:15</span> : <span />}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <p className="relative z-20 pb-4 text-center text-xs text-zinc-500">
            Zone OBS de 475 × 125 pixels
          </p>
        </div>
      </div>

      <ToastDisplay toast={toast} />
    </div>
  );
}
