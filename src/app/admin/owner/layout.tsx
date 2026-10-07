import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/admin-guard";
import { PERMISSIONS } from "@/lib/roles";

export const metadata: Metadata = { title: "Admin Propriétaire | Twichify" };

// Réservé au Créateur et aux Co-créateurs (permission ownerZone).
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePagePermission(PERMISSIONS.OWNER_ZONE, "/admin/owner");
  return <>{children}</>;
}
