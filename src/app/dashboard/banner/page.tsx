"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Play, Undo2, Eye, Ban, Upload, Sparkles } from "lucide-react";
import { PageHeader, DashboardLoading, DashboardLoadError } from "@/components/dashboard/DashboardUI";
import { useToast, ToastDisplay } from "@/components/dashboard/useToast";
import { useWidgetToken } from "@/components/dashboard/useWidgetToken";
import { ACTION_BTN, MaskedField, StatusPill } from "@/components/dashboard/WidgetUI";
import InfoBannerView, { MessageIcon } from "@/components/widget/InfoBannerView";
import FontPicker from "@/components/dashboard/FontPicker";
import UnsavedChangesBar, { useUnsavedChangesGuard } from "@/components/dashboard/UnsavedChangesBar";
import { BRAND_ICONS } from "@/lib/info-banner-icons";
import {
  DEFAULT_INFO_BANNER,
  INFO_BANNER_ACCENTS,
  INFO_BANNER_ALIGNS,
  INFO_BANNER_ANIMATIONS,
  INFO_BANNER_LIMITS,
  INFO_BANNER_LOGO_MAX_CHARS,
  INFO_BANNER_LOGO_POSITIONS,
  INFO_BANNER_LOGO_STYLES,
  INFO_BANNER_MAX_CUSTOM_LOGOS,
  INFO_BANNER_MAX_LENGTH,
  INFO_BANNER_MAX_MESSAGES,
  INFO_BANNER_PRESETS,
  INFO_BANNER_SHADOWS,
  INFO_BANNER_SPEEDS,
  INFO_BANNER_WEIGHTS,
  brandMessageStyle,
  newInfoBannerMessage,
  recommendedSourceSize,
  type InfoBannerCustomLogo,
  type InfoBannerMessage,
  type InfoBannerSettings,
} from "@/lib/info-banner";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";
const INPUT =
  "w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 text-base text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60";
const ICON_BTN = `flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 ${FOCUS}`;

const ANIMATION_LABELS: Record<string, string> = { fade: "Fondu", slide: "Glissement", pop: "Pop", expand: "Expansion" };
const SPEED_LABELS: Record<string, string> = { slow: "Lente", normal: "Normale", fast: "Rapide" };
const ALIGN_LABELS: Record<string, string> = { left: "Gauche", center: "Centré", right: "Droite" };
const ACCENT_LABELS: Record<string, string> = { none: "Aucun", left: "Barre à gauche", bottom: "Barre en bas", outline: "Contour" };
const WEIGHT_LABELS: Record<string, string> = { normal: "Normal", bold: "Gras", black: "Très gras" };
const SHADOW_LABELS: Record<string, string> = { none: "Aucune", soft: "Douce", glow: "Lueur" };
const LOGO_POSITION_LABELS: Record<string, string> = { left: "À gauche", right: "À droite" };
const LOGO_STYLE_LABELS: Record<string, string> = { plain: "Logo seul", chip: "Pastille ronde" };

// Fonds d'aperçu : la même bannière se lit très différemment sur une scène sombre, claire ou colorée.
const PREVIEW_BACKGROUNDS: { id: string; label: string; style: CSSProperties }[] = [
  {
    id: "dark",
    label: "Sombre",
    style: {
      backgroundColor: "#0b0c10",
      backgroundImage:
        "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
      backgroundSize: "28px 28px",
    },
  },
  { id: "light", label: "Clair", style: { backgroundColor: "#d4d4d8" } },
  { id: "game", label: "Jeu", style: { backgroundImage: "linear-gradient(135deg, #1e3a8a 0%, #7c3aed 55%, #db2777 100%)" } },
];

const TABS = [
  { id: "messages", label: "Messages" },
  { id: "apparence", label: "Apparence" },
  { id: "animation", label: "Animation" },
  { id: "obs", label: "Ajouter à OBS" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const hasOwnStyle = (m: InfoBannerMessage) =>
  m.textColor !== null || m.backgroundColor !== null || m.backgroundOpacity !== null || m.accentColor !== null;

const randomId = () => (Math.random().toString(36).slice(2) + "00000000").slice(0, 8);

// Clés d'affichage des messages : elles suivent chaque message quand on le déplace ou qu'on en supprime un autre
// (sinon l'état d'un bloc ouvert, comme « Design de ce message », resterait à sa position au lieu de suivre le message).
// Elles ne sont jamais enregistrées. Compteur hors du composant : la fonction reste stable pour les useCallback.
let messageKeySeq = 0;
const newMessageKey = () => `m${messageKeySeq++}`;

// Réduit une image (PNG, JPEG, WebP, SVG…) à 128 px au plus, dans le navigateur : seul le résultat (quelques Ko) est envoyé.
// On essaie plusieurs tailles et formats jusqu'à tenir dans la limite acceptée par le serveur.
async function fileToLogoDataUri(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("image illisible"));
      image.src = url;
    });
    const naturalWidth = img.naturalWidth || 128;
    const naturalHeight = img.naturalHeight || 128;

    for (const size of [128, 96, 64]) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas indisponible");

      const scale = Math.min(size / naturalWidth, size / naturalHeight);
      const width = naturalWidth * scale;
      const height = naturalHeight * scale;
      ctx.drawImage(img, (size - width) / 2, (size - height) / 2, width, height);

      for (const [type, quality] of [
        ["image/webp", 0.85],
        ["image/png", undefined],
      ] as const) {
        const dataUri = canvas.toDataURL(type, quality);
        // Un navigateur sans WebP renvoie du PNG : on vérifie que le format demandé est bien celui obtenu.
        if (dataUri.startsWith(`data:${type}`) && dataUri.length <= INFO_BANNER_LOGO_MAX_CHARS) return dataUri;
      }
    }
    throw new Error("image trop lourde");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-zinc-400">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  unit = "",
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={`space-y-2 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-medium text-zinc-200">{label}</label>
        <span className="text-sm tabular-nums text-zinc-400">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="twichify-slider w-full cursor-pointer disabled:cursor-not-allowed"
        style={{ background: `linear-gradient(to right, #9333ea ${pct}%, rgba(255,255,255,0.12) ${pct}%)` }}
      />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-200">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          aria-label={label}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
        />
        <code className="font-mono text-sm text-zinc-400">{value}</code>
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  labels: Record<string, string>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-zinc-200">{label}</p>
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              aria-pressed={active}
              className={`cursor-pointer rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${FOCUS} ${
                active
                  ? "border-purple-500/50 bg-purple-500/15 text-purple-200"
                  : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {labels[option] ?? option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer accent-purple-500"
      />
      {children}
    </label>
  );
}

// Onglets accessibles : rôles tab/tablist, navigation aux flèches, un seul onglet dans l'ordre de tabulation.
function TabBar({ value, onChange }: { value: TabId; onChange: (id: TabId) => void }) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((t) => t.id === value);
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    onChange(TABS[next].id);
    document.getElementById(`banner-tab-${TABS[next].id}`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Réglages du bandeau"
      onKeyDown={onKeyDown}
      className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] p-1"
    >
      {TABS.map((tab) => {
        const selected = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`banner-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`banner-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`shrink-0 cursor-pointer rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${FOCUS} ${
              selected ? "bg-purple-600 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// Aperçu à l'échelle : le bandeau est dessiné à sa vraie taille dans une « source OBS » virtuelle, puis réduit pour
// tenir dans la page. Un bandeau de 1920 px de large garde ainsi les mêmes proportions qu'à l'écran du stream.
function PreviewStage({
  settings,
  messages,
  background,
}: {
  settings: InfoBannerSettings;
  messages: InfoBannerMessage[];
  background: CSSProperties;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [outerWidth, setOuterWidth] = useState(0);
  const [innerHeight, setInnerHeight] = useState(0);

  const virtualWidth = recommendedSourceSize(settings).width;
  const scale = outerWidth > 0 ? Math.min(1, outerWidth / virtualWidth) : 1;

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setOuterWidth(outer.clientWidth);
      setInnerHeight(inner.offsetHeight);
    });
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="relative w-full overflow-hidden" style={{ ...background, height: Math.max(150, innerHeight * scale + 32) }}>
      <div
        ref={innerRef}
        style={{
          position: "absolute",
          top: 16,
          left: Math.max(0, (outerWidth - virtualWidth * scale) / 2),
          width: virtualWidth,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <InfoBannerView settings={settings} messages={messages} emptyHint="Ajoute un message pour voir l'aperçu." />
      </div>
    </div>
  );
}

// Choix du logo d'un message : aucun, une plateforme, ou un logo personnalisé.
function IconPicker({
  value,
  logos,
  onChange,
}: {
  value: string;
  logos: InfoBannerCustomLogo[];
  onChange: (icon: string) => void;
}) {
  const buttonClass = (active: boolean) =>
    `flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border transition-colors ${FOCUS} ${
      active ? "border-purple-400 bg-purple-500/20" : "border-white/10 hover:border-white/25"
    }`;

  return (
    <div role="group" aria-label="Logo du message" className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("")}
        aria-pressed={value === ""}
        aria-label="Aucun logo"
        title="Aucun logo"
        className={`${buttonClass(value === "")} text-zinc-300`}
      >
        <Ban size={16} />
      </button>

      {BRAND_ICONS.map((brand) => (
        <button
          key={brand.id}
          type="button"
          onClick={() => onChange(brand.id)}
          aria-pressed={value === brand.id}
          aria-label={brand.label}
          title={brand.label}
          className={buttonClass(value === brand.id)}
          // Les marques noires (TikTok, X, Patreon, Steam) seraient invisibles sur fond sombre : gris clair.
          style={{ color: brand.color === "#000000" ? "#d4d4d8" : brand.color }}
        >
          <MessageIcon icon={brand.id} logos={logos} size={20} />
        </button>
      ))}

      {logos.map((logo) => (
        <button
          key={logo.id}
          type="button"
          onClick={() => onChange(`custom:${logo.id}`)}
          aria-pressed={value === `custom:${logo.id}`}
          aria-label={`Logo personnalisé : ${logo.name}`}
          title={logo.name}
          className={buttonClass(value === `custom:${logo.id}`)}
        >
          <MessageIcon icon={`custom:${logo.id}`} logos={logos} size={26} />
        </button>
      ))}
    </div>
  );
}

export default function DashboardBanner() {
  const { data: session } = useSession();
  const { toast, showToast } = useToast();
  const { token: widgetToken } = useWidgetToken(!!session);
  const fileRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<InfoBannerSettings>(DEFAULT_INFO_BANNER);
  // Dernier état enregistré (sérialisé) : sert à détecter les modifications et à les annuler.
  const [saved, setSaved] = useState(JSON.stringify(DEFAULT_INFO_BANNER));
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabId>("messages");
  const [backgroundId, setBackgroundId] = useState("dark");
  // Message affiché seul dans l'aperçu (pour voir son design) ; null = tous les messages en rotation.
  const [focus, setFocus] = useState<number | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  // Une clé par message (même ordre que `settings.messages`).
  const [messageKeys, setMessageKeys] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoadState("loading");
    try {
      const res = await fetch("/api/user/banner-widget-setup", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setSettings(data.settings);
      setMessageKeys(data.settings.messages.map(newMessageKey));
      setSaved(JSON.stringify(data.settings));
      setLoadState("ready");
    } catch (e) {
      console.error("Erreur de chargement du bandeau", e);
      setLoadState("error");
    }
  }, []);

  // Booléen (et non l'objet `session`, recréé à chaque retour sur l'onglet) : sinon les réglages seraient rechargés,
  // et les modifications non enregistrées écrasées, chaque fois qu'on revient sur la page.
  const signedIn = !!session;
  useEffect(() => {
    if (signedIn) load();
  }, [signedIn, load]);

  const isDirty = JSON.stringify(settings) !== saved;

  // Avertit avant de quitter l'onglet ou la page avec des modifications non enregistrées.
  useUnsavedChangesGuard(isDirty);

  const update = <K extends keyof InfoBannerSettings>(key: K, value: InfoBannerSettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const updateMessage = (i: number, patch: Partial<InfoBannerMessage>) =>
    setSettings((s) => ({ ...s, messages: s.messages.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) }));

  // Choisir une plateforme applique aussi ses couleurs (fond de marque, texte lisible) ; les autres choix ne touchent pas aux couleurs.
  const selectIcon = (i: number, icon: string) => updateMessage(i, brandMessageStyle(icon) ?? { icon });

  const resetMessageStyle = (i: number) =>
    updateMessage(i, { textColor: null, backgroundColor: null, backgroundOpacity: null, accentColor: null });

  const addMessage = () => {
    if (settings.messages.length >= INFO_BANNER_MAX_MESSAGES) return;
    setSettings((s) => ({ ...s, messages: [...s.messages, newInfoBannerMessage()] }));
    setMessageKeys((k) => [...k, newMessageKey()]);
  };

  const removeMessage = (i: number) => {
    setSettings((s) => ({ ...s, messages: s.messages.filter((_, idx) => idx !== i) }));
    setMessageKeys((k) => k.filter((_, idx) => idx !== i));
    setFocus(null);
  };

  const moveMessage = (i: number, direction: -1 | 1) => {
    const j = i + direction;
    if (j < 0 || j >= settings.messages.length) return;
    const swap = <T,>(list: T[]): T[] => {
      const copy = [...list];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    };
    setSettings((s) => ({ ...s, messages: swap(s.messages) }));
    setMessageKeys((k) => swap(k));
    setFocus(null);
  };

  const removeLogo = (id: string) =>
    setSettings((s) => ({
      ...s,
      customLogos: s.customLogos.filter((l) => l.id !== id),
      messages: s.messages.map((m) => (m.icon === `custom:${id}` ? { ...m, icon: "" } : m)),
    }));

  const onLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de choisir deux fois le même fichier
    if (!file) return;

    if (settings.customLogos.length >= INFO_BANNER_MAX_CUSTOM_LOGOS) {
      showToast(`Tu peux ajouter ${INFO_BANNER_MAX_CUSTOM_LOGOS} logos au maximum.`, "error");
      return;
    }
    if (!file.type.startsWith("image/")) {
      showToast("Ce fichier n'est pas une image.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Cette image est trop lourde (5 Mo au maximum).", "error");
      return;
    }

    try {
      const dataUri = await fileToLogoDataUri(file);
      const logo: InfoBannerCustomLogo = {
        id: randomId(),
        name: file.name.replace(/\.[^.]+$/, "").slice(0, 24) || "Logo",
        dataUri,
      };
      setSettings((s) => ({ ...s, customLogos: [...s.customLogos, logo] }));
    } catch (error) {
      console.error("Erreur de lecture du logo", error);
      showToast("Impossible d'utiliser cette image. Essaie un PNG ou un JPEG plus simple.", "error");
    }
  };

  const applyPreset = (values: Partial<InfoBannerSettings>) => setSettings((s) => ({ ...s, ...values }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/banner-widget-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      // Le serveur renvoie la version nettoyée (messages vides retirés, valeurs bornées) : c'est celle qui est affichée.
      setSettings(data.settings);
      setMessageKeys(data.settings.messages.map(newMessageKey));
      setSaved(JSON.stringify(data.settings));
      setFocus(null);
      showToast("Bandeau enregistré.");
    } catch (e) {
      console.error("Erreur de sauvegarde du bandeau", e);
      showToast("Erreur lors de la sauvegarde.", "error");
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    const restored: InfoBannerSettings = JSON.parse(saved);
    setSettings(restored);
    setMessageKeys(restored.messages.map(newMessageKey));
    setFocus(null);
  };

  if (!session) return null;
  if (loadState === "loading") return <DashboardLoading eyebrow="Widgets" title="Bandeau d'informations" />;
  if (loadState === "error") return <DashboardLoadError eyebrow="Widgets" title="Bandeau d'informations" onRetry={load} />;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const widgetUrl = widgetToken ? `${origin}/widget/banner/${widgetToken}` : "";
  const filledMessages = settings.messages.filter((m) => m.text.trim());
  const focused = focus !== null ? settings.messages[focus] : undefined;
  const previewMessages = focused && focused.text.trim() ? [focused] : filledMessages;
  const source = recommendedSourceSize(settings);
  const background = PREVIEW_BACKGROUNDS.find((b) => b.id === backgroundId) ?? PREVIEW_BACKGROUNDS[0];
  const L = INFO_BANNER_LIMITS;

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        eyebrow="Widgets"
        title="Bandeau d'informations"
        action={isDirty ? <StatusPill tone="warn">Modifications non enregistrées</StatusPill> : undefined}
      />

      {/* Aperçu épinglé : il reste visible pendant qu'on règle les options, et il utilise le même composant que le widget OBS. */}
      <section
        aria-label="Aperçu du bandeau"
        className="z-20 overflow-hidden rounded-2xl border border-white/10 bg-[#08090b] shadow-xl shadow-black/40 lg:sticky lg:top-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-white">Aperçu</h2>
            <span className="text-xs text-zinc-400">
              Source OBS conseillée : {source.width} × {source.height} px
            </span>
          </div>
          <div role="group" aria-label="Fond de l'aperçu" className="flex gap-1">
            {PREVIEW_BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBackgroundId(b.id)}
                aria-pressed={backgroundId === b.id}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${FOCUS} ${
                  backgroundId === b.id ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <PreviewStage settings={settings} messages={previewMessages} background={background.style} />

        {focused && focused.text.trim() && (
          <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-zinc-400">
            <span>Aperçu du message {focus! + 1} seulement.</span>
            <button type="button" onClick={() => setFocus(null)} className={`rounded px-2 py-1 text-purple-300 hover:underline ${FOCUS}`}>
              Voir tous les messages
            </button>
          </div>
        )}
      </section>

      <TabBar value={tab} onChange={setTab} />

      {/* ───────── Messages ───────── */}
      {tab === "messages" && (
        <div role="tabpanel" id="banner-panel-messages" aria-labelledby="banner-tab-messages" className="space-y-6">
          <Section
            title="Messages"
            description={`${filledMessages.length} sur ${INFO_BANNER_MAX_MESSAGES} messages. Choisis un logo de plateforme : le message prend les couleurs de la marque (bleu pour Discord, rouge pour YouTube…), que tu peux ajuster dans « Design de ce message ». Le bandeau n'affiche que du texte : les liens ne sont pas cliquables dans un stream.`}
          >
            <ul className="space-y-4">
              {settings.messages.map((message, i) => (
                <li
                  key={messageKeys[i] ?? i}
                  className={`space-y-4 rounded-xl border p-4 ${
                    focus === i ? "border-purple-500/50 bg-purple-500/[0.04]" : "border-white/10 bg-black/20"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <input
                        type="text"
                        value={message.text}
                        maxLength={INFO_BANNER_MAX_LENGTH}
                        onChange={(e) => updateMessage(i, { text: e.target.value })}
                        aria-label={`Texte du message ${i + 1}`}
                        placeholder="Ex : Rejoins la communauté sur Discord"
                        className={INPUT}
                      />
                    </div>
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => setFocus(focus === i ? null : i)}
                        aria-pressed={focus === i}
                        aria-label={`Voir le message ${i + 1} seul dans l'aperçu`}
                        title="Voir ce message seul dans l'aperçu"
                        className={`${ICON_BTN} ${focus === i ? "text-purple-300" : ""}`}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMessage(i, -1)}
                        disabled={i === 0}
                        aria-label={`Monter le message ${i + 1}`}
                        className={ICON_BTN}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMessage(i, 1)}
                        disabled={i === settings.messages.length - 1}
                        aria-label={`Descendre le message ${i + 1}`}
                        className={ICON_BTN}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMessage(i)}
                        aria-label={`Supprimer le message ${i + 1}`}
                        className={`${ICON_BTN} text-red-300 hover:text-red-200`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-zinc-200">Logo</p>
                    <IconPicker value={message.icon} logos={settings.customLogos} onChange={(icon) => selectIcon(i, icon)} />
                  </div>

                  <details className="rounded-lg border border-white/10">
                    <summary
                      className={`flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium text-zinc-200 [&::-webkit-details-marker]:hidden ${FOCUS}`}
                    >
                      <span>Design de ce message</span>
                      <span className="text-xs font-normal text-zinc-400">
                        {hasOwnStyle(message) ? "Personnalisé" : "Comme le bandeau"}
                      </span>
                    </summary>
                    <div className="space-y-5 border-t border-white/10 p-4">
                      <div className="grid gap-5 sm:grid-cols-3">
                        <ColorField
                          label="Fond"
                          value={message.backgroundColor ?? settings.backgroundColor}
                          onChange={(v) => updateMessage(i, { backgroundColor: v })}
                        />
                        <ColorField
                          label="Texte et logo"
                          value={message.textColor ?? settings.textColor}
                          onChange={(v) => updateMessage(i, { textColor: v })}
                        />
                        <ColorField
                          label="Accent"
                          value={message.accentColor ?? settings.accentColor}
                          onChange={(v) => updateMessage(i, { accentColor: v })}
                        />
                      </div>
                      <RangeField
                        label="Opacité du fond"
                        value={message.backgroundOpacity ?? settings.backgroundOpacity}
                        min={0}
                        max={100}
                        unit=" %"
                        onChange={(v) => updateMessage(i, { backgroundOpacity: v })}
                      />
                      <button
                        type="button"
                        onClick={() => resetMessageStyle(i)}
                        disabled={!hasOwnStyle(message)}
                        className={`${ACTION_BTN} disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <Undo2 size={14} />
                        Revenir au design du bandeau
                      </button>
                    </div>
                  </details>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={addMessage}
              disabled={settings.messages.length >= INFO_BANNER_MAX_MESSAGES}
              className={`${ACTION_BTN} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Plus size={15} />
              Ajouter un message
            </button>
          </Section>

          <Section
            title="Logos personnalisés"
            description={`Ajoute jusqu'à ${INFO_BANNER_MAX_CUSTOM_LOGOS} images (PNG, JPEG, WebP ou SVG) : le logo de ta chaîne, d'un partenaire… Elles sont réduites dans ton navigateur avant l'enregistrement, puis proposées dans la liste des logos de chaque message.`}
          >
            {settings.customLogos.length > 0 && (
              <ul className="flex flex-wrap gap-3">
                {settings.customLogos.map((logo) => (
                  <li key={logo.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 py-2 pl-2 pr-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logo.dataUri} alt="" className="h-10 w-10 rounded object-contain" />
                    <span className="max-w-[9rem] truncate text-sm text-zinc-200">{logo.name}</span>
                    <button
                      type="button"
                      onClick={() => removeLogo(logo.id)}
                      aria-label={`Supprimer le logo ${logo.name}`}
                      className={`${ICON_BTN} text-red-300 hover:text-red-200`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <input ref={fileRef} type="file" accept="image/*" onChange={onLogoFile} className="hidden" aria-label="Choisir une image" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={settings.customLogos.length >= INFO_BANNER_MAX_CUSTOM_LOGOS}
              className={`${ACTION_BTN} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Upload size={15} />
              Ajouter un logo
            </button>

            <p className="text-sm leading-relaxed text-zinc-400">
              Les logos de plateformes (Discord, YouTube, TikTok…) appartiennent à leurs propriétaires : ils servent ici
              à renvoyer vers ta chaîne sur ces plateformes.
            </p>
          </Section>
        </div>
      )}

      {/* ───────── Apparence ───────── */}
      {tab === "apparence" && (
        <div role="tabpanel" id="banner-panel-apparence" aria-labelledby="banner-tab-apparence" className="space-y-6">
          <Section
            title="Styles rapides"
            description="Un point de départ : il change l'apparence (taille, couleurs, forme) sans toucher à tes messages ni à ton animation."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {INFO_BANNER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.values)}
                  className={`flex cursor-pointer flex-col items-start rounded-xl border border-white/10 p-4 text-left transition-colors hover:border-purple-500/40 hover:bg-white/[0.03] ${FOCUS}`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                    <Sparkles size={14} className="text-purple-300" aria-hidden="true" />
                    {preset.label}
                  </span>
                  <span className="mt-1 text-sm text-zinc-400">{preset.description}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Taille" description="Le bandeau peut aller d'une petite pastille à une grande bannière sur toute la largeur de la source OBS.">
            <Checkbox checked={settings.fullWidth} onChange={(v) => update("fullWidth", v)}>
              Pleine largeur (le bandeau occupe toute la largeur de la source OBS)
            </Checkbox>
            <div className="grid gap-6 sm:grid-cols-2">
              <RangeField
                label="Largeur du bandeau"
                value={settings.widgetWidth}
                min={L.widgetWidth.min}
                max={L.widgetWidth.max}
                unit=" px"
                disabled={settings.fullWidth}
                onChange={(v) => update("widgetWidth", v)}
              />
              <RangeField label="Taille du texte" value={settings.fontSize} min={L.fontSize.min} max={L.fontSize.max} unit=" px" onChange={(v) => update("fontSize", v)} />
              <RangeField label="Hauteur (marges haut et bas)" value={settings.paddingY} min={L.paddingY.min} max={L.paddingY.max} unit=" px" onChange={(v) => update("paddingY", v)} />
              <RangeField label="Marges gauche et droite" value={settings.paddingX} min={L.paddingX.min} max={L.paddingX.max} unit=" px" onChange={(v) => update("paddingX", v)} />
              <RangeField label="Taille du logo" value={settings.logoScale} min={L.logoScale.min} max={L.logoScale.max} unit=" %" onChange={(v) => update("logoScale", v)} />
              <RangeField label="Arrondi des angles" value={settings.borderRadius} min={L.borderRadius.min} max={L.borderRadius.max} unit=" px" onChange={(v) => update("borderRadius", v)} />
            </div>
            <p className="text-sm text-zinc-400">
              Source navigateur OBS conseillée : {source.width} × {source.height} px. Ajoute de la hauteur si tes messages
              passent sur deux lignes.
            </p>
          </Section>

          <Section title="Texte">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="banner-font" className="text-sm font-medium text-zinc-200">
                  Police
                </label>
                <FontPicker id="banner-font" value={settings.fontFamily} onChange={(v) => update("fontFamily", v)} />
              </div>
              <Segmented label="Graisse" options={INFO_BANNER_WEIGHTS} labels={WEIGHT_LABELS} value={settings.fontWeight} onChange={(v) => update("fontWeight", v)} />
            </div>
            <div className="flex flex-wrap items-start gap-x-10 gap-y-5">
              <Segmented label="Alignement du texte" options={INFO_BANNER_ALIGNS} labels={ALIGN_LABELS} value={settings.align} onChange={(v) => update("align", v)} />
              <Segmented label="Position du logo" options={INFO_BANNER_LOGO_POSITIONS} labels={LOGO_POSITION_LABELS} value={settings.logoPosition} onChange={(v) => update("logoPosition", v)} />
              <Segmented label="Style du logo" options={INFO_BANNER_LOGO_STYLES} labels={LOGO_STYLE_LABELS} value={settings.logoStyle} onChange={(v) => update("logoStyle", v)} />
            </div>
            <Checkbox checked={settings.uppercase} onChange={(v) => update("uppercase", v)}>
              Tout en majuscules
            </Checkbox>
          </Section>

          <Section title="Couleurs" description="Les couleurs par défaut : un message sans design propre les reprend.">
            <div className="grid gap-6 sm:grid-cols-3">
              <ColorField label="Couleur du texte" value={settings.textColor} onChange={(v) => update("textColor", v)} />
              <ColorField label="Couleur du fond" value={settings.backgroundColor} onChange={(v) => update("backgroundColor", v)} />
              <ColorField label="Couleur d'accent" value={settings.accentColor} onChange={(v) => update("accentColor", v)} />
            </div>
            <RangeField label="Opacité du fond" value={settings.backgroundOpacity} min={0} max={100} unit=" %" onChange={(v) => update("backgroundOpacity", v)} />
          </Section>

          <Section title="Accent, ombre et flou">
            <div className="flex flex-wrap items-start gap-x-10 gap-y-5">
              <Segmented label="Accent" options={INFO_BANNER_ACCENTS} labels={ACCENT_LABELS} value={settings.accentStyle} onChange={(v) => update("accentStyle", v)} />
              <Segmented label="Ombre" options={INFO_BANNER_SHADOWS} labels={SHADOW_LABELS} value={settings.shadow} onChange={(v) => update("shadow", v)} />
              <div className="w-full max-w-sm">
                <RangeField label="Flou derrière le bandeau" value={settings.blur} min={L.blur.min} max={L.blur.max} unit=" px" onChange={(v) => update("blur", v)} />
                <p className="mt-2 text-xs text-zinc-400">
                  Effet verre dépoli : visible quand le fond du bandeau est un peu transparent.
                </p>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ───────── Animation ───────── */}
      {tab === "animation" && (
        <div role="tabpanel" id="banner-panel-animation" aria-labelledby="banner-tab-animation" className="space-y-6">
          <Section title="Animation">
            <div className="flex flex-wrap items-start gap-x-10 gap-y-5">
              <Segmented label="Style" options={INFO_BANNER_ANIMATIONS} labels={ANIMATION_LABELS} value={settings.animationStyle} onChange={(v) => update("animationStyle", v)} />
              <Segmented label="Vitesse" options={INFO_BANNER_SPEEDS} labels={SPEED_LABELS} value={settings.animationSpeed} onChange={(v) => update("animationSpeed", v)} />
            </div>
          </Section>

          <Section title="Défilement">
            <RangeField
              label="Durée d'affichage de chaque message"
              value={settings.intervalSeconds}
              min={L.intervalSeconds.min}
              max={L.intervalSeconds.max}
              unit=" s"
              onChange={(v) => update("intervalSeconds", v)}
            />
            <Checkbox checked={settings.shuffle} onChange={(v) => update("shuffle", v)}>
              Ordre aléatoire (jamais le même message deux fois de suite)
            </Checkbox>
            <Checkbox checked={settings.showProgress} onChange={(v) => update("showProgress", v)}>
              Barre de progression (temps restant avant le message suivant)
            </Checkbox>
          </Section>
        </div>
      )}

      {/* ───────── OBS ───────── */}
      {tab === "obs" && (
        <div role="tabpanel" id="banner-panel-obs" aria-labelledby="banner-tab-obs" className="space-y-6">
          <Section
            title="Ajouter à OBS"
            description={`Ajoute une source navigateur avec ce lien, en ${source.width} × ${source.height} px. Cette taille s'adapte à ton bandeau : reviens ici si tu le changes.`}
          >
            <MaskedField value={widgetUrl} secret={widgetToken} label="Lien du widget bandeau" />
            <a
              href={widgetUrl ? `${widgetUrl}?test=1` : undefined}
              aria-disabled={!widgetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${ACTION_BTN} ${widgetUrl ? "" : "pointer-events-none opacity-50"}`}
            >
              <Play size={14} />
              Tester
            </a>
          </Section>
        </div>
      )}

      {/* Barre d'enregistrement : visible tant que des modifications ne sont pas enregistrées. */}
      <UnsavedChangesBar isDirty={isDirty} saving={saving} onSave={save} onDiscard={discard} />

      <ToastDisplay toast={toast} />
    </div>
  );
}
