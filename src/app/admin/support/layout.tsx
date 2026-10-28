import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/admin-guard";
import { PERMISSIONS } from "@/lib/roles";

export const metadata: Metadata = { title: "Admin Statistiques du support | Twichify" };

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePagePermission(PERMISSIONS.MANAGE_TICKETS, "/admin/support");
  return <>{children}</>;
}
