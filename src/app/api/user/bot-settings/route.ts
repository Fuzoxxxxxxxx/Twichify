import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import mongoose from "mongoose";
import User from "@/models/User";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { customMessage } = await req.json();
    const message = String(customMessage ?? "").trim() || "Now playing: {artist} - {title}";

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    await User.findOneAndUpdate(
      { email: session.user.email },
      { $set: { "botSettings.customMessage": message } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, customMessage: message });
  } catch (error) {
    console.error("Erreur API bot settings:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
