import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-helpers";
import { hasPermission, PERMISSIONS, type Permission } from "@/lib/roles";

/**
 * Garde côté serveur pour les pages admin : redirige vers la page 403 si
 * l'utilisateur n'est pas connecté ou n'a pas la permission demandée.
 * `from` = page demandée : la 403 l'affiche et y renvoie après connexion.
 * À appeler dans un layout/page serveur (les API vérifient déjà de leur côté).
 */
export async function requirePagePermission(
  permission: Permission = PERMISSIONS.VIEW_ADMIN_PANEL,
  from?: string,
) {
  const user = await getSessionUser();

  if (!user || !hasPermission(user.role, permission)) {
    redirect(from ? `/403?from=${encodeURIComponent(from)}` : "/403");
  }

  return user;
}
