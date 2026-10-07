"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Pages sans bandeau : dashboard, admin, overlays OBS (widgets), la page
// mentions légales elle-même et l'accueil (son footer contient déjà le lien).
const HIDDEN_PREFIXES = ["/dashboard", "/admin", "/widget", "/mentions-legales", "/auth/cancelled"];

export default function LegalFooter() {
  const pathname = usePathname();

  if (
    pathname === "/" ||
    HIDDEN_PREFIXES.some((p) => pathname === p || pathname?.startsWith(`${p}/`))
  ) {
    return null;
  }

  return (
    <div
      data-legal-footer
      className="w-full border-t border-zinc-900/80 bg-black/60 px-6 py-4 text-center text-xs text-zinc-500"
    >
      <Link href="/mentions-legales" className="font-medium transition-colors hover:text-purple-400">
        Mentions légales
      </Link>
    </div>
  );
}
