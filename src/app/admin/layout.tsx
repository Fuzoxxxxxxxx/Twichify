import type { Metadata } from "next";
import AdminShell from "@/components/AdminShell";
import { requirePagePermission } from "@/lib/admin-guard";

// Titre par défaut = page "Accueil" de l'admin ; chaque sous-page le remplace via son propre layout.
export const metadata: Metadata = {
  title: "Admin | Twichify",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Accès au panneau admin : sinon redirection vers /403.
  await requirePagePermission(undefined, "/admin");

  return <AdminShell>{children}</AdminShell>;
}
