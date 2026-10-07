import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { exportUserData } from "@/lib/account-data";

export const dynamic = "force-dynamic";

// GET : télécharge toutes les données personnelles de l'utilisateur connecté (JSON)
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const data = await exportUserData(user);
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="twichify-donnees-${date}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erreur export des données:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
