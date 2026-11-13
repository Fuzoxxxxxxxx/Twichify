"use client";

import InfoBannerView from "@/components/widget/InfoBannerView";
import {
  DEFAULT_INFO_BANNER,
  brandMessageStyle,
  newInfoBannerMessage,
  type InfoBannerMessage,
  type InfoBannerSettings,
} from "@/lib/info-banner";

// Aperçu du bandeau d'informations pour la page d'accueil : le vrai rendu du widget (InfoBannerView), avec trois
// messages fictifs. Chacun reprend le logo et les couleurs de sa marque, exactement comme quand on choisit une
// plateforme dans le dashboard (brandMessageStyle). Aucune donnée d'utilisateur.

const SETTINGS: InfoBannerSettings = {
  ...DEFAULT_INFO_BANNER,
  fontSize: 24,
  widgetWidth: 560,
  intervalSeconds: 4,
  logoStyle: "chip",
  showProgress: true,
  animationStyle: "slide",
};

const branded = (text: string, brand: string): InfoBannerMessage => ({
  ...newInfoBannerMessage(text),
  icon: brand,
  ...brandMessageStyle(brand),
});

const MESSAGES: InfoBannerMessage[] = [
  branded("Retrouve-moi sur Discord", "discord"),
  branded("Une nouvelle vidéo chaque semaine", "youtube"),
  branded("Un live presque chaque soir sur Twitch", "twitch"),
];

export default function BannerWidgetPreview() {
  return (
    <div className="w-full" aria-label="Aperçu du bandeau d'informations avec des messages de démonstration">
      <InfoBannerView settings={SETTINGS} messages={MESSAGES} />
    </div>
  );
}
