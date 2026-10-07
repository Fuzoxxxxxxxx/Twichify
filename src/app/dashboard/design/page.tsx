"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import {
  Layout, Type, Image as ImageIcon, Music, Zap, Clock, RotateCw, Sparkles, Palette, Eye, EyeOff,
  BarChart3, Timer,
} from "lucide-react";
import { PageHeader, SliderRow } from "@/components/dashboard/DashboardUI";
import { useToast, ToastDisplay } from "@/components/dashboard/useToast";
import { useWidgetToken } from "@/components/dashboard/useWidgetToken";

export default function DashboardDesign() {
  const { data: session } = useSession();
  const { toast, showToast } = useToast();
  const { token: widgetToken } = useWidgetToken(!!session);

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
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadUserData = useCallback(async () => {
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
        }
      }
    } catch (e) {
      console.error("Erreur de chargement profil", e);
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
        }),
      });
      if (res.ok) showToast("Design du widget mis à jour !");
      else showToast("Erreur lors de la sauvegarde.", "error");
    } catch (e) {
      showToast("Erreur lors de la sauvegarde.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Widgets" title="Widget musique" />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        <div className="rounded-[32px] border border-zinc-800 bg-zinc-950/60 p-8 shadow-2xl shadow-black/30 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2"><Layout size={12} /> Structure</label>
              <select value={layout} onChange={(e) => setLayout(e.target.value)} className="w-full rounded-2xl border border-zinc-700 bg-zinc-950/80 p-4 text-[10px] font-black uppercase tracking-[0.15em] text-white outline-none focus:border-purple-500">
                <option value="default">Horizontal (Slim)</option>
                <option value="minimal">Vertical (Compact)</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2"><Type size={12} /> Typographie</label>
              <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full rounded-2xl border border-zinc-700 bg-zinc-950/80 p-4 text-[10px] font-black uppercase tracking-[0.15em] text-white outline-none focus:border-purple-500">
                <option value="font-sans">Modern Sans</option>
                <option value="font-mono">Retro Mono</option>
                <option value="font-serif">Elegant Serif</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "cover", label: "Pochette", state: showCover, setter: setShowCover, icon: <ImageIcon size={14} /> },
              { id: "artist", label: "Artiste", state: showArtist, setter: setShowArtist, icon: <Music size={14} /> },
              { id: "progress", label: "Progression", state: showProgress, setter: setShowProgress, icon: <Zap size={14} /> },
              { id: "time", label: "Horodatage", state: showTimestamp, setter: setShowTimestamp, icon: <Clock size={14} /> },
              { id: "rotate", label: "Rotation CD", state: isRotating, setter: setIsRotating, icon: <RotateCw size={14} /> },
              { id: "glow", label: "Effet néon", state: enableGlow, setter: setEnableGlow, icon: <Sparkles size={14} /> },
              { id: "blur", label: "Flou fond", state: enableBlurBg, setter: setEnableBlurBg, icon: <Palette size={14} /> },
              { id: "eq", label: "Égaliseur", state: showEqualizer, setter: setShowEqualizer, icon: <BarChart3 size={14} /> },
              { id: "autohide", label: "Masquage auto", state: autoHide, setter: setAutoHide, icon: <Timer size={14} /> },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => option.setter(!option.state)}
                className={`flex items-center justify-between rounded-2xl border p-4 text-[9px] font-black uppercase tracking-[0.18em] transition ${
                  option.state ? "border-purple-500/50 bg-purple-500/10 text-white" : "border-zinc-800 bg-zinc-900/40 text-zinc-500"
                }`}
              >
                <span className="flex items-center gap-2">{option.icon} {option.label}</span>
                {option.state ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            ))}
          </div>

          <div className="space-y-8 border-t border-zinc-800 pt-6">
            <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-black/30 p-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Couleur d'accent</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-zinc-600">Mise en avant de la barre</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-zinc-300">{accentColor}</span>
                <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-10 w-10 rounded-xl border-2 border-zinc-700 bg-transparent p-0" />
              </div>
            </div>

            <SliderRow label="Puissance du flou" value={blurAmount} onChange={setBlurAmount} suffix="px" max={40} />
            <SliderRow label="Transparence fond" value={bgOpacity} onChange={setBgOpacity} suffix="%" max={100} />
            <SliderRow label="Rayon de courbure" value={borderRadius} onChange={setBorderRadius} suffix="px" max={40} />
            {autoHide && (
              <SliderRow label="Durée d'affichage par morceau" value={autoHideSeconds} onChange={setAutoHideSeconds} suffix="s" max={60} />
            )}
          </div>

          <button
            onClick={saveDesign}
            disabled={loading}
            className="w-full rounded-[24px] bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-[11px] font-black uppercase tracking-[0.25em] text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Mise à jour..." : "Appliquer la configuration"}
          </button>
        </div>

        <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[60px] bg-black/40 p-12 min-h-[450px] sticky top-12 overflow-hidden shadow-inner group transition-all">
          <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-all pointer-events-none duration-1000"></div>
          <p className="absolute top-10 text-[10px] font-black text-zinc-700 uppercase tracking-[0.6em] z-30 pointer-events-none">Zone OBS 475x125 pixels</p>
          <style>{`
            @keyframes eq-bounce { 0%, 100% { transform: scaleY(0.25); } 50% { transform: scaleY(1); } }
            .eq-bar { display: inline-block; width: 3px; height: 100%; border-radius: 2px; transform-origin: bottom; animation: eq-bounce 0.9s ease-in-out infinite; }
          `}</style>

          <div
            className={`relative flex items-center transition-all duration-1000 ${fontFamily}
              ${layout === 'minimal' ? 'flex-col w-[232px] px-5 pb-5 text-center mt-14' : 'flex-row w-[380px] h-[100px] p-4'}
            `}
            style={{
              ...(layout === 'minimal' && { paddingTop: showCover ? 62 : 20 }),
              backgroundColor: `rgba(15, 17, 23, ${parseInt(bgOpacity)/100})`,
              borderRadius: `${borderRadius}px`,
              boxShadow: enableGlow ? `0 20px 50px -10px ${accentColor}55` : 'none',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {enableBlurBg && (
              <div className="absolute inset-0 z-0 overflow-hidden" style={{ borderRadius: `${borderRadius}px` }}>
                <div className="absolute inset-0 transition-all duration-[2000ms]"
                  style={{
                    backgroundImage: `url(${currentTrack?.albumImageUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop"})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: `blur(${blurAmount}px) brightness(0.35)`,
                    transform: 'scale(1.2)'
                  }}
                />
              </div>
            )}

            {showCover && (
              <div className={layout === 'minimal' ? "absolute -top-12 left-1/2 z-30 -translate-x-1/2" : "relative z-30 shrink-0 mr-5 -ml-8 transition-transform duration-500"}>
                <img src={currentTrack?.albumImageUrl || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop"}
                  className={`${layout === 'minimal' ? 'w-24 h-24' : 'w-28 h-28'} object-cover shadow-[0_15px_35px_rgba(0,0,0,0.6)] border-2 border-white/10`}
                  style={{
                    borderRadius: isRotating ? '999px' : `${Math.max(8, parseInt(borderRadius))}px`,
                    animation: isRotating ? 'spin-slow 12s linear infinite' : 'none',
                  }}
                  alt="Album Cover"
                />
              </div>
            )}

            <div className={`relative z-10 flex-1 min-w-0 flex flex-col justify-center ${layout === 'minimal' ? 'w-full' : ''}`}>
              {showArtist && (
                <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.25em] mb-0.5 truncate italic">
                  {currentTrack?.artist || "FOX STEVENSON"}
                </p>
              )}
              <h2 className="text-base font-black text-white truncate leading-tight uppercase italic tracking-tighter">
                {currentTrack?.title || "Don't Care Crown"}
              </h2>

              {showProgress && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden backdrop-blur-sm">
                    <div
                      className="h-full transition-all duration-1000 ease-out"
                      style={{
                          backgroundColor: accentColor,
                          width: '60%',
                          boxShadow: `0 0 12px ${accentColor}`
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

      <ToastDisplay toast={toast} />
    </div>
  );
}
