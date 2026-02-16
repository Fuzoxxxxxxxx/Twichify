import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import mongoose from "mongoose";
import User from "@/models/User";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { accentColor, borderRadius, bgOpacity } = await req.json();

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    await User.findOneAndUpdate(
      { email: session.user?.email },
      { 
        $set: { 
          "widgetSettings.accentColor": accentColor,
          "widgetSettings.borderRadius": borderRadius,
          "widgetSettings.bgOpacity": bgOpacity 
        } 
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}