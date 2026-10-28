"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid, LifeBuoy, HelpCircle, Users, ArrowLeft, Shield, Lightbulb, Crown, Activity, BarChart3, Megaphone,
} from "lucide-react";
import { hasPermission, PERMISSIONS, Permission } from "@/lib/roles";
import { SidebarBrand, SidebarNav, MobileNav, type NavGroup, type NavItem } from "@/components/shell/ShellNav";
import NotificationBell from "@/components/notifications/NotificationBell";

type AdminNavItem = NavItem & { permission: Permission | null };
type AdminNavGroup = { label: string | null; items: AdminNavItem[] };

// Navigation admin regroupée par catégories (même logique que le dashboard utilisateur).
// `short` = libellé court de la barre mobile. Une catégorie sans aucun accès visible est masquée.
const navGroups: AdminNavGroup[] = [
  {
    label: null,
    items: [{ href: "/admin", label: "Accueil", icon: LayoutGrid, exact: true, permission: null }],
  },
  {
    label: "Support",
    items: [
      { href: "/admin/tickets", label: "Tickets", icon: LifeBuoy, permission: PERMISSIONS.MANAGE_TICKETS },
      { href: "/admin/support", label: "Statistiques", short: "Stats", icon: BarChart3, permission: PERMISSIONS.MANAGE_TICKETS },
      { href: "/admin/faq", label: "FAQ", icon: HelpCircle, permission: PERMISSIONS.MANAGE_FAQ },
    ],
  },
  {
    label: "Communauté",
    items: [
      { href: "/admin/ideas", label: "Idées", icon: Lightbulb, permission: PERMISSIONS.MANAGE_IDEAS },
      { href: "/admin/announcements", label: "Annonces", icon: Megaphone, permission: PERMISSIONS.OWNER_ZONE },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/users", label: "Utilisateurs", short: "Comptes", icon: Users, permission: PERMISSIONS.VIEW_USERS },
      { href: "/admin/status", label: "Statut", icon: Activity, permission: PERMISSIONS.MANAGE_STATUS },
      { href: "/admin/owner", label: "Propriétaire", short: "Proprio", icon: Crown, permission: PERMISSIONS.OWNER_ZONE },
    ],
  },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [ideaPendingCount, setIdeaPendingCount] = useState(0);
  const [myRole, setMyRole] = useState<string>("user");

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => setMyRole(data.role || "user"))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/admin/tickets")
      .then((r) => (r.ok ? r.json() : { tickets: [] }))
      .then((data) => {
        const count = (data.tickets || []).filter((t: any) => t.status === "en_attente").length;
        setPendingCount(count);
      })
      .catch(() => setPendingCount(0));

    fetch("/api/ideas?status=en_etude")
      .then((r) => (r.ok ? r.json() : { ideas: [] }))
      .then((data) => setIdeaPendingCount((data.ideas || []).length))
      .catch(() => setIdeaPendingCount(0));
  }, [pathname]);

  const badges: Record<string, number> = {
    "/admin/tickets": pendingCount,
    "/admin/ideas": ideaPendingCount,
  };

  // Filtre selon les droits du rôle, ajoute les compteurs, et masque les catégories vides.
  const visibleGroups: NavGroup[] = navGroups
    .map((group) => ({
      label: group.label,
      items: group.items
        .filter((item) => !item.permission || hasPermission(myRole, item.permission))
        .map(({ permission, ...item }) => ({ ...item, badge: badges[item.href] })),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <main className="flex min-h-screen bg-[#08090b] font-sans text-white selection:bg-purple-500/30">
      <div className="pointer-events-none fixed left-1/2 top-0 -z-10 h-[420px] w-[900px] -translate-x-1/2 bg-purple-600/10 blur-[160px]" />

      {/* SIDEBAR — desktop */}
      <aside className="sticky top-0 z-30 hidden h-screen w-64 shrink-0 flex-col border-r border-white/5 bg-zinc-950/40 backdrop-blur-xl md:flex">
        <SidebarBrand
          action={<NotificationBell />}
          tag={
            // Ambre : le seul repère de couleur qui distingue l'admin du dashboard utilisateur, pour ne jamais confondre les deux espaces.
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-200">
              <Shield size={12} />
              Administration
            </span>
          }
        />

        <SidebarNav groups={visibleGroups} pathname={pathname} />

        <div className="border-t border-white/5 p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
          >
            <ArrowLeft size={16} />
            Retour au dashboard
          </Link>
        </div>
      </aside>

      {/* NAV — mobile */}
      <NotificationBell variant="floating" />
      <MobileNav groups={visibleGroups} pathname={pathname} />

      {/* CONTENU */}
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-5xl px-6 py-8 pb-24 md:px-8 md:py-10 md:pb-10">{children}</div>
      </div>
    </main>
  );
}
