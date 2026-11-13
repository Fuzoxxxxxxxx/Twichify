"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import InfoBannerView from "@/components/widget/InfoBannerView";
import { INFO_BANNER_SAMPLE_MESSAGES, type InfoBannerSettings } from "@/lib/info-banner";

const POLL_MS = 5000;

// Widget OBS « bandeau d'informations » : les messages du streamer défilent à intervalle régulier.
// Mode test (?test=1) : messages d'exemple si rien n'est encore écrit, avec les vrais réglages du streamer.
export default function InfoBannerWidget() {
  const params = useParams();
  const userId = params?.userId as string;

  const [settings, setSettings] = useState<InfoBannerSettings | null>(null);

  // Mode test : null tant que l'URL n'est pas lue.
  const [testMode, setTestMode] = useState<boolean | null>(null);
  useEffect(() => {
    setTestMode(new URLSearchParams(window.location.search).get("test") === "1");
  }, []);

  // Réglages relus toutes les 5 s : un changement dans le dashboard apparaît sans recharger la source OBS.
  useEffect(() => {
    if (!userId || userId === "undefined" || userId.includes("[") || testMode === null) return;
    let last = "";

    const load = async () => {
      try {
        // "no-cache" : le navigateur revalide avec l'ETag de la route (réponse 304 vide tant que rien n'a changé).
        const res = await fetch(`/api/widget/banner/config/${userId}`, { cache: "no-cache" });
        if (!res.ok) return;
        const data = await res.json();
        // Rien à re-rendre si les réglages n'ont pas changé : la rotation en cours n'est pas interrompue.
        const serialized = JSON.stringify(data.settings);
        if (serialized === last) return;
        last = serialized;
        setSettings(data.settings);
      } catch (error) {
        console.error("Erreur de chargement du bandeau:", error);
      }
    };

    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [userId, testMode]);

  if (!settings || testMode === null) return null;

  const messages = settings.messages.length > 0 ? settings.messages : testMode ? INFO_BANNER_SAMPLE_MESSAGES : [];

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-0">
      <style jsx global>{`
        body {
          background: transparent !important;
          overflow: hidden;
        }
      `}</style>

      {testMode && (
        <div className="fixed right-2 top-2 z-50 rounded bg-amber-500/90 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-widest text-black">
          Mode test
        </div>
      )}

      <InfoBannerView settings={settings} messages={messages} />
    </div>
  );
}
