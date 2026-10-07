import { cookies } from "next/headers";

// Noms de cookie possibles selon l'environnement (NextAuth v4, stratégie "database")
const COOKIE_NAMES = ["__Secure-next-auth.session-token", "next-auth.session-token"];

/** Retrouve le jeton de session NextAuth de la requête en cours, s'il existe. */
export async function getCurrentSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  for (const name of COOKIE_NAMES) {
    const value = cookieStore.get(name)?.value;
    if (value) return value;
  }
  return undefined;
}
