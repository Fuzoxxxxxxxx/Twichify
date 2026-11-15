"use client";

import { useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Activity, Bell, History, LifeBuoy, Lightbulb, LogOut, Shield, type LucideIcon } from "lucide-react";

// Menu du compte, ouvert depuis le bas de la barre latérale du dashboard. Mêmes liens qu'avant, en texte plus lisible
// (14 px au lieu de 12) et fermable avec Échap.

const ITEM =
  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-200 transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-purple-400";

function MenuLink({
  href,
  label,
  icon: Icon,
  iconClass,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  iconClass: string;
  onNavigate: () => void;
}) {
  return (
    <Link href={href} onClick={onNavigate} className={ITEM}>
      <span>{label}</span>
      <Icon size={15} aria-hidden="true" className={iconClass} />
    </Link>
  );
}

function MenuLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">{children}</p>;
}

export default function ProfileMenu({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="group"
      aria-label="Menu du compte"
      className="absolute bottom-full left-0 z-50 mb-3 w-full min-w-56 rounded-2xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl shadow-black/60 backdrop-blur-xl"
    >
      <MenuLabel>Communauté</MenuLabel>
      <MenuLink href="/ideas" label="Boîte à idées" icon={Lightbulb} iconClass="text-amber-400" onNavigate={onClose} />
      <MenuLink href="/changelog" label="Changelog" icon={History} iconClass="text-blue-400" onNavigate={onClose} />

      <div className="my-1.5 h-px bg-white/[0.08]" />

      <MenuLabel>Compte &amp; support</MenuLabel>
      <MenuLink
        href="/dashboard/notifications"
        label="Notifications"
        icon={Bell}
        iconClass="text-purple-400"
        onNavigate={onClose}
      />
      <MenuLink
        href="/dashboard/account"
        label="Compte & données"
        icon={Shield}
        iconClass="text-sky-400"
        onNavigate={onClose}
      />
      <MenuLink href="/help" label="Aide" icon={LifeBuoy} iconClass="text-purple-400" onNavigate={onClose} />
      <MenuLink href="/status" label="État des services" icon={Activity} iconClass="text-emerald-400" onNavigate={onClose} />

      <div className="my-1.5 h-px bg-white/[0.08]" />

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-300 transition-colors hover:bg-red-500/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-red-300"
      >
        <span>Déconnexion</span>
        <LogOut size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
