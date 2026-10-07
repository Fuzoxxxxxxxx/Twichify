import { NextResponse } from "next/server";
import mongoose from "mongoose";
import SupportTicket from "@/models/SupportTicket";
import { getSessionUser } from "@/lib/auth-helpers";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const { subject, category, message } = await req.json();

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Sujet et message requis" }, { status: 400 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const ticket = await SupportTicket.create({
      userId: user._id.toString(),
      userName: user.name,
      subject,
      category: category || "autre",
      status: "en_attente",
      messages: [
        {
          authorId: user._id.toString(),
          authorName: user.name,
          authorRole: "user",
          content: message,
        },
      ],
    });

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Erreur création ticket:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const tickets = await SupportTicket.find({ userId: user._id.toString() }).sort({ updatedAt: -1 });
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Erreur GET tickets:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}