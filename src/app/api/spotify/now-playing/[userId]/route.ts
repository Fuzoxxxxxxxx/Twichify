import { NextResponse, NextRequest } from "next/server";
import mongoose from "mongoose";
import User from "@/models/User";
import TrackHistory from "@/models/TrackHistory";
import axios from "axios";
import { decrypt } from "@/lib/crypto";
import { findUserByWidgetRef } from "@/lib/widget-token";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ── CACHE EN MÉMOIRE (par instance de serveur) ──
// Le widget musique poll cette route toutes les secondes. Sans cache, chaque poll
// redemandait un nouveau jeton d'accès Spotify (alors qu'un jeton est valable ~1h)
// et un nouvel appel "currently-playing", ce qui gaspillait des requêtes et risquait
// un blocage (429) par Spotify dès que plusieurs widgets étaient ouverts.
//
// Limite connue : ce cache vit dans la mémoire du processus. Sur une infra à
// plusieurs instances (ex. Vercel serverless multi-régions), chaque instance a
// son propre cache — ce n'est donc pas un cache partagé global, mais il reste
// efficace car les polls d'un même widget retombent presque toujours sur la
// même instance tant qu'elle reste "chaude".
const ACCESS_TOKEN_MARGIN_MS = 60_000; // renouvelle 60s avant l'expiration réelle
// Le widget poll toutes les 1000ms. Ce cache ne sert qu'à regrouper des requêtes
// vraiment simultanées (widget réel + aperçu du dashboard ouverts en même temps),
// pas à ralentir le rythme normal d'un seul poll par seconde : il doit donc rester
// nettement plus court que l'intervalle de poll, sous peine de faire sauter un
// rafraîchissement sur deux à cause du moindre décalage de timing.
const TRACK_CACHE_MS = 400;

interface TokenCacheEntry {
  accessToken: string;
  expiresAt: number;
}

interface TrackCacheEntry {
  expiresAt: number;
  payload: any;
}

const tokenCache = new Map<string, TokenCacheEntry>();
const trackCache = new Map<string, TrackCacheEntry>();

// Écoute en cours par utilisateur : évite une requête DB par poll (1/s) pour
// incrémenter la durée d'écoute du même morceau. Limite connue identique aux
// caches ci-dessus : propre à chaque instance de serveur, pas partagé.
interface ActiveListenEntry {
  trackKey: string;
  historyId: mongoose.Types.ObjectId;
}
const activeListenCache = new Map<string, ActiveListenEntry>();

// Temps écouté cumulé entre deux écritures en base (propre à chaque instance, comme les caches ci-dessus).
// Écrire à chaque poll coûtait deux requêtes Mongo par poll et par widget ouvert.
interface ListenBufferEntry {
  lastPollAt: number;
  pendingMs: number;
  lastFlushAt: number;
}
const listenBuffer = new Map<string, ListenBufferEntry>();
const MAX_POLL_GAP_MS = 10_000; // au-delà, le widget était fermé ou en veille : ce temps n'est pas compté
const STATS_FLUSH_MS = 15_000; // intervalle maximal entre deux écritures des stats en base

async function getAccessToken(userId: string, refreshToken: string, clientId: string, clientSecret: string) {
  const cached = tokenCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken;
  }

  const tokenResponse = await axios.post(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken || "" }),
    {
      headers: {
        Authorization: "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const accessToken = tokenResponse.data.access_token;
  const expiresInMs = (tokenResponse.data.expires_in || 3600) * 1000;
  tokenCache.set(userId, { accessToken, expiresAt: Date.now() + expiresInMs - ACCESS_TOKEN_MARGIN_MS });

  return accessToken;
}

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  // Réponse groupée : si un autre poll pour le même utilisateur vient de répondre
  // il y a moins de TRACK_CACHE_MS, on renvoie directement ce résultat.
  const cachedTrack = trackCache.get(userId);
  if (cachedTrack && cachedTrack.expiresAt > Date.now()) {
    return NextResponse.json(cachedTrack.payload);
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }

  const user = await findUserByWidgetRef(userId);

  if (!user) return NextResponse.json({ isPlaying: false });

  // `userId` est la valeur de l'URL (jeton ou ancien _id) : elle sert de clé au cache de réponse
  // ci-dessus, pour qu'un lien révoqué ne soit jamais servi. Les jetons Spotify et l'historique
  // d'écoute, eux, restent indexés par l'_id réel du compte.
  const uid = String(user._id);

  // Ajout de blurAmount dans les valeurs par défaut
  const defaultSettings = {
    accentColor: "#22c55e",
    borderRadius: "16",
    bgOpacity: "80",
    blurAmount: "10", // <--- IMPORTANT POUR LE FLOU
    enableBlurBg: true
  };

  if (!user.spotifyRefreshToken) return NextResponse.json({ isPlaying: false });

  const decryptedRefreshToken = decrypt(user.spotifyRefreshToken);
  const decryptedClientId = decrypt(user.spotifyClientId);
  const decryptedClientSecret = decrypt(user.spotifyClientSecret);

  try {
    const accessToken = await getAccessToken(
      uid,
      decryptedRefreshToken || "",
      decryptedClientId || "",
      decryptedClientSecret || ""
    );

    const trackResponse = await axios.get("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // CORRECTION PAUSE : On vérifie si Spotify dit explicitement que ça ne joue pas
    if (
      trackResponse.status === 204 || 
      !trackResponse.data || 
      !trackResponse.data.item || 
      trackResponse.data.is_playing === false // <--- DETECTION DE LA PAUSE
    ) {
      const payload = { 
        isPlaying: false,
        source: "spotify",
        settings: user.widgetSettings || defaultSettings 
      };
      trackCache.set(userId, { expiresAt: Date.now() + TRACK_CACHE_MS, payload });
      return NextResponse.json(payload);
    }

    const item = trackResponse.data.item;

    // ── STATISTIQUES D'ÉCOUTE ──
    // Accumule le temps d'écoute, détecte les changements de morceau à chaque poll du
    // widget, et alimente l'historique détaillé (TrackHistory) en plus du cumul global.
    try {
      const now = new Date();
      const trackKey = `${item.name}|${item.artists.map((a: any) => a.name).join(", ")}`;
      const stats = user.listeningStats || {};

      // Durée écoulée depuis le dernier poll : mesurée en mémoire quand on la connaît (les écritures en
      // base sont espacées), sinon depuis le dernier poll enregistré en base (1er poll de cette instance).
      const buf = listenBuffer.get(uid);
      const lastPollMs = buf?.lastPollAt ?? (stats.lastPollAt ? new Date(stats.lastPollAt).getTime() : 0);
      let deltaMs = 0;
      if (lastPollMs) {
        const elapsed = now.getTime() - lastPollMs;
        // Borné : évite les sauts géants si le widget était fermé/en veille entre deux polls
        if (elapsed > 0 && elapsed < MAX_POLL_GAP_MS) deltaMs = elapsed;
      }
      const pendingMs = (buf?.pendingMs ?? 0) + deltaMs;

      const isNewTrack = stats.lastTrackKey !== trackKey;
      const albumImageUrl = item.album.images[0]?.url || null;

      // Écritures en base espacées : le temps écouté est cumulé en mémoire et n'est écrit qu'à un
      // changement de morceau ou toutes les STATS_FLUSH_MS, au lieu de deux écritures par poll.
      const lastFlushAt = buf?.lastFlushAt ?? 0;
      const shouldFlush = isNewTrack || now.getTime() - lastFlushAt >= STATS_FLUSH_MS;
      listenBuffer.set(uid, {
        lastPollAt: now.getTime(),
        pendingMs: shouldFlush ? 0 : pendingMs,
        lastFlushAt: shouldFlush ? now.getTime() : lastFlushAt,
      });

      if (shouldFlush) {
        await User.findByIdAndUpdate(user._id, {
          $inc: {
            "listeningStats.totalMsListened": pendingMs,
            "listeningStats.totalTracksPlayed": isNewTrack ? 1 : 0,
          },
          $set: {
            "listeningStats.lastPollAt": now,
            "listeningStats.lastTrackKey": trackKey,
            ...(isNewTrack && {
              "listeningStats.lastTrack": {
                title: item.name,
                artist: item.artists.map((a: any) => a.name).join(", "),
                albumImageUrl,
                playedAt: now,
              },
            }),
          },
        });

        // Historique détaillé : une entrée par écoute, avec sa durée cumulée.
        let active = activeListenCache.get(uid);

        if (!isNewTrack && (!active || active.trackKey !== trackKey)) {
          // Même morceau mais cache vide (une autre instance serveur a pris le relais) : on retrouve son
          // entrée la plus récente en base plutôt que d'en créer une seconde.
          const latest = await TrackHistory.findOne({ user: user._id }).sort({ playedAt: -1 }).select("title artist");
          active =
            latest && `${latest.title}|${latest.artist}` === trackKey
              ? { trackKey, historyId: latest._id }
              : undefined;
        }

        if (isNewTrack || !active) {
          // Le temps cumulé depuis la dernière écriture appartient surtout au morceau qui vient de se terminer.
          const previous = activeListenCache.get(uid);
          if (isNewTrack && previous && pendingMs > 0) {
            await TrackHistory.findByIdAndUpdate(previous.historyId, { $inc: { msPlayed: pendingMs } });
          }
          const created = await TrackHistory.create({
            user: user._id,
            title: item.name,
            artist: item.artists.map((a: any) => a.name).join(", "),
            albumImageUrl,
            playedAt: now,
            msPlayed: 0,
          });
          activeListenCache.set(uid, { trackKey, historyId: created._id });
        } else {
          activeListenCache.set(uid, active);
          if (pendingMs > 0) {
            await TrackHistory.findByIdAndUpdate(active.historyId, { $inc: { msPlayed: pendingMs } });
          }
        }
      }
    } catch (statsError) {
      console.error("Erreur mise à jour statistiques d'écoute:", statsError);
    }
    
    const payload = {
      isPlaying: trackResponse.data.is_playing,
      title: item.name,
      artist: item.artists.map((a: any) => a.name).join(", "),
      albumImageUrl: item.album.images[0].url,
      progressMs: trackResponse.data.progress_ms,
      durationMs: item.duration_ms,
      source: "spotify",
      settings: user.widgetSettings || defaultSettings
    };
    trackCache.set(userId, { expiresAt: Date.now() + TRACK_CACHE_MS, payload });

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    });

  } catch (error: any) {
    const retryAfter = error.response?.headers["retry-after"];
    if (retryAfter) {
      console.log(`⏳ Spotify demande d'attendre ${retryAfter} secondes avant la prochaine requête.`);
      // Respecte l'attente demandée par Spotify : on évite de le redemander avant.
      trackCache.set(userId, {
        expiresAt: Date.now() + Number(retryAfter) * 1000,
        payload: { isPlaying: false, error: true, source: "spotify", settings: user.widgetSettings || defaultSettings },
      });
    } else {
      console.log("⏳ Pas d'en-tête Retry-After précis (patienter généralement 1 à 5 minutes).");
    }

    // Un jeton refusé (401/400) est probablement invalide : on le purge pour forcer un renouvellement au prochain poll.
    if (error.response?.status === 401 || error.response?.status === 400) {
      tokenCache.delete(uid);
    }

    // Erreur temporaire (Spotify, réseau) : `error: true` permet au widget de garder le dernier morceau
    // affiché au lieu de disparaître comme pour une vraie pause.
    return NextResponse.json({
      isPlaying: false,
      error: true,
      source: "spotify",
      settings: user.widgetSettings || defaultSettings,
    });
  }
}
