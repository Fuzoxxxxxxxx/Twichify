"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { ShieldAlert, Lock, LayoutDashboard, Home, UserRoundCog } from "lucide-react";
import ErrorScreen from "@/components/ErrorScreen";
import { ROLE_LABELS } from "@/lib/roles";

// N'accepte que des chemins internes (évite les redirections vers un autre site).
function safeFrom(raw: string | null): string | undefined {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return undefined;
  return raw;
}

export default function ForbiddenContent() {
  const { data: session, status } = useSession();
  const from = safeFrom(useSearchParams().get("from"));
  const [role, setRole] = useState<string | null>(null);
  const loggedIn = status === "authenticated";

  useEffect(() => {
    if (!loggedIn) return;
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data?.role) setRole(data.role);
      })
      .catch(() => {});
  }, [loggedIn]);

  const message = loggedIn ? (
    <>
      Tu es connecté en tant que{" "}
      <strong className="font-semibold text-zinc-200">{session?.user?.name}</strong>
      {role && <> ({ROLE_LABELS[role] ?? role})</>}, mais ce compte n'a pas les autorisations nécessaires
      pour accéder à cette page. Si tu penses que c'est une erreur, contacte un administrateur.
    </>
  ) : (
    "Cette page est réservée à l'équipe Twichify. Connecte-toi avec ton compte Twitch pour continuer."
  );

  return (
    <ErrorScreen
      code="403"
      tone="amber"
      badge="Accès refusé"
      badgeIcon={ShieldAlert}
      title="Zone à accès restreint."
      message={message}
      path={from}
      primary={
        loggedIn
          ? { label: "Retour au dashboard", icon: LayoutDashboard, href: "/dashboard" }
          : {
              label: "Se connecter avec Twitch",
              icon: Lock,
              onClick: () => signIn("twitch", { callbackUrl: from ?? "/dashboard" }),
            }
      }
    />
  );
}
