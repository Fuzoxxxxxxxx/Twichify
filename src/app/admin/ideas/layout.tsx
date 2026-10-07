import type { Metadata } from "next";
import { requirePagePermission } from "@/lib/admin-guard";
import { PERMISSIONS } from "@/lib/roles";

export const metadata: Metadata = { title: "Admin Idées | Twichify" };

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePagePermission(PERMISSIONS.MANAGE_IDEAS, "/admin/ideas");
  return <>{children}</>;
}
