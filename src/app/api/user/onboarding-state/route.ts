import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import mongoose from "mongoose";
import User from "@/models/User";

async function connect() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }
}

// GET : état d'onboarding de l'utilisateur connecté (tutoriel d'accueil vu, dernière version
// du changelog vue). Stocké sur le compte, comme acceptedTermsAt, pour survivre à un
// changement de navigateur ou d'appareil.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    await connect();
    const user = await User.findOne(
      { email: session.user.email },
      "hasSeenWelcome seenChangelogVersion"
    );
    if (!user) return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });

    return NextResponse.json({
      hasSeenWelcome: !!user.hasSeenWelcome,
      seenChangelogVersion: user.seenChangelogVersion || null,
    });
  } catch (error) {
    console.error("Erreur GET onboarding-state:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PATCH : met à jour un ou plusieurs champs d'onboarding
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = {};
    if (typeof body?.hasSeenWelcome === "boolean") update.hasSeenWelcome = body.hasSeenWelcome;
    if (typeof body?.seenChangelogVersion === "string") update.seenChangelogVersion = body.seenChangelogVersion;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 });
    }

    await connect();
    // Pas d'option "fields"/"projection" ici : sa clé exacte dépend de la version de
    // Mongoose installée et une clé non reconnue peut faire échouer toute la requête.
    // On relit simplement les deux champs utiles sur le document complet retourné.
    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { $set: update },
      { new: true }
    );
    if (!user) return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });

    return NextResponse.json({
      hasSeenWelcome: !!user.hasSeenWelcome,
      seenChangelogVersion: user.seenChangelogVersion || null,
    });
  } catch (error) {
    console.error("Erreur PATCH onboarding-state:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
