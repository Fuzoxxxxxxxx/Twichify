import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { revokeSession } from "@/lib/account-data";
import { getCurrentSessionToken } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

// DELETE : révoque une session précise de l'utilisateur connecté (jamais celle d'un autre compte)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  try {
    const ok = await revokeSession(user, id);
    if (!ok) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur révocation session:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
