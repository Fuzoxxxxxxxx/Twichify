"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import TermsModal, { type TermsUpdateInfo } from "@/components/TermsModal";
import WelcomeModal from "@/components/WelcomeModal";
import { hasPermission, PERMISSIONS } from "@/lib/roles";
import { LATEST_VERSION } from "@/lib/changelog";
import {
  LayoutDashboard, Music, Palette, LogOut, MessageSquare, Shield, Bot,
  BarChart3, MessageSquareText, ChevronRight, Activity, LifeBuoy, Lightbulb, History, Tv, type LucideIcon,
} from "lucide-react";

type NavItem = { href: string; label: string; short?: string; icon: LucideIcon };
type NavGroup = { label: string | null; items: NavItem[] };

// Navigation du dashboard, regroupée par catégories. `short` = libellé court de la barre mobile.
const navGroups: NavGroup[] = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "Accueil", icon: LayoutDashboard }],
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

// Liste à plat, pour la barre de navigation mobile (pas de titres de catégories).
const tabs: NavItem[] = navGroups.flatMap((group) => group.items);

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  // Renseigné si l'utilisateur avait accepté une version antérieure des CGU (voir lib/terms).
  const [termsUpdate, setTermsUpdate] = useState<TermsUpdateInfo | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [userRole, setUserRole] = useState<string>("user");
  const [reduceMotion, setReduceMotion] = useState(false);

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

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#08090b] text-white gap-4">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px]">Chargement du Dashboard...</p>
      </div>
    );
  }

  return (
    <main className={`min-h-screen bg-[#08090b] text-white font-sans selection:bg-purple-500/30 flex ${reduceMotion ? "[&_*]:!transition-none [&_*]:!animate-none" : ""}`}>
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
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto p-4">
          {navGroups.map((group) => (
            <div key={group.label ?? "main"} className="space-y-1">
              {group.label && (
                <p className="px-4 pb-1 text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600">{group.label}</p>
              )}
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
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
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          {hasPermission(userRole, PERMISSIONS.VIEW_ADMIN_PANEL) && (
            <Link
              href="/admin/"
              className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-purple-300 border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all"
            >
              <Shield size={16} />
              Modération
            </Link>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-emerald-300 text-[9px] font-black uppercase tracking-[0.2em]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Système en ligne
          </div>

          <div className="relative">
            <button
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-black/30 p-2.5 transition hover:border-white/10"
            >
              <img src={session.user.image || ""} className="w-8 h-8 rounded-full border border-zinc-700 object-cover" alt="Profile" />
              <div className="text-left min-w-0 flex-1">
                <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">Compte</p>
                <p className="text-xs font-bold text-white truncate">{session.user.name}</p>
              </div>
              <ChevronRight size={14} className={`text-zinc-500 transition-transform ${showProfileMenu ? "-rotate-90" : "rotate-90"}`} />
            </button>

            {showProfileMenu && (
              <div className="absolute left-0 bottom-full z-50 mb-3 w-full rounded-2xl border border-zinc-800 bg-zinc-950/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl">
                <p className="px-3 pb-1 pt-1 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Communauté</p>
                <Link
                  href="/ideas"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs text-zinc-200 transition hover:bg-zinc-900/80"
                >
                  <span>Boîte à idées</span>
                  <Lightbulb size={13} className="text-amber-400" />
                </Link>
                <Link
                  href="/changelog"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs text-zinc-200 transition hover:bg-zinc-900/80"
                >
                  <span>Changelog</span>
                  <History size={13} className="text-blue-400" />
                </Link>

                <div className="my-1.5 h-px bg-zinc-800" />

                <p className="px-3 pb-1 pt-1 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Compte & support</p>
                <Link
                  href="/dashboard/account"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs text-zinc-200 transition hover:bg-zinc-900/80"
                >
                  <span>Compte &amp; données</span>
                  <Shield size={13} className="text-sky-400" />
                </Link>
                <Link
                  href="/help"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs text-zinc-200 transition hover:bg-zinc-900/80"
                >
                  <span>Aide</span>
                  <LifeBuoy size={13} className="text-purple-400" />
                </Link>
                <Link
                  href="/status"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs text-zinc-200 transition hover:bg-zinc-900/80"
                >
                  <span>État des services</span>
                  <Activity size={13} className="text-emerald-400" />
                </Link>

                <div className="my-1.5 h-px bg-zinc-800" />

                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs text-red-300 transition hover:bg-red-500/10"
                >
                  <span>Déconnexion</span>
                  <LogOut size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* NAV — mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-zinc-950/90 backdrop-blur-xl px-2 py-2 flex items-center justify-around">
        {tabs.map(({ href, label, short, icon: Icon }) => {
          const isActive = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[9px] font-bold uppercase tracking-wider transition-all ${
                isActive ? "text-purple-400" : "text-zinc-600"
              }`}
            >
              <Icon size={18} />
              {short ?? label}
            </Link>
          );
        })}
      </nav>

      {/* CONTENU */}
      <div className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto px-6 md:px-8 py-8 md:py-10 pb-24 md:pb-10">
          <div key={pathname} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
