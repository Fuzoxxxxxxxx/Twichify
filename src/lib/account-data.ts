import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import User from "@/models/User";
import SupportTicket from "@/models/SupportTicket";
import Idea from "@/models/Idea";
import TrackHistory from "@/models/TrackHistory";
import FollowerTracking from "@/models/FollowerTracking";
import ChatSession from "@/models/ChatSession";
import { decrypt } from "@/lib/crypto";

// Export et suppression des données d'un utilisateur (RGPD : droit d'accès, de portabilité et d'effacement).

const DELETED_ID = "deleted";
const DELETED_LABEL = "Utilisateur supprimé";

async function ensureDb() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }
}

function safeDecrypt(value: string | null | undefined): string | null {
  try {
    return decrypt(value);
  } catch (e) {
    return null;
  }
}

/**
 * Rassemble toutes les données personnelles d'un utilisateur dans un objet JSON portable.
 * Ne contient jamais de secret : ni Client Secret Spotify, ni refresh token, ni jeton Twitch.
 */
export async function exportUserData(user: any) {
  await ensureDb();
  const userId = user._id.toString();
  const client = await clientPromise;
  const db = client.db();

  const [accounts, ownTickets, staffTickets, ideas, upvoted, downvoted, historyCount, recentHistory] = await Promise.all([
    db.collection("accounts").find({ userId: new ObjectId(userId) }).toArray(),
    SupportTicket.find({ userId }).lean(),
    SupportTicket.find({ "messages.authorId": userId, userId: { $ne: userId } }).lean(),
    Idea.find({ authorId: userId }).lean(),
    Idea.countDocuments({ upvotes: userId }),
    Idea.countDocuments({ downvotes: userId }),
    TrackHistory.countDocuments({ user: userId }),
    TrackHistory.find({ user: userId }, "title artist playedAt msPlayed").sort({ playedAt: -1 }).limit(500).lean(),
  ]);

  const tracking: any = await FollowerTracking.findOne({ user: userId }, "baselineAt scannedAt followers departures").lean();
  const chatSessionsStored = await ChatSession.countDocuments({ user: userId });
  const u = user.toObject();

  return {
    exportedAt: new Date().toISOString(),
    notice:
      "Export de tes données personnelles stockées par Twichify. Les secrets (Client Secret Spotify, refresh token, jetons Twitch) ne sont jamais inclus.",
    account: {
      id: userId,
      name: u.name ?? null,
      email: u.email ?? null,
      image: u.image ?? null,
      role: u.role ?? "user",
      hasAcceptedTerms: !!u.hasAcceptedTerms,
      acceptedTermsAt: u.acceptedTermsAt ?? null,
    },
    linkedAccounts: accounts.map((a: any) => ({
      provider: a.provider,
      providerAccountId: a.providerAccountId,
      type: a.type,
      scope: a.scope ?? null,
    })),
    spotify: {
      connected: !!u.spotifyRefreshToken,
      clientId: safeDecrypt(u.spotifyClientId),
    },
    widgetSettings: u.widgetSettings ?? null,
    chatWidgetSettings: u.chatWidgetSettings ?? null,
    botSettings: u.botSettings ?? null,
    canvasSettings: u.canvasSettings ?? null,
    listeningStats: u.listeningStats ?? null,
    // Historique détaillé : les 500 écoutes les plus récentes (conservé 180 jours au total).
    listeningHistory: {
      totalEntries: historyCount,
      recent: recentHistory.map((h: any) => ({
        title: h.title,
        artist: h.artist,
        playedAt: h.playedAt,
        msPlayed: h.msPlayed,
      })),
    },
    // Suivi des départs de followers (opt-in) : seuls des décomptes sont exportés, la liste elle-même concerne d'autres personnes.
    followerTracking: tracking
      ? {
          enabled: true,
          since: tracking.baselineAt ?? null,
          lastScanAt: tracking.scannedAt ?? null,
          trackedFollowers: (tracking.followers || []).length,
          departuresRecorded: (tracking.departures || []).length,
        }
      : { enabled: false },
    // Statistiques de chat (opt-in) : seuls des décomptes sont exportés, les classements concernent d'autres personnes.
    chatStats: {
      enabled: !!u.chatStats?.enabled,
      enabledAt: u.chatStats?.enabledAt ?? null,
      sessionsStored: chatSessionsStored,
      retentionDays: 90,
    },
    supportTickets: ownTickets.map((t: any) => ({
      id: t._id.toString(),
      subject: t.subject,
      category: t.category,
      status: t.status,
      createdAt: t.createdAt,
      messages: (t.messages || []).map((m: any) => ({
        author: m.authorName,
        role: m.authorRole,
        content: m.content,
        createdAt: m.createdAt,
      })),
    })),
    // Messages écrits dans les tickets d'autres personnes (cas du staff)
    supportRepliesWritten: staffTickets.flatMap((t: any) =>
      (t.messages || [])
        .filter((m: any) => m.authorId === userId)
        .map((m: any) => ({ ticketId: t._id.toString(), content: m.content, createdAt: m.createdAt }))
    ),
    ideas: ideas.map((i: any) => ({
      title: i.title,
      description: i.description,
      category: i.category,
      status: i.status,
      createdAt: i.createdAt,
      upvotes: (i.upvotes || []).length,
      downvotes: (i.downvotes || []).length,
    })),
    votesCast: { upvoted, downvoted },
  };
}

/**
 * Supprime définitivement le compte et les données associées :
 *  - jeton Twitch révoqué (au mieux), comptes liés et sessions supprimés ;
 *  - tickets de support supprimés ;
 *  - idées conservées mais anonymisées, votes retirés ;
 *  - le document utilisateur (réglages, jetons Spotify chiffrés, statistiques) supprimé en dernier,
 *    pour qu'une suppression interrompue puisse être relancée.
 */
export async function deleteUserData(user: any) {
  await ensureDb();
  const userId = user._id.toString();
  const objectId = new ObjectId(userId);
  const client = await clientPromise;
  const db = client.db();

  // 1. Révocation du jeton Twitch (best effort : un échec ne bloque pas la suppression)
  try {
    const twitchAccount = await db.collection("accounts").findOne({ userId: objectId, provider: "twitch" });
    const token = twitchAccount?.access_token;
    if (token && process.env.TWITCH_CLIENT_ID) {
      await fetch("https://id.twitch.tv/oauth2/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: process.env.TWITCH_CLIENT_ID, token }),
        signal: AbortSignal.timeout(4000),
      });
    }
  } catch (error) {
    console.error("Révocation du jeton Twitch impossible :", error);
  }

  // 2. Tickets de support : supprimés
  await SupportTicket.deleteMany({ userId });

  // Messages écrits par l'utilisateur dans les tickets d'autres personnes (staff) : anonymisés
  await SupportTicket.updateMany(
    { "messages.authorId": userId },
    { $set: { "messages.$[m].authorId": DELETED_ID, "messages.$[m].authorName": DELETED_LABEL } },
    { arrayFilters: [{ "m.authorId": userId }] }
  );

  // Tickets pris en charge par l'utilisateur : libérés et remis en file d'attente
  await SupportTicket.updateMany(
    { "assignedTo.userId": userId, status: "en_cours" },
    { $set: { status: "en_attente" } }
  );
  await SupportTicket.updateMany(
    { "assignedTo.userId": userId },
    {
      $set: {
        "assignedTo.userId": null,
        "assignedTo.userName": null,
        "assignedTo.role": null,
        "assignedTo.assignedAt": null,
      },
    }
  );

  // 3. Idées : conservées (elles appartiennent aussi à la communauté) mais anonymisées, votes retirés
  await Idea.updateMany({ authorId: userId }, { $set: { authorId: DELETED_ID, authorName: DELETED_LABEL } });
  await Idea.updateMany(
    { $or: [{ upvotes: userId }, { downvotes: userId }] },
    { $pull: { upvotes: userId, downvotes: userId } }
  );

  // 3bis. Historique d'écoute détaillé : supprimé avec le reste des données personnelles
  await TrackHistory.deleteMany({ user: userId });

  // 3ter. Suivi des départs de followers : instantané et historique supprimés
  await FollowerTracking.deleteMany({ user: userId });

  // 3quater. Statistiques de chat : sessions enregistrées supprimées
  await ChatSession.deleteMany({ user: userId });

  // 4. Données d'authentification (adapter NextAuth)
  await db.collection("sessions").deleteMany({ userId: objectId });
  await db.collection("accounts").deleteMany({ userId: objectId });
  if (user.email) {
    await db.collection("verification_tokens").deleteMany({ identifier: user.email });
  }

  // 5. Le compte lui-même, en dernier
  await User.findByIdAndDelete(userId);
}

/** Liste les sessions actives d'un utilisateur (adaptateur NextAuth, stratégie "database"). */
export async function listActiveSessions(user: any, currentToken?: string) {
  await ensureDb();
  const client = await clientPromise;
  const db = client.db();

  const sessions = await db
    .collection("sessions")
    .find({ userId: new ObjectId(user._id.toString()), expires: { $gt: new Date() } })
    .sort({ expires: -1 })
    .toArray();

  return sessions.map((s: any) => ({
    id: s._id.toString(),
    isCurrent: !!currentToken && s.sessionToken === currentToken,
    expires: s.expires,
    userAgent: s.userAgent ?? null,
    lastSeenAt: s.lastSeenAt ?? null,
  }));
}

/** Supprime une session précise de l'utilisateur, par son _id (vérifie qu'elle lui appartient). */
export async function revokeSession(user: any, sessionId: string) {
  await ensureDb();
  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection("sessions").deleteOne({
    _id: new ObjectId(sessionId),
    userId: new ObjectId(user._id.toString()),
  });

  return result.deletedCount > 0;
}

/** Résumé léger de ce que Twichify conserve (affiché sur la page « Compte & données »). */
export async function getDataSummary(user: any) {
  await ensureDb();
  const userId = user._id.toString();

  const [tickets, ideas, upvoted, downvoted] = await Promise.all([
    SupportTicket.countDocuments({ userId }),
    Idea.countDocuments({ authorId: userId }),
    Idea.countDocuments({ upvotes: userId }),
    Idea.countDocuments({ downvotes: userId }),
  ]);

  const stats = user.listeningStats || {};

  return {
    name: user.name ?? null,
    email: user.email ?? null,
    image: user.image ?? null,
    role: user.role || "user",
    acceptedTermsAt: user.acceptedTermsAt ?? null,
    spotifyConnected: !!user.spotifyRefreshToken,
    tickets,
    ideas,
    upvoted,
    downvoted,
    listening: {
      totalMs: stats.totalMsListened || 0,
      totalTracks: stats.totalTracksPlayed || 0,
      lastTrack: stats.lastTrack?.title
        ? { title: stats.lastTrack.title as string, artist: (stats.lastTrack.artist || "") as string }
        : null,
    },
  };
}
