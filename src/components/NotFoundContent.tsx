"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RadioTower, ArrowLeft, LayoutDashboard, Lightbulb, History, ShieldCheck } from "lucide-react";
import ErrorScreen from "@/components/ErrorScreen";

// Pages publiques connues, pour proposer « Tu cherchais peut-être… ».
const KNOWN_ROUTES = [
  "/dashboard",
  "/dashboard/spotify",
  "/dashboard/design",
  "/dashboard/chat",
  "/dashboard/stats",
  "/dashboard/bot",
  "/dashboard/account",
  "/help",
  "/ideas",
  "/changelog",
  "/status",
  "/privacy",
  "/mentions-legales",
  "/support/new",
  "/support/my-tickets",
];

function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

function closestRoute(path: string): string | null {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase();
  if (!clean) return null;

  let best: string | null = null;
  let bestDist = Infinity;
  for (const route of KNOWN_ROUTES) {
    const d = distance(clean, route);
    if (d < bestDist) {
      best = route;
      bestDist = d;
    }
  }
  return best && bestDist <= Math.max(2, Math.floor(best.length * 0.3)) ? best : null;
}

export default function NotFoundContent() {
  const pathname = usePathname();
  const guess = pathname ? closestRoute(pathname) : null;

  return (
    <ErrorScreen
      code="404"
      badge="Page introuvable"
      badgeIcon={RadioTower}
      title="Cette page n'existe pas."
      message={
        <>
          L'adresse est peut-être incorrecte, ou la page a été déplacée.
          {guess ? (
            <>
              {" "}
              Tu cherchais peut-être{" "}
              <Link
                href={guess}
                className="font-mono text-purple-300 underline decoration-purple-500/40 underline-offset-4 transition-colors hover:text-purple-200"
              >
                {guess}
              </Link>{" "}
              ?
            </>
          ) : (
            " Vérifie le lien ou reviens à l'accueil."
          )}
        </>
      }
      primary={{ label: "Retour à l'accueil", icon: ArrowLeft, href: "/" }}
      secondary={{ label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" }}
      showPath
      suggestions={[
        { label: "Boîte à idées", href: "/ideas", icon: Lightbulb },
        { label: "Changelog", href: "/changelog", icon: History },
        { label: "Confidentialité", href: "/privacy", icon: ShieldCheck },
      ]}
    />
  );
}
