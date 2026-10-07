export const ROLE_LEVELS: Record<string, number> = {
  creator: 5,
  co_creator: 4,
  admin: 3,
  moderator: 2,
  helper: 1,
  user: 0,
};

export const ALL_ROLES = ["creator", "co_creator", "admin", "moderator", "helper", "user"] as const;
export type Role = (typeof ALL_ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  creator: "Créateur",
  co_creator: "Co-créateur",
  admin: "Admin",
  moderator: "Modérateur",
  helper: "Assistant",
  user: "Utilisateur",
};

/** Niveau numérique d'un rôle. Rôle inconnu/absent => niveau 0 (User). */
export function getRoleLevel(role?: string | null): number {
  return ROLE_LEVELS[role || "user"] ?? 0;
}

/** Un membre du "staff" est tout rôle avec un niveau >= 1 (Helper et au-dessus). */
export function isStaffRole(role?: string | null): boolean {
  return getRoleLevel(role) >= 1;
}

/**
 * Un acteur peut agir (modifier/supprimer) sur une cible seulement si son niveau
 * est STRICTEMENT supérieur à celui de la cible. Égal ou inférieur => refusé.
 */
export function canActOn(actorRole?: string | null, targetRole?: string | null): boolean {
  return getRoleLevel(actorRole) > getRoleLevel(targetRole);
}

/**
 * Un acteur peut attribuer un rôle seulement si ce rôle est STRICTEMENT
 * inférieur à son propre niveau (jamais égal ni supérieur).
 */
export function canAssignRole(actorRole?: string | null, roleToAssign?: string | null): boolean {
  return getRoleLevel(roleToAssign) < getRoleLevel(actorRole);
}

/** Liste des rôles qu'un acteur a le droit d'attribuer (pour peupler un <select>). */
export function assignableRoles(actorRole?: string | null): Role[] {
  const actorLevel = getRoleLevel(actorRole);
  return ALL_ROLES.filter((r) => ROLE_LEVELS[r] < actorLevel);
}

/* ==========================================================================
   PERMISSIONS — chaque rôle dispose d'un ensemble précis d'actions autorisées,
   indépendamment de la hiérarchie de niveaux ci-dessus (qui régit qui peut
   agir sur qui). Les permissions régissent, elles, l'accès aux fonctionnalités.
   ========================================================================== */

export const PERMISSIONS = {
  VIEW_ADMIN_PANEL: "viewAdminPanel",
  MANAGE_TICKETS: "manageTickets",
  MANAGE_FAQ: "manageFaq",
  VIEW_USERS: "viewUsers",
  MANAGE_ROLES: "manageRoles",
  DELETE_USERS: "deleteUsers",
  MANAGE_IDEAS: "manageIdeas",
  OWNER_ZONE: "ownerZone",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_LABELS: Record<Permission, string> = {
  viewAdminPanel: "Accès au panneau admin",
  manageTickets: "Gérer les tickets support",
  manageFaq: "Gérer la FAQ",
  viewUsers: "Voir la liste des utilisateurs",
  manageRoles: "Modifier les rôles",
  deleteUsers: "Supprimer des comptes",
  manageIdeas: "Gérer la boîte à idées",
  ownerZone: "Espace propriétaire",
};

/**
 * Matrice des permissions par rôle. Chaque rôle a son propre ensemble
 * d'actions autorisées — modifie cette table pour ajuster les droits.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  user: [],
  helper: [PERMISSIONS.VIEW_ADMIN_PANEL, PERMISSIONS.MANAGE_TICKETS],
  moderator: [
    PERMISSIONS.VIEW_ADMIN_PANEL,
    PERMISSIONS.MANAGE_TICKETS,
    PERMISSIONS.MANAGE_FAQ,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_IDEAS,
  ],
  admin: [
    PERMISSIONS.VIEW_ADMIN_PANEL,
    PERMISSIONS.MANAGE_TICKETS,
    PERMISSIONS.MANAGE_FAQ,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.MANAGE_IDEAS,
  ],
  co_creator: [
    PERMISSIONS.VIEW_ADMIN_PANEL,
    PERMISSIONS.MANAGE_TICKETS,
    PERMISSIONS.MANAGE_FAQ,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.DELETE_USERS,
    PERMISSIONS.MANAGE_IDEAS,
    PERMISSIONS.OWNER_ZONE,
  ],
  creator: [
    PERMISSIONS.VIEW_ADMIN_PANEL,
    PERMISSIONS.MANAGE_TICKETS,
    PERMISSIONS.MANAGE_FAQ,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.DELETE_USERS,
    PERMISSIONS.MANAGE_IDEAS,
    PERMISSIONS.OWNER_ZONE,
  ],
};

/** Vérifie si un rôle dispose d'une permission précise. */
export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[(role as Role) || "user"];
  return !!perms?.includes(permission);
}

/** Liste des permissions d'un rôle donné (pour affichage/debug). */
export function getRolePermissions(role?: string | null): Permission[] {
  return ROLE_PERMISSIONS[(role as Role) || "user"] || [];
}
