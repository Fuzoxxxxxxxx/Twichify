import { NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/models/User";
import { requirePermission } from "@/lib/auth-helpers";
import { ALL_ROLES, hasPermission, PERMISSIONS } from "@/lib/roles";

export const dynamic = "force-dynamic";

// GET : membres du staff pouvant prendre en charge un ticket (permission manageTickets), hors l'appelant.
// Sert à choisir le destinataire d'un transfert.
export async function GET() {
  const staff = await requirePermission(PERMISSIONS.MANAGE_TICKETS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const roles = ALL_ROLES.filter((r) => hasPermission(r, PERMISSIONS.MANAGE_TICKETS));
    const users = await User.find({ role: { $in: roles }, _id: { $ne: staff._id } }, "name image role")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      staff: users.map((u: any) => ({
        id: String(u._id),
        name: u.name || "Sans nom",
        image: u.image ?? null,
        role: u.role,
      })),
    });
  } catch (error) {
    console.error("Erreur GET staff support:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
