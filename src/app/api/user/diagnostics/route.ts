import { NextResponse } from "next/server";
import axios from "axios";
import { getSessionUser } from "@/lib/auth-helpers";
import { getAppAccessToken } from "@/lib/twitch";
import { decrypt } from "@/lib/crypto";
import User from "@/models/User";
import { sanitizeInfoBanner } from "@/lib/info-banner";

export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "warning" | "error";

interface Check {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

// Chaque diagnostic appelle Twitch et renouvelle un jeton Spotify : on espace les lancements d'un même utilisateur.
// Compteur en mémoire du serveur : il suffit contre les clics répétés, sans chercher à être infaillible entre instances.
const COOLDOWN_MS = 10_000;
const lastRunByUser = new Map<string, number>();

// Identifiants Spotify chiffrés illisibles (clé de chiffrement changée, donnée corrompue) : ce n'est pas un problème de réseau.
class CredentialsError extends Error {}

function readCredential(value: string): string {
  let plain: string | null | undefined;
  try {
    plain = decrypt(value);
  } catch {
    throw new CredentialsError("Identifiant illisible");
  }
  if (!plain) throw new CredentialsError("Identifiant vide");
  return plain;
}

// POST : lance une série de vérifications en direct sur la configuration de l'utilisateur
// (comptes liés, base de données, widgets activés) pour l'aider à comprendre pourquoi
// quelque chose ne fonctionne pas, sans avoir à ouvrir un ticket de support.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const userKey = String(user._id);
  const now = Date.now();
  const waitMs = COOLDOWN_MS - (now - (lastRunByUser.get(userKey) ?? 0));
  if (waitMs > 0) {
    return NextResponse.json(
      { error: "Diagnostic déjà lancé à l'instant. Réessaie dans quelques secondes." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(waitMs / 1000)) } }
    );
  }
  lastRunByUser.set(userKey, now);
  if (lastRunByUser.size > 500) {
    for (const [key, at] of lastRunByUser) if (now - at > COOLDOWN_MS) lastRunByUser.delete(key);
  }

  const checks: Check[] = [];

  // 1. Base de données : une vraie requête, dont on mesure la durée.
  const dbStart = Date.now();
  try {
    await User.exists({ _id: user._id });
    checks.push({
      id: "database",
      label: "Base de données",
      status: "ok",
      detail: `Connexion établie (${Date.now() - dbStart} ms).`,
    });
  } catch (error) {
    console.error("Erreur diagnostic base de données:", error);
    checks.push({
      id: "database",
      label: "Base de données",
      status: "error",
      detail: "La base de données ne répond pas pour le moment. Réessaie dans quelques minutes.",
    });
  }

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
      const refreshToken = readCredential(user.spotifyRefreshToken);
      const clientId = readCredential(user.spotifyClientId);
      const clientSecret = readCredential(user.spotifyClientSecret);

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
          error instanceof CredentialsError
            ? "Tes identifiants Spotify enregistrés sont illisibles. Reconnecte ton compte dans Intégrations → Spotify."
            : spotifyError === "invalid_client"
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

  // Le bandeau d'informations ne dépend ni de Spotify ni de Twitch : il affiche les messages enregistrés.
  // Les réglages sont exclus par défaut du modèle (ils peuvent contenir des logos) : on les demande explicitement.
  try {
    const doc = await User.findById(user._id).select("+bannerWidgetSettings").lean();
    const banner = sanitizeInfoBanner((doc as any)?.bannerWidgetSettings);
    const messages = banner.messages.filter((m) => m.text.trim()).length;

    checks.push({
      id: "banner-widget",
      label: "Widget bandeau",
      status: messages > 0 ? "ok" : "warning",
      detail:
        messages === 0
          ? "Inactif : aucun message enregistré, il n'affichera rien. Ajoute-en un dans Widgets → Bandeau, puis enregistre."
          : messages === 1
          ? "Actif : 1 message enregistré, affiché en continu dans OBS."
          : `Actif : ${messages} messages enregistrés, affichés en rotation toutes les ${banner.intervalSeconds} s dans OBS.`,
    });
  } catch (error) {
    console.error("Erreur diagnostic bandeau d'informations:", error);
    checks.push({
      id: "banner-widget",
      label: "Widget bandeau",
      status: "warning",
      detail: "Impossible de lire les réglages du bandeau pour le moment. Réessaie dans quelques minutes.",
    });
  }

  const summary = {
    ok: checks.filter((c) => c.status === "ok").length,
    warning: checks.filter((c) => c.status === "warning").length,
    error: checks.filter((c) => c.status === "error").length,
  };

  return NextResponse.json({ checks, summary, ranAt: new Date().toISOString() });
}
