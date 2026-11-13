import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import User from "@/models/User";
import SupportTicket from "@/models/SupportTicket";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth-helpers";
import { hasPermission, PERMISSIONS } from "@/lib/roles";

export const dynamic = "force-dynamic";

// Fiche en lecture seule d'un utilisateur (GET /api/admin/users?id=...), pour comprendre un problème sans jongler entre
// plusieurs pages. Ne renvoie jamais de secret (identifiants Spotify, jetons) : seulement des états et des dates.
// Les tickets ne sont renvoyés qu'à un staff qui a la permission de les gérer.
async function getUserProfile(id: string, staffRole: string) {
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  const user: any = await User.findById(id)
    .select("name email image role hasAcceptedTerms acceptedTermsAt spotifyClientId spotifyRefreshToken widgetSeen chatStats")
    .lean();
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  // Sessions encore valides : leur dernière activité (enregistrée au plus une fois par heure) donne la dernière visite.
  const client = await clientPromise;
  const sessions = await client
    .db()
    .collection("sessions")
    .find({ userId: new ObjectId(id), expires: { $gt: new Date() } })
    .project({ lastSeenAt: 1 })
    .toArray();
  const seen = sessions.map((s: any) => (s.lastSeenAt ? new Date(s.lastSeenAt).getTime() : 0)).filter(Boolean);
  const lastActivityAt = seen.length > 0 ? new Date(Math.max(...seen)) : null;

  const tickets = hasPermission(staffRole, PERMISSIONS.MANAGE_TICKETS)
    ? (
        await SupportTicket.find({ userId: id })
          .select("subject status category updatedAt")
          .sort({ updatedAt: -1 })
          .limit(10)
          .lean()
      ).map((t: any) => ({
        _id: String(t._id),
        subject: t.subject,
        status: t.status,
        category: t.category,
        updatedAt: t.updatedAt,
      }))
    : null;

  return NextResponse.json({
    profile: {
      id,
      name: user.name ?? null,
      email: user.email ?? null,
      image: user.image ?? null,
      role: user.role || "user",
      createdAt: user._id.getTimestamp(),
      hasAcceptedTerms: !!user.hasAcceptedTerms,
      acceptedTermsAt: user.acceptedTermsAt ?? null,
      lastActivityAt,
      activeSessions: sessions.length,
      spotify: { credentialsSet: !!user.spotifyClientId, connected: !!user.spotifyRefreshToken },
      widgets: { musicSeenAt: user.widgetSeen?.musicAt ?? null, chatSeenAt: user.widgetSeen?.chatAt ?? null },
      chatStatsEnabled: !!user.chatStats?.enabled,
    },
    tickets,
  });
}

// GET : liste des utilisateurs enregistrés (accessible au staff ayant la permission viewUsers).
// Avec `?id=...`, renvoie à la place la fiche d'un seul utilisateur.
export async function GET(req: Request) {
  const staff = await requirePermission(PERMISSIONS.VIEW_USERS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const profileId = new URL(req.url).searchParams.get("id");
    if (profileId) return await getUserProfile(profileId, staff.role);

    // On ne renvoie jamais les identifiants Spotify (même chiffrés) au client
    const users = await User.find(
      {},
      "name email image role spotifyRefreshToken hasAcceptedTerms desktopPaired createdAt"
    ).sort({ _id: -1 });

    const sanitized = users.map((u) => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      image: u.image,
      role: u.role || "user",
      hasSpotifyToken: !!u.spotifyRefreshToken,
      hasAcceptedTerms: !!u.hasAcceptedTerms,
      // L'ObjectId Mongo encode sa date de création : pas besoin d'un champ dédié.
      createdAt: u._id.getTimestamp(),
    }));

    return NextResponse.json({ users: sanitized });
  } catch (error) {
    console.error("Erreur GET admin users:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
