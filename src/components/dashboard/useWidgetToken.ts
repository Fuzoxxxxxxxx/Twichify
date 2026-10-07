"use client";

import { useCallback, useEffect, useState } from "react";

// Jeton des widgets de l'utilisateur connecté : il remplace l'identifiant du compte dans les URL
// des widgets OBS, des commandes bot et des aperçus du dashboard. Régénérable si le lien fuite.
export function useWidgetToken(enabled: boolean = true) {
  const [token, setToken] = useState<string | null>(null);
  const [legacyActive, setLegacyActive] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    fetch("/api/user/widget-token")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.token) return;
        setToken(data.token);
        setLegacyActive(!!data.legacyActive);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Renvoie true si le nouveau jeton a bien été créé.
  const regenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      const res = await fetch("/api/user/widget-token", { method: "POST" });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data?.token) return false;
      setToken(data.token);
      setLegacyActive(false);
      return true;
    } catch {
      return false;
    } finally {
      setRegenerating(false);
    }
  }, []);

  return { token, legacyActive, regenerating, regenerate };
}
