"use client";

import { useEffect } from "react";
import { RefreshCw, Home, RadioTower } from "lucide-react";
import ErrorScreen from "@/components/ErrorScreen";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erreur serveur capturée :", error);
  }, [error]);

  return (
    <ErrorScreen
      code="500"
      tone="rose"
      badge="Erreur serveur"
      badgeIcon={RadioTower}
      title="Une erreur est survenue."
      message={`Un problème inattendu s'est produit de notre côté. Réessaie dans un instant ; s'il persiste, consulte le statut des services ou contacte le support${error?.digest ? " en indiquant l'ID ci-dessous" : ""}.`}
      digest={error?.digest}
      primary={{ label: "Réessayer", icon: RefreshCw, onClick: () => reset() }}
      secondary={{ label: "Accueil", icon: Home, href: "/" }}
    />
  );
}
