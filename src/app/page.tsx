"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  Music,
  Tv,
  ArrowRight,
  ShieldCheck,
  Zap,
  Rocket,
  Sparkles,
  BarChart3,
  Disc3,
  ListPlus,
  Bell,
  UserPlus,
  Webhook,
  LifeBuoy,
  MonitorPlay,
  History,
  MessageSquare,
  Palette,
  Layers,
  Puzzle,
} from "lucide-react";
import Link from "next/link";
import TermsModal, { type TermsUpdateInfo } from "@/components/TermsModal";
import SiteHeader from "@/components/SiteHeader";
import MusicWidgetPreview from "@/components/home/MusicWidgetPreview";
import ChatWidgetPreview from "@/components/home/ChatWidgetPreview";
import { LATEST_VERSION } from "@/lib/changelog";

const roadmapItems = [
  {
    title: "Plus de plateformes musicales",
    desc: "Deezer, YouTube Music, Apple Music, SoundCloud… : affichez la musique que vous écoutez, quel que soit le service, dans le même widget.",
    icon: Disc3,
    status: "Prioritaire",
    statusColor: "bg-purple-500/10 text-purple-300 border-purple-500/30",
    dotColor: "bg-purple-400 animate-pulse",
  },
  {
    title: "Demandes de morceaux par le chat",
    desc: "Vos viewers proposent des titres avec une commande, vous validez, et la file d'attente s'affiche en overlay.",
    icon: ListPlus,
    status: "Planifié",
    statusColor: "bg-zinc-800/80 text-zinc-400 border-zinc-700/50",
    dotColor: "bg-zinc-500",
  },
  {
    title: "Widget derniers followers",
    desc: "Un overlay OBS qui affiche vos nouveaux followers en direct, avec les mêmes thèmes que vos autres widgets.",
    icon: UserPlus,
    status: "Planifié",
    statusColor: "bg-zinc-800/80 text-zinc-400 border-zinc-700/50",
    dotColor: "bg-zinc-500",
  },
  {
    title: "Notifications Discord",
    desc: "Prévenez votre serveur Discord quand vous passez en live, avec le jeu, le titre et la musique en cours.",
    icon: Webhook,
    status: "En réflexion",
    statusColor: "bg-zinc-900/80 text-zinc-500 border-zinc-800",
    dotColor: "bg-zinc-600",
  },
];

const steps = [
  {
    number: "01",
    icon: Tv,
    title: "Connexion rapide",
    desc: "Liez votre compte Twitch et vos clés API Spotify en quelques clics.",
  },
  {
    number: "02",
    icon: Palette,
    title: "Personnalisation",
    desc: "Choisissez parmi 8 thèmes visuels et ajustez le style selon votre overlay.",
  },
  {
    number: "03",
    icon: MonitorPlay,
    title: "Intégration OBS",
    desc: "Copiez les liens navigateurs dédiés (Chat et Spotify) et ajoutez-les dans votre logiciel.",
  },
];

const stats = [
  { icon: Layers, value: "2", label: "Widgets séparés", color: "text-white" },
  { icon: Palette, value: "8", label: "Thèmes visuels", color: "text-emerald-400" },
  { icon: Puzzle, value: "100%", label: "Personnalisable", color: "text-white" },
];

export default function Home() {
  const { data: session } = useSession();
  const [showTermsModal, setShowTermsModal] = useState(false);
  // Renseigné si l'utilisateur avait accepté une version antérieure des CGU (voir lib/terms).
  const [termsUpdate, setTermsUpdate] = useState<TermsUpdateInfo | null>(null);

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

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 overflow-x-clip relative flex flex-col justify-between">
      <style jsx global>{`
        @keyframes floatIn {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shine {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }

        .float-in {
          animation: floatIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .animate-shine {
          animation: shine 3s infinite;
        }

        html {
          scroll-behavior: smooth;
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }
          .float-in,
          .animate-shine {
            animation: none;
          }
        }
      `}</style>

      {/* Halo de fond */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[520px] bg-gradient-to-tr from-purple-600/25 via-indigo-500/15 to-emerald-500/15 blur-[170px] pointer-events-none -z-10" />

      {/* Grille de fond */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e15_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10" />

      <div>
        <SiteHeader />

        {/* HERO */}
        <div className="relative max-w-4xl mx-auto px-6 pt-10 pb-16 text-center">
          <Link
            href="/changelog"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800/80 text-zinc-300 text-sm mb-8 backdrop-blur-md shadow-inner float-in hover:border-purple-500/40 hover:bg-zinc-900 transition-colors"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-semibold text-zinc-300">
              Version {LATEST_VERSION} disponible
            </span>
            <span className="text-xs text-zinc-600">— voir le changelog</span>
          </Link>

          <h1
            className="text-5xl md:text-6xl xl:text-7xl font-black tracking-tighter mb-6 bg-gradient-to-b from-white via-zinc-100 to-zinc-500 bg-clip-text text-transparent leading-[1.07] float-in"
            style={{ animationDelay: "0.1s" }}
          >
            Votre musique <br />
            <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent">
              et votre chat, en overlay.
            </span>
          </h1>

          <p
            className="text-zinc-400 text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed font-normal float-in"
            style={{ animationDelay: "0.2s" }}
          >
            Connectez Twitch et Spotify, choisissez vos thèmes et intégrez vos
            widgets de chat et de musique indépendamment sur OBS.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 float-in"
            style={{ animationDelay: "0.3s" }}
          >
            {!session ? (
              <button
                onClick={() => signIn("twitch")}
                className="group relative flex items-center gap-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-[length:200%_auto] hover:bg-right text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(147,51,234,0.45)] active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 -skew-x-12 -translate-x-full animate-shine" />
                <Tv size={24} />
                Se connecter avec Twitch
                <ArrowRight
                  size={20}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-4 p-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl pr-6 backdrop-blur-md shadow-2xl">
                  <img
                    src={session.user?.image || ""}
                    alt="Profil"
                    className="w-12 h-12 rounded-xl border border-zinc-700 object-cover"
                  />
                  <div className="text-left">
                    <p className="text-xs text-zinc-500 font-medium">
                      Connecté en tant que
                    </p>
                    <p className="font-bold text-white">
                      {session.user?.name}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap justify-center">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-all hover:scale-95 active:scale-95 shadow-lg shadow-white/10"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/status"
                    className="px-6 py-3 rounded-xl font-bold bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800 transition-all active:scale-95 text-zinc-300 hover:text-white"
                  >
                    Statut API
                  </Link>

                  <button
                    onClick={() => signOut()}
                    className="px-6 py-3 rounded-xl font-bold bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800 transition-all active:scale-95 text-zinc-300 hover:text-white"
                  >
                    Déconnexion
                  </button>
                </div>
              </div>
            )}

            {!session && (
              <a
                href="#apercu"
                className="flex items-center gap-2 px-6 py-4 rounded-2xl font-semibold text-zinc-300 bg-zinc-900/70 border border-zinc-800 hover:border-purple-500/40 hover:text-white hover:bg-zinc-900 transition-all active:scale-95"
              >
                <MonitorPlay size={18} className="text-purple-400" />
                Voir l'aperçu des widgets
              </a>
            )}
          </div>

          {/* STATS */}
          <div className="inline-grid grid-cols-3 gap-6 sm:gap-10 py-5 px-8 rounded-2xl bg-zinc-950/40 border border-zinc-800/50 backdrop-blur-md text-zinc-400 text-xs sm:text-sm font-medium shadow-inner">
            {stats.map((s, i) => (
              <div key={s.label} className={i === 1 ? "border-x border-zinc-800/80 px-4 sm:px-8" : ""}>
                <div className={`flex items-center justify-center gap-1.5 font-mono font-bold text-base sm:text-xl ${s.color}`}>
                  <s.icon size={15} className="opacity-70" />
                  {s.value}
                </div>
                <p className="text-zinc-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* APERÇU DES WIDGETS (données de démonstration) */}
        <div id="apercu" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-16">
          <SectionHeading eyebrow="Aperçu" color="text-purple-400" title="Vos widgets, tels qu'ils apparaîtront sur votre stream">
            Le rendu des deux widgets une fois ajoutés dans OBS, ici avec des données de démonstration.
          </SectionHeading>

          <div className="grid lg:grid-cols-2 gap-6">
            <PreviewPanel
              icon={<Music size={16} className="text-emerald-400" />}
              label="Widget Musique"
              caption="Titre, artiste et progression synchronisés en direct avec Spotify."
              customizeHref="/dashboard/design"
            >
              <MusicWidgetPreview />
            </PreviewPanel>

            <PreviewPanel
              icon={<MessageSquare size={16} className="text-purple-400" />}
              label="Widget Chat"
              caption="Messages Twitch avec vrais badges, surbrillance des rôles et emotes."
              customizeHref="/dashboard/chat"
            >
              <ChatWidgetPreview />
            </PreviewPanel>
          </div>
        </div>

        {/* SEPARATEUR */}
        <div className="max-w-5xl mx-auto px-6">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
        </div>

        {/* SECTION ETAPES */}
        <div className="max-w-5xl mx-auto px-6 py-20">
          <SectionHeading eyebrow="Simple & Rapide" color="text-purple-400" title="Prêt en seulement 3 étapes" />

          <div className="grid sm:grid-cols-3 gap-6 relative">
            {/* Ligne de connexion entre les étapes, pour renforcer la séquence */}
            <div className="hidden sm:block absolute top-11 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-purple-500/0 via-purple-500/30 to-purple-500/0" />

            {steps.map((step) => (
              <div
                key={step.number}
                className="group p-6 rounded-2xl bg-zinc-950/50 border border-zinc-800/80 relative hover:border-purple-500/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-purple-400 group-hover:scale-105 group-hover:border-purple-500/40 transition-all">
                    <step.icon size={18} />
                  </div>
                  <span className="text-3xl font-black font-mono text-purple-500/20 group-hover:text-purple-500/30 transition-colors">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* POURQUOI */}
        <div className="max-w-5xl mx-auto px-6 py-20">
          <SectionHeading eyebrow="Pourquoi Twichify" color="text-emerald-400" title="Fait pour les streamers, pas pour les entreprises" />

          <div className="grid sm:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Zap className="text-emerald-400" />}
              title="Temps réel instantané"
              desc="Le titre, l'artiste et la progression se mettent à jour en direct depuis Spotify, sans aucun délai perceptible."
              accentColor="hover:border-emerald-500/40 hover:shadow-[0_0_25px_rgba(16,185,129,0.1)]"
            />

            <FeatureCard
              icon={<ShieldCheck className="text-purple-400" />}
              title="Clés API personnelles"
              desc="Vous connectez vos propres identifiants développeur Spotify — vos données restent totalement chez vous."
              accentColor="hover:border-purple-500/40 hover:shadow-[0_0_25px_rgba(168,85,247,0.1)]"
            />

            <FeatureCard
              icon={<MonitorPlay className="text-blue-400" />}
              title="Prêt pour OBS en un clic"
              desc="Deux liens navigateurs dédiés à copier-coller comme source dans OBS, Streamlabs ou tout autre logiciel de stream."
              accentColor="hover:border-blue-500/40 hover:shadow-[0_0_25px_rgba(59,130,246,0.1)]"
            />
          </div>
        </div>

        {/* ROADMAP NOUVEAU DESIGN */}
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="relative rounded-3xl border border-purple-500/30 bg-zinc-950/80 p-8 sm:p-10 shadow-[0_0_50px_rgba(147,51,234,0.1)] backdrop-blur-xl overflow-hidden">
            {/* Effet d'éclairage en arrière-plan */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 blur-[100px] pointer-events-none rounded-full" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 blur-[100px] pointer-events-none rounded-full" />

            {/* En-tête de la Roadmap */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-zinc-800/80 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-inner">
                  <Rocket size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
                      Futurs déploiements
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">
                    Roadmap & Mises à jour
                  </h3>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                Prochaine étape : nouvelles plateformes musicales
              </div>
            </div>

            {/* Grille des fonctionnalités */}
            <div className="grid sm:grid-cols-2 gap-5 relative z-10">
              {roadmapItems.map(({ title, desc, icon: Icon, status, statusColor, dotColor, href }: any) => {
                const CardTag: any = href ? Link : "div";
                return (
                <CardTag
                  key={title}
                  {...(href ? { href } : {})}
                  className="group relative p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-purple-500/40 transition-all duration-300 hover:bg-zinc-900/80 hover:-translate-y-0.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700/60 flex items-center justify-center text-purple-400 group-hover:scale-105 group-hover:border-purple-500/40 transition-all">
                        <Icon size={18} />
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold tracking-wide ${statusColor}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                        {status}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                      {title}
                    </h4>

                    <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                      {desc}
                    </p>
                  </div>
                </CardTag>
                );
              })}
            </div>
          </div>
        </div>

        {/* CTA FINAL */}
        <div className="max-w-5xl mx-auto px-6 pb-24">
          <div className="relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-gradient-to-br from-purple-600/15 via-zinc-950/80 to-emerald-500/10 px-8 py-14 text-center backdrop-blur-xl">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-purple-600/20 blur-[100px]" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                Prêt à habiller votre stream ?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
                Connectez Twitch, personnalisez vos widgets et ajoutez-les dans OBS en quelques clics.
              </p>
              <div className="mt-8 flex justify-center">
                {!session ? (
                  <button
                    onClick={() => signIn("twitch")}
                    className="group flex items-center gap-3 rounded-2xl bg-white px-7 py-3.5 font-bold text-black shadow-lg shadow-white/10 transition-all hover:bg-zinc-200 hover:scale-[1.02] active:scale-95"
                  >
                    <Tv size={20} />
                    Se connecter avec Twitch
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                  </button>
                ) : (
                  <Link
                    href="/dashboard"
                    className="group flex items-center gap-3 rounded-2xl bg-white px-7 py-3.5 font-bold text-black shadow-lg shadow-white/10 transition-all hover:bg-zinc-200 hover:scale-[1.02] active:scale-95"
                  >
                    Ouvrir le dashboard
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER UNIVERSEL */}
      <footer className="w-full border-t border-zinc-900/80 bg-black/40 backdrop-blur-md z-20 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            {/* Copyright & Marque */}
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow shadow-purple-600/20">
                <Music size={12} className="text-white" />
              </div>
              <span className="font-extrabold text-zinc-300">Twichify</span>
              <span>— © 2026 Tous droits réservés.</span>
            </div>

            {/* Liens de navigation */}
            <div className="flex items-center gap-6 font-medium">
              <Link href="/" className="hover:text-purple-400 transition-colors">
                Accueil
              </Link>
              <Link href="/ideas" className="hover:text-purple-400 transition-colors">
                Idées
              </Link>
              <Link href="/changelog" className="hover:text-purple-400 transition-colors">
                Changelog
              </Link>
              <Link href="/help" className="hover:text-purple-400 transition-colors">
                Aide
              </Link>
              <Link href="/privacy" className="hover:text-purple-400 transition-colors">
                Confidentialité & CGU
              </Link>
              <Link href="/mentions-legales" className="hover:text-purple-400 transition-colors">
                Mentions légales
              </Link>
            </div>
          </div>

          <p className="text-[11px] text-zinc-600 text-center sm:text-left">
            Non affilié à Spotify AB ni Twitch Interactive, Inc.
          </p>
        </div>
      </footer>

      <TermsModal
        isOpen={showTermsModal}
        update={termsUpdate}
        onAccept={() => setShowTermsModal(false)}
      />
    </main>
  );
}

// En-tête de section unifié : eyebrow, titre et sous-titre optionnel, même rythme partout.
function SectionHeading({
  eyebrow,
  title,
  color = "text-purple-400",
  children,
}: {
  eyebrow: string;
  title: string;
  color?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="text-center mb-10">
      <span className={`text-xs font-semibold uppercase tracking-widest ${color}`}>{eyebrow}</span>
      <h2 className="text-3xl font-bold text-white mt-1">{title}</h2>
      {children && <p className="text-zinc-500 text-sm mt-3 max-w-xl mx-auto leading-relaxed">{children}</p>}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  accentColor,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accentColor: string;
}) {
  return (
    <div
      className={`p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm group ${accentColor}`}
    >
      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-inner">
        {icon}
      </div>

      <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>

      <p className="text-zinc-400 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}

// Cadre commun aux deux aperçus : fond de "scène" façon stream, en-tête, légende et rappel
// qu'il ne s'agit que d'un rendu parmi d'autres (avec lien vers la personnalisation).
function PreviewPanel({
  icon,
  label,
  caption,
  customizeHref,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  caption: string;
  customizeHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-950/60 shadow-2xl shadow-black/40 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
            {icon}
          </span>
          <span className="text-sm font-bold text-white">{label}</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Démo
        </span>
      </div>

      <div className="flex items-center gap-1.5 border-b border-zinc-800/80 bg-zinc-900/30 px-5 py-2">
        <Palette size={11} className="shrink-0 text-zinc-600" />
        <p className="text-[11px] text-zinc-500">
          Un rendu parmi d'autres —{" "}
          <Link href={customizeHref} className="font-semibold text-purple-400 hover:text-purple-300 transition-colors">
            personnalisez le vôtre
          </Link>{" "}
          depuis le dashboard.
        </p>
      </div>

      <div className="relative flex min-h-[420px] flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_top_left,rgba(88,28,135,0.28),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(15,118,110,0.2),transparent_55%)] p-6">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:2rem_2rem]" />
        <div className="relative z-10 flex w-full justify-center">{children}</div>
      </div>

      <p className="border-t border-zinc-800/80 px-5 py-3 text-xs leading-relaxed text-zinc-500">{caption}</p>
    </div>
  );
}