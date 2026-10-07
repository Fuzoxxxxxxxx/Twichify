import { NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/models/User";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/roles";

// GET : liste des utilisateurs enregistrés (accessible au staff ayant la permission viewUsers)
export async function GET() {
  const staff = await requirePermission(PERMISSIONS.VIEW_USERS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

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
