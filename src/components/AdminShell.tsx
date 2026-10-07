"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Music, LayoutGrid, LifeBuoy, HelpCircle, Users, ArrowLeft, Shield, Database, Lightbulb, Crown, Activity, type LucideIcon,
} from "lucide-react";
import { hasPermission, PERMISSIONS, Permission } from "@/lib/roles";

type NavItem = {
  href: string;
  label: string;
  short?: string;
  icon: LucideIcon;
  exact: boolean;
  permission: Permission | null;
};
type NavGroup = { label: string | null; items: NavItem[] };

// Navigation admin regroupée par catégories (même logique que le dashboard utilisateur).
// `short` = libellé court de la barre mobile. Une catégorie sans aucun accès visible est masquée.
const navGroups: NavGroup[] = [
  {
    label: null,
    items: [{ href: "/admin", label: "Accueil", icon: LayoutGrid, exact: true, permission: null }],
  },
  {
    label: "Support",
    items: [
      { href: "/admin/tickets", label: "Tickets", icon: LifeBuoy, exact: false, permission: PERMISSIONS.MANAGE_TICKETS },
      { href: "/admin/faq", label: "FAQ", icon: HelpCircle, exact: false, permission: PERMISSIONS.MANAGE_FAQ },
    ],
  },
  {
    label: "Communauté",
    items: [{ href: "/admin/ideas", label: "Idées", icon: Lightbulb, exact: false, permission: PERMISSIONS.MANAGE_IDEAS }],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/users", label: "Utilisateurs", short: "Comptes", icon: Users, exact: false, permission: PERMISSIONS.VIEW_USERS },
      { href: "/admin/status", label: "Statut", icon: Activity, exact: false, permission: PERMISSIONS.MANAGE_STATUS },
      { href: "/admin/owner", label: "Propriétaire", short: "Proprio", icon: Crown, exact: false, permission: PERMISSIONS.OWNER_ZONE },
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

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || hasPermission(myRole, item.permission)),
    }))
    .filter((group) => group.items.length > 0);
  // Liste à plat pour la barre mobile (pas de titres de catégories).
  const visibleNavItems = visibleGroups.flatMap((group) => group.items);

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

  return (
    <main className="min-h-screen bg-[#08090b] text-white font-sans selection:bg-purple-500/30 flex">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[500px] bg-gradient-to-tr from-purple-600/15 via-indigo-500/10 to-emerald-500/10 blur-[180px] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e10_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e10_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_20%_0%,#000_60%,transparent_100%)] -z-10" />

      {/* SIDEBAR — desktop */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-white/5 bg-zinc-950/40 backdrop-blur-xl flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-3 font-black text-lg tracking-wider">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Music size={20} />
            </div>
            <span className="bg-gradient-to-r from-white via-zinc-200 to-purple-400 bg-clip-text text-transparent">
              Twichify
            </span>
          </Link>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-purple-300">
            <Shield size={10} />
            Panneau Admin
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto p-4">
          {visibleGroups.map((group) => (
            <div key={group.label ?? "main"} className="space-y-1">
              {group.label && (
                <p className="px-4 pb-1 text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600">{group.label}</p>
              )}
              {group.items.map(({ href, label, icon: Icon, exact }) => {
                const isActive = exact ? pathname === href : pathname?.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-purple-600/20 to-indigo-600/10 text-white"
                        : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-gradient-to-b from-purple-400 to-indigo-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]" />
                    )}
                    <Icon size={16} className={isActive ? "text-purple-400" : ""} />
                    {label}
                    {href === "/admin/tickets" && pendingCount > 0 && (
                      <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-black">
                        {pendingCount}
                      </span>
                    )}
                    {href === "/admin/ideas" && ideaPendingCount > 0 && (
                      <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-black">
                        {ideaPendingCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all"
          >
            <ArrowLeft size={16} />
            Retour Dashboard
          </Link>
        </div>
      </aside>

      {/* NAV — mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-zinc-950/90 backdrop-blur-xl px-2 py-2 flex items-center justify-around">
        {visibleNavItems.map(({ href, label, short, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[9px] font-bold uppercase tracking-wider transition-all ${
                isActive ? "text-purple-400" : "text-zinc-600"
              }`}
            >
              <Icon size={18} />
              {short ?? label}
              {href === "/admin/tickets" && pendingCount > 0 && (
                <span className="absolute -top-0.5 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-500 px-1 text-[8px] font-black text-black">
                  {pendingCount}
                </span>
              )}
              {href === "/admin/ideas" && ideaPendingCount > 0 && (
                <span className="absolute -top-0.5 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-500 px-1 text-[8px] font-black text-black">
                  {ideaPendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      
      {/* CONTENU */}
      <div className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto px-6 md:px-8 py-8 md:py-10 pb-24 md:pb-10">
          {children}
        </div>
      </div>
    </main>
  );
}
