"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import TermsModal, { type TermsUpdateInfo } from "@/components/TermsModal";
import WelcomeModal from "@/components/WelcomeModal";
import { hasPermission, PERMISSIONS } from "@/lib/roles";
import { LATEST_VERSION } from "@/lib/changelog";
import ProfileMenu from "@/components/shell/ProfileMenu";
import {
  LayoutDashboard, Music, Palette, MessageSquare, Shield, Bot,
  BarChart3, MessageSquareText, ChevronRight, Tv, Megaphone,
} from "lucide-react";
import { SidebarBrand, SidebarNav, MobileNav, type NavGroup } from "@/components/shell/ShellNav";
import NotificationBell from "@/components/notifications/NotificationBell";

// Navigation du dashboard, regroupée par catégories. `short` = libellé court de la barre mobile.
const navGroups: NavGroup[] = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "Accueil", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "Intégrations",
    items: [
      { href: "/dashboard/spotify", label: "Spotify", icon: Music },
      { href: "/dashboard/bot", label: "Bot", icon: MessageSquareText },
    ],
  },
  {
    label: "Widgets",
    items: [
      { href: "/dashboard/design", label: "Musique", icon: Palette },
      { href: "/dashboard/chat", label: "Chat", icon: MessageSquare },
      { href: "/dashboard/banner", label: "Bandeau", icon: Megaphone },
    ],
  },
  {
    label: "Analyse",
    items: [
      { href: "/dashboard/stats", label: "Statistiques", short: "Stats", icon: BarChart3 },
      { href: "/dashboard/twitch", label: "Twitch", icon: Tv },
    ],
  },
];

// Pastille du lien d'état de la barre latérale : elle suit l'état réel des services essentiels (lib/status-checker, groupe « core »).
type SystemState = "unknown" | "ok" | "degraded" | "down";
const SYSTEM_LINK: Record<SystemState, { dot: string; label: string }> = {
  ok: { dot: "bg-emerald-400", label: "Système en ligne" },
  degraded: { dot: "bg-amber-400", label: "Service dégradé" },
  down: { dot: "bg-red-400", label: "Panne en cours" },
  unknown: { dot: "bg-zinc-500", label: "État des services" },
};

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  // Renseigné si l'utilisateur avait accepté une version antérieure des CGU (voir lib/terms).
  const [termsUpdate, setTermsUpdate] = useState<TermsUpdateInfo | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [userRole, setUserRole] = useState<string>("user");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [systemState, setSystemState] = useState<SystemState>("unknown");

  useEffect(() => {
    if (!session) return;
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.role) setUserRole(data.role);
      })
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/user/accept-terms")
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.hasAcceptedTerms) {
            if (data.isUpdate) setTermsUpdate({ revisedLabel: data.revisedLabel, changes: data.changes ?? [] });
            setShowTermsModal(true);
          }
        })
        .catch((err) => console.error("Erreur vérification CGU:", err));
    }
  }, [session]);

  useEffect(() => {
    if (!session?.user) return;
    // État sur le compte (pas localStorage) : le tutoriel ne doit pas se réafficher si la
    // personne change de navigateur ou d'appareil.
    fetch("/api/user/onboarding-state")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.hasSeenWelcome === false) setShowWelcomeModal(true);
      })
      .catch(() => {});
  }, [session]);

  const finishWelcome = () => {
    setShowWelcomeModal(false);
    // Marque aussi le changelog comme vu (à la version actuelle) : un nouvel arrivant n'a pas
    // besoin de voir tout l'historique des mises à jour passées juste après son tutoriel.
    // ChangelogModal lit cette même valeur côté serveur, donc ne se déclenchera pas ensuite.
    fetch("/api/user/onboarding-state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasSeenWelcome: true, seenChangelogVersion: LATEST_VERSION }),
    })
      .then((res) => {
        // fetch() ne rejette jamais sur un statut HTTP d'erreur : il faut le vérifier ici,
        // sinon un échec côté serveur passe inaperçu et le tutoriel se réaffiche à la prochaine visite.
        if (!res.ok) console.error("Échec de l'enregistrement de l'onboarding :", res.status);
      })
      .catch((err) => console.error("Échec de l'enregistrement de l'onboarding :", err));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedMotion = localStorage.getItem("twichify-reduce-motion");
    if (savedMotion === "true") setReduceMotion(true);
  }, []);

  // État des services essentiels (Spotify, Twitch, serveur) pour le lien de la barre latérale. Les services d'emotes ne
  // comptent pas ici : leur panne gêne le chat mais pas le fonctionnement du site (elle reste visible sur la page État).
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    const loadSystemState = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/status");
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (cancelled) return;
        const states: string[] = (data.services ?? [])
          .filter((s: { group: string }) => s.group === "core")
          .map((s: { status: string }) => s.status);
        setSystemState(
          states.includes("Down")
            ? "down"
            : states.includes("Degraded")
              ? "degraded"
              : states.length > 0 && states.every((s) => s === "Operational")
                ? "ok"
                : "unknown"
        );
      } catch {
        if (!cancelled) setSystemState("unknown");
      }
    };

    loadSystemState();
    const id = setInterval(loadSystemState, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [session]);

  // Session absente : on distingue le chargement (spinner) de la déconnexion (retour vers l'écran de connexion),
  // au lieu de laisser un spinner indéfini.
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/auth/connexion?callbackUrl=${encodeURIComponent(pathname || "/dashboard")}`);
    }
  }, [status, router, pathname]);

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#08090b] text-white gap-4">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p role="status" className="text-sm text-zinc-400">
          {status === "unauthenticated" ? "Redirection vers la connexion..." : "Chargement du Dashboard..."}
        </p>
      </div>
    );
  }

  return (
    <main className={`isolate min-h-screen bg-[#08090b] text-white font-sans selection:bg-purple-500/30 flex ${reduceMotion ? "[&_*]:!transition-none [&_*]:!animate-none" : ""}`}>
      <style jsx global>{`
        button:focus-visible,
        input:focus-visible,
        select:focus-visible,
        textarea:focus-visible {
          outline: 2px solid rgba(168, 85, 247, 0.6);
          outline-offset: 2px;
        }

        @keyframes msgInSlide { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes msgInFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes msgInBounce {
          0% { opacity: 0; transform: scale(0.3) translateY(10px); }
          50% { opacity: 1; transform: scale(1.08) translateY(-4px); }
          70% { transform: scale(0.95) translateY(2px); }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes msgOutSlide { from { opacity: 1; transform: translateX(0); max-height: 200px; } to { opacity: 0; transform: translateX(-16px); max-height: 0; margin-top: 0; } }
        @keyframes msgOutFade { from { opacity: 1; max-height: 200px; } to { opacity: 0; max-height: 0; margin-top: 0; } }
        @keyframes msgOutBounce {
          0% { opacity: 1; transform: scale(1); max-height: 200px; }
          30% { transform: scale(1.05); }
          100% { opacity: 0; transform: scale(0.3); max-height: 0; margin-top: 0; }
        }
        .msg-in-slide { animation: msgInSlide 0.3s ease-out both; }
        .msg-in-fade { animation: msgInFade 0.4s ease-out both; }
        .msg-in-bounce { animation: msgInBounce 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        .msg-out-slide { animation: msgOutSlide 0.35s ease-in forwards; overflow: hidden; }
        .msg-out-fade { animation: msgOutFade 0.35s ease-in forwards; overflow: hidden; }
        .msg-out-bounce { animation: msgOutBounce 0.35s ease-in forwards; overflow: hidden; }
        .msg-out-instant { animation: none; display: none; }
      `}</style>

      {/* Ambiance : deux lueurs très douces en haut de page. `isolate` sur <main> les garde visibles (sans lui, le fond de <main> les recouvrait). */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(55%_70%_at_18%_0%,rgba(147,51,234,0.14),transparent_70%),radial-gradient(40%_55%_at_92%_0%,rgba(56,189,248,0.06),transparent_70%)]"
      />

      {/* SIDEBAR — desktop */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-white/[0.06] bg-zinc-950/70 backdrop-blur-xl flex-col h-screen sticky top-0 z-30">
        <SidebarBrand action={<NotificationBell />} />

        <SidebarNav groups={navGroups} pathname={pathname} />

        <div className="space-y-1 border-t border-white/5 p-3">
          {hasPermission(userRole, PERMISSIONS.VIEW_ADMIN_PANEL) && (
            <Link
              href="/admin/"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-amber-300 transition-colors hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              <Shield size={16} />
              Modération
            </Link>
          )}

          <Link
            href="/status"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
          >
            <span aria-hidden="true" className={`mx-[5px] h-1.5 w-1.5 rounded-full ${SYSTEM_LINK[systemState].dot}`} />
            {SYSTEM_LINK[systemState].label}
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              aria-expanded={showProfileMenu}
              aria-haspopup="true"
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 transition-colors hover:border-white/20 hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
            >
              <img src={session.user.image || ""} className="h-9 w-9 rounded-full border border-white/10 object-cover" alt="" />
              <div className="text-left min-w-0 flex-1">
                <p className="text-xs text-zinc-500">Compte</p>
                <p className="truncate text-sm font-semibold text-white">{session.user.name}</p>
              </div>
              <ChevronRight size={14} aria-hidden="true" className={`text-zinc-500 transition-transform ${showProfileMenu ? "-rotate-90" : "rotate-90"}`} />
            </button>

            {showProfileMenu && <ProfileMenu onClose={() => setShowProfileMenu(false)} />}
          </div>
        </div>
      </aside>

      {/* NAV — mobile */}
      <NotificationBell variant="floating" />
      <MobileNav groups={navGroups} pathname={pathname} />

      {/* CONTENU */}
      <div className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-8 md:py-10 pb-28 md:pb-12">
          <div key={pathname} className="animate-in fade-in duration-200">
            {children}
          </div>
        </div>
      </div>

      <TermsModal
        isOpen={showTermsModal}
        update={termsUpdate}
        onAccept={() => setShowTermsModal(false)}
      />
      <WelcomeModal
        isOpen={showWelcomeModal && !showTermsModal}
        onFinish={finishWelcome}
      />
    </main>
  );
}
