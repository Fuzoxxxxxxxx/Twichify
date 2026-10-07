import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getSessionUser } from "@/lib/auth-helpers";
import { getCurrentSessionToken } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

// POST : déconnecte toutes les sessions de l'utilisateur SAUF celle utilisée pour cet appel
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const currentToken = await getCurrentSessionToken();

    const client = await clientPromise;
    const db = client.db();

    const filter: any = { userId: new ObjectId(user._id.toString()) };
    if (currentToken) filter.sessionToken = { $ne: currentToken };

    const result = await db.collection("sessions").deleteMany(filter);

    return NextResponse.json({ success: true, revoked: result.deletedCount ?? 0 });
  } catch (error) {
    console.error("Erreur révocation des sessions:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
