import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { deleteUserData } from "@/lib/account-data";

export const dynamic = "force-dynamic";

// DELETE : supprime définitivement le compte de l'utilisateur connecté et ses données
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch (e) {
    // corps vide ou invalide : traité comme une confirmation manquante
  }

  // Garde-fou côté serveur : la confirmation explicite est exigée même si l'interface la demande déjà
  if (body?.confirm !== "SUPPRIMER") {
    return NextResponse.json({ error: "Confirmation manquante ou incorrecte." }, { status: 400 });
  }

  try {
    await deleteUserData(user);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur suppression du compte:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
