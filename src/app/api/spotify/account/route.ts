import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { getSpotifyAccountName } from "@/lib/spotify-account";

export const dynamic = "force-dynamic";

// GET : nom du compte Spotify relié à l'utilisateur connecté, pour afficher « Connecté en tant que… » sur la page Spotify.
// Renvoie `name: null` si le compte n'est pas relié ou si Spotify ne répond pas : l'interface s'en passe simplement.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (!user.spotifyRefreshToken) {
    return NextResponse.json({ connected: false, name: null });
  }

  const name = await getSpotifyAccountName(user);
  return NextResponse.json({ connected: true, name });
}
