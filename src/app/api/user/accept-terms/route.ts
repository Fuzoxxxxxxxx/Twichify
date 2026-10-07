import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import mongoose from "mongoose";
import User from "@/models/User";
import { TERMS_CHANGES, TERMS_REVISED_AT, TERMS_REVISED_LABEL, hasAcceptedCurrentTerms } from "@/lib/terms";

// GET : indique si l'utilisateur connecté a accepté les CGU EN VIGUEUR (dernière révision matérielle, voir lib/terms).
//  - hasAcceptedTerms : false s'il n'a jamais accepté, ou s'il a accepté avant la dernière révision ;
//  - isUpdate : true dans le second cas (la fenêtre affiche alors ce qui a changé).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }

  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  const acceptedAt: Date | null = user.acceptedTermsAt ? new Date(user.acceptedTermsAt) : null;
  const upToDate = hasAcceptedCurrentTerms(acceptedAt);
  const isUpdate = !!acceptedAt && !upToDate;

  return NextResponse.json({
    hasAcceptedTerms: upToDate,
    acceptedTermsAt: acceptedAt,
    isUpdate,
    revisedAt: TERMS_REVISED_AT.toISOString(),
    revisedLabel: TERMS_REVISED_LABEL,
    changes: isUpdate ? TERMS_CHANGES : [],
  });
}

// POST : Enregistre la date d'acceptation actuelle dans l'utilisateur
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }

  const updatedUser = await User.findOneAndUpdate(
    { email: session.user.email },
    { acceptedTermsAt: new Date() },
    { new: true }
  );

  if (!updatedUser) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    acceptedTermsAt: updatedUser.acceptedTermsAt,
  });
}