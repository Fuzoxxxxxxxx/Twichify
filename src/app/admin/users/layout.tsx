import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/admin-guard";
import { PERMISSIONS } from "@/lib/roles";

export const metadata: Metadata = { title: "Admin Utilisateurs | Twichify" };

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePagePermission(PERMISSIONS.VIEW_USERS, "/admin/users");
  return <>{children}</>;
}
