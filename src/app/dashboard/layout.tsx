import type { Metadata } from "next";
import DashboardShell from "@/components/DashboardShell";

// Titre par défaut = page "Accueil" du dashboard ; chaque sous-page le remplace via son propre layout.
export const metadata: Metadata = {
  title: "Dashboard | Twichify",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
