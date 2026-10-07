import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { headers } from "next/headers";
import mongoose from "mongoose";
import User from "@/models/User";
import { isStaffRole, hasPermission, Permission } from "@/lib/roles";
import { getCurrentSessionToken } from "@/lib/session-cookie";
import clientPromise from "@/lib/mongodb";

const SESSION_TOUCH_INTERVAL_MS = 60 * 60 * 1000; // 1h : évite d'écrire en base à chaque requête

/**
 * Enregistre le User-Agent et la dernière activité de la session en cours, pour que la page
 * Compte puisse afficher « Chrome sur Windows » plutôt que « Autre appareil ». La condition
 * de fraîcheur est dans le filtre de la requête elle-même (pas de lecture préalable) : les
 * appels situés dans l'heure suivant le dernier enregistrement ne déclenchent aucune écriture.
 * Best-effort : une erreur ici ne doit jamais casser l'authentification.
 */
async function touchCurrentSession() {
  try {
    const token = await getCurrentSessionToken();
    if (!token) return;

    const ua = (await headers()).get("user-agent") || "";
    const staleBefore = new Date(Date.now() - SESSION_TOUCH_INTERVAL_MS);

    const client = await clientPromise;
    await client
      .db()
      .collection("sessions")
      .updateOne(
        {
          sessionToken: token,
          $or: [{ lastSeenAt: { $exists: false } }, { lastSeenAt: { $lt: staleBefore } }],
        },
        { $set: { userAgent: ua, lastSeenAt: new Date() } }
      );
  } catch (e) {
    // best effort : ne bloque jamais une requête authentifiée pour ça
  }
}

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }

  const user = await User.findOne({ email: session.user.email });
  if (user) await touchCurrentSession();
  return user;
}

export async function requireStaff() {
  const user = await getSessionUser();
  if (!user || !isStaffRole(user.role)) {
    return null;
  }
  return user;
}

/** Comme requireStaff, mais exige une permission précise plutôt qu'un simple niveau de staff. */
export async function requirePermission(permission: Permission) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.role, permission)) {
    return null;
  }
  return user;
}