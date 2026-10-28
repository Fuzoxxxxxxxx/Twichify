import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/admin-guard";
import { PERMISSIONS } from "@/lib/roles";

export const metadata: Metadata = { title: "Admin Annonces | Twichify" };

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePagePermission(PERMISSIONS.OWNER_ZONE, "/admin/announcements");
  return <>{children}</>;
}
