import { redirect } from "next/navigation";

/**
 * Aiguillage des erreurs de connexion NextAuth.
 *
 * NextAuth v4 renvoie certaines erreurs (dont OAuthAccountNotLinked) vers la page de connexion
 * (`/api/auth/signin?error=...`) et non vers `pages.error`. On déclare cette route dans `pages.signIn`
 * (voir api/auth/[...nextauth]/route.ts) pour choisir la bonne page :
 *
 * - OAuthAccountNotLinked → /auth/not-linked (un compte existe déjà avec cet e-mail, créé avec un autre compte Twitch)
 * - toute autre erreur    → /auth/cancelled (comportement habituel)
 * - aucune erreur         → accueil, où se trouve le bouton « Se connecter avec Twitch »
 *
 * `signIn("twitch")` côté client part directement chez Twitch : il ne passe pas par cette page.
 */
export default async function SignInRouter({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error } = await searchParams;
  const code = Array.isArray(error) ? error[0] : error;

  if (code === "OAuthAccountNotLinked") redirect("/auth/not-linked");
  if (code) redirect("/auth/cancelled");
  redirect("/");
}
