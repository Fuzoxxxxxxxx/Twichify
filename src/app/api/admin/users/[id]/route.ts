import { NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/models/User";
import { requirePermission } from "@/lib/auth-helpers";
import { ALL_ROLES, canActOn, canAssignRole, ROLE_LABELS, PERMISSIONS } from "@/lib/roles";
import { deleteUserData } from "@/lib/account-data";
import { logAudit } from "@/lib/audit";

// PATCH : change le rôle d'un utilisateur, selon la hiérarchie stricte
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_ROLES);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { id } = await params;
    const { role } = await req.json();

    if (!ALL_ROLES.includes(role)) {
      return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
    }

    // Auto-protection : impossible de modifier son propre rôle
    if (id === staff._id.toString()) {
      return NextResponse.json(
        { error: "Tu ne peux pas modifier ton propre rôle." },
        { status: 400 }
      );
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const target = await User.findById(id);
    if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    // Impossible d'agir sur un membre de niveau supérieur ou égal au sien
    if (!canActOn(staff.role, target.role)) {
      return NextResponse.json(
        { error: `Tu ne peux pas modifier un membre de niveau égal ou supérieur (${ROLE_LABELS[target.role] || target.role}).` },
        { status: 403 }
      );
    }

    // Impossible d'attribuer un rôle supérieur ou égal à son propre niveau
    if (!canAssignRole(staff.role, role)) {
      return NextResponse.json(
        { error: `Tu ne peux pas attribuer un rôle égal ou supérieur au tien (${ROLE_LABELS[role] || role}).` },
        { status: 403 }
      );
    }

    const previousRole = target.role || "user";
    target.role = role;
    await target.save();

    await logAudit({
      actor: staff,
      action: "role.change",
      target: { id, name: target.name },
      details: `${ROLE_LABELS[previousRole] || previousRole} → ${ROLE_LABELS[role] || role}`,
    });

    return NextResponse.json({ success: true, role: target.role });
  } catch (error) {
    console.error("Erreur PATCH admin user:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE : supprime définitivement un compte utilisateur, selon la hiérarchie stricte
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission(PERMISSIONS.DELETE_USERS);
  if (!staff) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { id } = await params;

    // Auto-protection : impossible de supprimer son propre compte depuis cette interface
    if (id === staff._id.toString()) {
      return NextResponse.json(
        { error: "Tu ne peux pas supprimer ton propre compte depuis cette interface." },
        { status: 400 }
      );
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const target = await User.findById(id);
    if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    // Impossible de supprimer un membre de niveau supérieur ou égal au sien
    if (!canActOn(staff.role, target.role)) {
      return NextResponse.json(
        { error: `Tu ne peux pas supprimer un membre de niveau égal ou supérieur (${ROLE_LABELS[target.role] || target.role}).` },
        { status: 403 }
      );
    }

    const deletedName = target.name;
    const deletedRole = target.role || "user";

    // Purge complète : jeton Twitch, sessions, tickets, idées anonymisées, puis le compte
    await deleteUserData(target);

    await logAudit({
      actor: staff,
      action: "user.delete",
      target: { id, name: deletedName },
      details: `Compte supprimé (rôle : ${ROLE_LABELS[deletedRole] || deletedRole})`,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE admin user:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
