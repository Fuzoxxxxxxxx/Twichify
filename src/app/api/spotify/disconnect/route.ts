import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import User from "@/models/User";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Connexion à MongoDB avec Mongoose
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI as string);
    }

    // Suppression des tokens Spotify dans MongoDB
    await User.findByIdAndUpdate(session.user.id, {
      $unset: {
        spotifyAccessToken: "",
        spotifyRefreshToken: "",
        spotifyTokenExpiresAt: "",
      },
    });

    return NextResponse.json({ success: true, message: "Compte Spotify déconnecté" });
  } catch (error) {
    console.error("Erreur déconnexion Spotify:", error);
    return NextResponse.json(
      { error: "Erreur lors de la déconnexion" },
      { status: 500 }
    );
  }
}