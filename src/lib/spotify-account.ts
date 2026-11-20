import axios from "axios";
import { decrypt } from "@/lib/crypto";

/**
 * Nom du compte Spotify relié (« Connecté en tant que… »), lu en direct auprès de Spotify.
 *
 * Rien n'est enregistré : le nom n'existe que dans la réponse et dans un petit cache en mémoire. On évite ainsi une donnée
 * personnelle de plus en base (export, suppression, politique de confidentialité). `GET /v1/me` ne demande aucune permission
 * supplémentaire pour le nom d'affichage et l'identifiant, les scopes déjà accordés suffisent.
 */

const CACHE_MS = 10 * 60_000;
const FAILURE_CACHE_MS = 60_000; // un échec ne doit pas relancer deux appels Spotify à chaque ouverture de la page
const CACHE_MAX = 2000;
const REQUEST_TIMEOUT_MS = 5000;

const cache = new Map<string, { name: string | null; expiresAt: number }>();

type SpotifyUser = { _id: unknown; spotifyRefreshToken?: string | null; spotifyClientId?: string | null; spotifyClientSecret?: string | null };

/**
 * Renvoie le nom d'affichage du compte Spotify (à défaut son identifiant), ou null s'il est indisponible
 * (jeton refusé, Spotify injoignable). Ne lève jamais d'erreur.
 */
export async function getSpotifyAccountName(user: SpotifyUser): Promise<string | null> {
  if (!user.spotifyRefreshToken) return null;

  // La clé contient la fin du jeton chiffré : relier un autre compte change ce jeton, donc l'ancien nom n'est jamais resservi,
  // même d'une instance serveur à l'autre.
  const key = `${String(user._id)}:${user.spotifyRefreshToken.slice(-24)}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.name;

  const remember = (name: string | null, ttl: number) => {
    if (cache.size >= CACHE_MAX) cache.clear();
    cache.set(key, { name, expiresAt: Date.now() + ttl });
    return name;
  };

  const refreshToken = decrypt(user.spotifyRefreshToken);
  const clientId = decrypt(user.spotifyClientId || "");
  const clientSecret = decrypt(user.spotifyClientSecret || "");
  if (!refreshToken || !clientId || !clientSecret) return remember(null, FAILURE_CACHE_MS);

  try {
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
      {
        headers: {
          Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: REQUEST_TIMEOUT_MS,
      }
    );

    const me = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
      timeout: REQUEST_TIMEOUT_MS,
    });

    const displayName = typeof me.data?.display_name === "string" ? me.data.display_name.trim() : "";
    const id = typeof me.data?.id === "string" ? me.data.id.trim() : "";
    const name = (displayName || id).slice(0, 80) || null;
    return remember(name, name ? CACHE_MS : FAILURE_CACHE_MS);
  } catch {
    return remember(null, FAILURE_CACHE_MS);
  }
}
