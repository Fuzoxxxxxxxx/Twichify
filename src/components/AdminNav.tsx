"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, LifeBuoy, HelpCircle, Users } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutGrid, exact: true },
  { href: "/admin/tickets", label: "Tickets", icon: LifeBuoy, exact: false },
  { href: "/admin/faq", label: "FAQ", icon: HelpCircle, exact: false },
  { href: "/admin/users", label: "Données", icon: Users, exact: false },
];

export default function AdminNav() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin/tickets")
      .then((r) => (r.ok ? r.json() : { tickets: [] }))
      .then((data) => {
        const count = (data.tickets || []).filter((t: any) => t.status === "en_attente").length;
        setPendingCount(count);
      })
      .catch(() => setPendingCount(0));
  }, []);

  return (
    <div className="flex items-center gap-1.5 mb-8 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-1.5 backdrop-blur-xl w-fit">
      {navItems.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all duration-200 ${
              isActive
                ? "bg-purple-600/20 border border-purple-500/50 text-purple-300 shadow-sm"
                : "border border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
            }`}
          >
            <Icon size={13} />
            {label}
            {href === "/admin/tickets" && pendingCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-black">
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
