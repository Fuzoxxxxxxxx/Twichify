import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import mongoose from "mongoose";
import User from "@/models/User";
import TrackHistory from "@/models/TrackHistory";

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIODS: Record<string, number | null> = { "7d": 7 * DAY_MS, "30d": 30 * DAY_MS, "90d": 90 * DAY_MS, all: null };
const MIN_MS_PLAYED = 15_000; // ignore les écoutes de moins de 15 s (skips) dans les classements
const SESSION_GAP_MS = 30 * 60_000; // plus de 30 min sans musique = nouvelle session d'écoute
const SESSION_DOCS_CAP = 30_000; // borne le calcul des sessions sur les très gros historiques
const DEFAULT_TZ = "Europe/Paris";

async function connect() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }
}

// Fuseau horaire envoyé par le navigateur : les heures, jours et séries sont calculés dans SON fuseau.
function safeTimezone(raw: string | null): string {
  if (!raw) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en", { timeZone: raw });
    return raw;
  } catch {
    return DEFAULT_TZ;
  }
}

// Jours au format AAAA-MM-JJ : l'arithmétique se fait en UTC, donc sans effet de fuseau ni d'heure d'été.
const shiftDay = (day: string, delta: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
};

function computeStreaks(days: string[], today: string) {
  const set = new Set(days);

  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of days) {
    run = previous && shiftDay(previous, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }

  // Série en cours : elle ne casse pas tant qu'on n'a pas laissé passer un jour entier (aujourd'hui peut ne pas être fini).
  let cursor = set.has(today) ? today : shiftDay(today, -1);
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = shiftDay(cursor, -1);
  }

  return { current, longest };
}

type SessionDoc = { playedAt: Date; msPlayed: number };

// Regroupe les écoutes en sessions (blocs de musique séparés par plus de 30 min de silence).
function computeSessions(docs: SessionDoc[]) {
  let count = 0;
  let totalMs = 0;
  let longest: { ms: number; startedAt: Date } | null = null;

  let sessionStart: Date | null = null;
  let sessionMs = 0;
  let lastEnd = 0;

  const close = () => {
    if (!sessionStart) return;
    count++;
    totalMs += sessionMs;
    if (!longest || sessionMs > longest.ms) longest = { ms: sessionMs, startedAt: sessionStart };
  };

  for (const doc of docs) {
    const start = new Date(doc.playedAt).getTime();
    if (sessionStart && start - lastEnd > SESSION_GAP_MS) {
      close();
      sessionStart = null;
      sessionMs = 0;
    }
    if (!sessionStart) sessionStart = new Date(start);
    sessionMs += doc.msPlayed || 0;
    lastEnd = Math.max(lastEnd, start + (doc.msPlayed || 0));
  }
  close();

  return {
    count,
    avgMs: count ? Math.round(totalMs / count) : 0,
    longest: longest as { ms: number; startedAt: Date } | null,
  };
}

// GET : historique d'écoute de l'utilisateur connecté.
// Paramètres : period (7d | 30d | 90d | all), limit (écoutes récentes, 1 à 100), tz (fuseau IANA du navigateur).
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  await connect();
  const user = await User.findOne({ email: session.user.email }, "_id");
  if (!user) return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const periodParam = searchParams.get("period") || "30d";
  const period = periodParam in PERIODS ? periodParam : "30d";
  const periodMs = PERIODS[period];
  const tz = safeTimezone(searchParams.get("tz"));
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 100);

  const now = new Date();
  const since = periodMs ? new Date(now.getTime() - periodMs) : null;
  // Période précédente de même durée, pour les comparaisons (inexistante pour « tout »).
  const previousSince = since && periodMs ? new Date(since.getTime() - periodMs) : null;

  const match: Record<string, unknown> = { user: user._id };
  if (since) match.playedAt = { $gte: since };
  const matchPlayed = { ...match, msPlayed: { $gte: MIN_MS_PLAYED } };

  const tzDate = (date: string) => ({ date, timezone: tz });

  try {
    const [recent, topTracks, topArtists, heat, dailyAll, facet, skipped, previousTotals, sessionDocs, first, periodArtists] =
      await Promise.all([
        // Liste récente, sans filtrer les skips : l'utilisateur veut voir ce qui a réellement défilé.
        TrackHistory.find(match, "title artist albumImageUrl playedAt msPlayed").sort({ playedAt: -1 }).limit(limit).lean(),

        TrackHistory.aggregate([
          { $match: matchPlayed },
          {
            $group: {
              _id: { title: "$title", artist: "$artist" },
              albumImageUrl: { $last: "$albumImageUrl" },
              plays: { $sum: 1 },
              msPlayed: { $sum: "$msPlayed" },
              lastPlayedAt: { $max: "$playedAt" },
            },
          },
          { $sort: { plays: -1, msPlayed: -1 } },
          { $limit: 10 },
        ]),

        TrackHistory.aggregate([
          { $match: matchPlayed },
          {
            $group: {
              _id: "$artist",
              albumImageUrl: { $last: "$albumImageUrl" }, // pas d'image d'artiste stockée : on prend la pochette la plus récente
              plays: { $sum: 1 },
              msPlayed: { $sum: "$msPlayed" },
              tracks: { $addToSet: "$title" },
            },
          },
          { $addFields: { distinctTracks: { $size: "$tracks" } } },
          { $project: { tracks: 0 } },
          { $sort: { plays: -1, msPlayed: -1 } },
          { $limit: 10 },
        ]),

        // Carte de chaleur jour de la semaine × heure, dans le fuseau du navigateur.
        TrackHistory.aggregate([
          { $match: matchPlayed },
          {
            $group: {
              _id: { dow: { $dayOfWeek: tzDate("$playedAt") }, hour: { $hour: tzDate("$playedAt") } },
              plays: { $sum: 1 },
            },
          },
        ]),

        // Activité par jour sur tout l'historique conservé (180 jours maximum) : sert au graphique et aux séries.
        TrackHistory.aggregate([
          { $match: { user: user._id, msPlayed: { $gte: MIN_MS_PLAYED } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", ...tzDate("$playedAt") } },
              plays: { $sum: 1 },
              msPlayed: { $sum: "$msPlayed" },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        TrackHistory.aggregate([
          { $match: matchPlayed },
          {
            $facet: {
              totals: [{ $group: { _id: null, msPlayed: { $sum: "$msPlayed" }, plays: { $sum: 1 } } }],
              tracks: [{ $group: { _id: { title: "$title", artist: "$artist" } } }, { $count: "n" }],
              artists: [{ $group: { _id: "$artist" } }, { $count: "n" }],
            },
          },
        ]),

        TrackHistory.countDocuments({ ...match, msPlayed: { $lt: MIN_MS_PLAYED } }),

        previousSince && since
          ? TrackHistory.aggregate([
              { $match: { user: user._id, msPlayed: { $gte: MIN_MS_PLAYED }, playedAt: { $gte: previousSince, $lt: since } } },
              { $group: { _id: null, msPlayed: { $sum: "$msPlayed" }, plays: { $sum: 1 } } },
            ])
          : Promise.resolve([]),

        // Pour les sessions on garde aussi les skips : ils font partie d'une même séance d'écoute.
        TrackHistory.find(match, "playedAt msPlayed").sort({ playedAt: 1 }).limit(SESSION_DOCS_CAP).lean(),

        TrackHistory.findOne({ user: user._id }, "playedAt").sort({ playedAt: 1 }).lean(),

        since ? TrackHistory.distinct("artist", matchPlayed) : Promise.resolve([] as string[]),
      ]);

    /* ── Totaux et comparaison ── */
    const totalsRow = facet[0]?.totals?.[0];
    const totals = {
      msPlayed: totalsRow?.msPlayed || 0,
      plays: totalsRow?.plays || 0,
      distinctTracks: facet[0]?.tracks?.[0]?.n || 0,
      distinctArtists: facet[0]?.artists?.[0]?.n || 0,
      skipped,
      skipRate: totalsRow?.plays || skipped ? Math.round((skipped / ((totalsRow?.plays || 0) + skipped)) * 100) : 0,
    };

    const previous = previousSince ? { msPlayed: previousTotals[0]?.msPlayed || 0, plays: previousTotals[0]?.plays || 0 } : null;

    /* ── Activité par jour et séries ── */
    const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    const sinceKey = since ? new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(since) : null;

    const allDays: { _id: string; plays: number; msPlayed: number }[] = dailyAll;
    const daily = (sinceKey ? allDays.filter((d) => d._id >= sinceKey) : allDays).map((d) => ({ date: d._id, plays: d.plays, msPlayed: d.msPlayed }));
    const streak = computeStreaks(allDays.map((d) => d._id), todayKey);

    /* ── Habitudes : carte de chaleur (lundi = 0) et activité par heure ── */
    const heatmap: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
    const hourTotals = new Array(24).fill(0);
    for (const cell of heat as { _id: { dow: number; hour: number }; plays: number }[]) {
      const day = (cell._id.dow + 5) % 7; // $dayOfWeek : 1 = dimanche … 7 = samedi
      heatmap[day][cell._id.hour] += cell.plays;
      hourTotals[cell._id.hour] += cell.plays;
    }

    /* ── Sessions ── */
    const sessions = computeSessions(sessionDocs as SessionDoc[]);

    /* ── Découvertes : artistes écoutés sur la période et jamais auparavant ── */
    let discoveries: { count: number; top: { artist: string; plays: number; albumImageUrl: string | null }[] } | null = null;
    if (since && (periodArtists as string[]).length > 0 && first && new Date((first as { playedAt: Date }).playedAt) < since) {
      const knownBefore = new Set<string>(
        await TrackHistory.distinct("artist", {
          user: user._id,
          msPlayed: { $gte: MIN_MS_PLAYED },
          playedAt: { $lt: since },
          artist: { $in: periodArtists },
        })
      );
      const newArtists = (periodArtists as string[]).filter((a) => !knownBefore.has(a));

      const top = newArtists.length
        ? await TrackHistory.aggregate([
            { $match: { ...matchPlayed, artist: { $in: newArtists } } },
            { $group: { _id: "$artist", plays: { $sum: 1 }, albumImageUrl: { $last: "$albumImageUrl" } } },
            { $sort: { plays: -1 } },
            { $limit: 5 },
          ])
        : [];

      discoveries = {
        count: newArtists.length,
        top: top.map((t: { _id: string; plays: number; albumImageUrl: string | null }) => ({
          artist: t._id,
          plays: t.plays,
          albumImageUrl: t.albumImageUrl,
        })),
      };
    }

    return NextResponse.json({
      period,
      tz,
      trackingSince: first ? (first as { playedAt: Date }).playedAt : null,
      totals,
      previous,
      daily,
      streak,
      heatmap,
      activityByHour: hourTotals.map((plays, hour) => ({ hour, plays })),
      sessions: {
        count: sessions.count,
        avgMs: sessions.avgMs,
        longest: sessions.longest,
        capped: sessionDocs.length >= SESSION_DOCS_CAP,
      },
      discoveries,
      recent: recent.map((r) => ({
        title: r.title,
        artist: r.artist,
        albumImageUrl: r.albumImageUrl,
        playedAt: r.playedAt,
        msPlayed: r.msPlayed,
      })),
      topTracks: topTracks.map((t) => ({
        title: t._id.title,
        artist: t._id.artist,
        albumImageUrl: t.albumImageUrl,
        plays: t.plays,
        msPlayed: t.msPlayed,
        lastPlayedAt: t.lastPlayedAt,
      })),
      topArtists: topArtists.map((a) => ({
        artist: a._id,
        albumImageUrl: a.albumImageUrl,
        plays: a.plays,
        msPlayed: a.msPlayed,
        distinctTracks: a.distinctTracks,
      })),
    });
  } catch (error) {
    console.error("Erreur GET listening-history:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
