import { NextResponse } from "next/server";
import mongoose from "mongoose";
import SupportTicket from "@/models/SupportTicket";
import { requirePermission } from "@/lib/auth-helpers";
import { PERMISSIONS } from "@/lib/roles";

export async function GET() {
  const staff = await requirePermission(PERMISSIONS.MANAGE_TICKETS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const tickets = await SupportTicket.find().sort({ updatedAt: -1 });
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Erreur GET tickets admin:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}