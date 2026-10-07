import { NextResponse } from "next/server";
import axios from "axios";
import { getSessionUser } from "@/lib/auth-helpers";
import { getAppAccessToken } from "@/lib/twitch";
import { decrypt } from "@/lib/crypto";

export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "warning" | "error";

interface Check {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

// POST : lance une série de vérifications en direct sur la configuration de l'utilisateur
// (comptes liés, base de données, widgets activés) pour l'aider à comprendre pourquoi
// quelque chose ne fonctionne pas, sans avoir à ouvrir un ticket de support.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const checks: Check[] = [];

  // 1. Base de données : si on est arrivé jusqu'ici avec l'utilisateur chargé, elle répond.
  const dbStart = Date.now();
  checks.push({
    id: "database",
    label: "Base de données",
    status: "ok",
    detail: `Connexion établie (${Date.now() - dbStart} ms).`,
  });

  // 2. Compte Twitch
  if (user.name) {
    checks.push({
      id: "twitch-account",
      label: "Compte Twitch",
      status: "ok",
      detail: `Connecté en tant que ${user.name}.`,
    });
  } else {
    checks.push({
      id: "twitch-account",
      label: "Compte Twitch",
      status: "error",
      detail: "Aucun pseudo Twitch associé à ce compte. Reconnecte-toi via Twitch.",
    });
  }

  // 3. Chaîne Twitch joignable via l'API (conditionne le widget chat, qui rejoint ce salon IRC)
  if (user.name) {
    try {
      const token = await getAppAccessToken();
      const res = await axios.get(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(user.name)}`, {
        headers: {
          "Client-ID": process.env.TWITCH_CLIENT_ID!,
          Authorization: `Bearer ${token}`,
        },
        timeout: 6000,
      });
      const found = res.data?.data?.[0];
      checks.push({
        id: "twitch-channel",
        label: "Chaîne Twitch",
        status: found ? "ok" : "error",
        detail: found
          ? `Chaîne "${user.name}" trouvée sur Twitch. Le widget chat peut rejoindre son salon.`
          : `Aucune chaîne Twitch nommée "${user.name}" n'a été trouvée.`,
      });
    } catch (error) {
      checks.push({
        id: "twitch-channel",
        label: "Chaîne Twitch",
        status: "error",
        detail: "Impossible de joindre l'API Twitch pour le moment. Réessaie dans quelques minutes.",
      });
    }
  }

  // 4. Connexion Spotify
  if (!user.spotifyRefreshToken || !user.spotifyClientId || !user.spotifyClientSecret) {
    checks.push({
      id: "spotify",
      label: "Connexion Spotify",
      status: "warning",
      detail: "Spotify n'est pas encore connecté. Le widget musique n'affichera rien tant que ce n'est pas fait.",
    });
  } else {
    try {
      const refreshToken = decrypt(user.spotifyRefreshToken);
      const clientId = decrypt(user.spotifyClientId);
      const clientSecret = decrypt(user.spotifyClientSecret);

      await axios.post(
        "https://accounts.spotify.com/api/token",
        new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken || "" }),
        {
          headers: {
            Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 6000,
        }
      );

      checks.push({
        id: "spotify",
        label: "Connexion Spotify",
        status: "ok",
        detail: "Le jeton Spotify est valide et a pu être renouvelé.",
      });
    } catch (error: any) {
      const spotifyError = error?.response?.data?.error;
      checks.push({
        id: "spotify",
        label: "Connexion Spotify",
        status: "error",
        detail:
          spotifyError === "invalid_client"
            ? "Client ID ou Client Secret invalide. Vérifie tes identifiants dans Intégrations → Spotify."
            : spotifyError === "invalid_grant"
            ? "L'autorisation Spotify a été révoquée. Reconnecte ton compte Spotify."
            : "Impossible de contacter Spotify pour le moment. Réessaie dans quelques minutes.",
      });
    }
  }

  // 5. État des widgets : un widget fonctionne dès que sa source est disponible
  //    (Spotify pour le widget musique, la chaîne Twitch pour le widget chat).
  const musicReady = checks.find((c) => c.id === "spotify")?.status === "ok";
  checks.push({
    id: "music-widget",
    label: "Widget musique",
    status: musicReady ? "ok" : "warning",
    detail: musicReady
      ? "Actif : il affichera ta musique dans OBS."
      : "Inactif : il n'affichera rien tant que Spotify n'est pas correctement connecté.",
  });

  const chatReady = checks.find((c) => c.id === "twitch-channel")?.status === "ok";
  checks.push({
    id: "chat-widget",
    label: "Widget chat",
    status: chatReady ? "ok" : "warning",
    detail: chatReady
      ? "Actif : il affichera le chat de ta chaîne dans OBS."
      : "Inactif : il n'affichera rien tant que ta chaîne Twitch n'est pas trouvée.",
  });

  const summary = {
    ok: checks.filter((c) => c.status === "ok").length,
    warning: checks.filter((c) => c.status === "warning").length,
    error: checks.filter((c) => c.status === "error").length,
  };

  return NextResponse.json({ checks, summary, ranAt: new Date().toISOString() });
}
