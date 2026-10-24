"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Tv, Music, MessageSquare, ShieldCheck, Zap, MonitorPlay, Disc3, ListPlus, Webhook, type LucideIcon } from "lucide-react";
import Link from "next/link";
import TermsModal, { type TermsUpdateInfo } from "@/components/TermsModal";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MusicWidgetPreview from "@/components/home/MusicWidgetPreview";
import ChatWidgetPreview from "@/components/home/ChatWidgetPreview";
import { LATEST_VERSION } from "@/lib/changelog";

// Police des titres de l'accueil : `font-display` (Bricolage Grotesque, déclarée dans app/layout.tsx). Le texte courant garde Geist.
const displayFont = { className: "font-display" };

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";
const PRIMARY_BUTTON = `inline-flex items-center justify-center gap-2.5 rounded-xl bg-purple-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-purple-500 active:bg-purple-700 ${FOCUS}`;
const SECONDARY_BUTTON = `inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3.5 text-base font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:text-white ${FOCUS}`;

const steps = [
  {
    title: "Connectez vos comptes",
    desc: "Liez Twitch en un clic, puis ajoutez vos clés API Spotify. Elles restent les vôtres.",
  },
  {
    title: "Choisissez le style",
    desc: "8 thèmes, des couleurs et des animations à régler, avec un aperçu en direct à chaque changement.",
  },
  {
    title: "Ajoutez deux liens dans OBS",
    desc: "Un lien pour le chat, un pour la musique, à coller comme sources navigateur dans OBS, Streamlabs ou tout autre logiciel.",
    snippet: "twichify.vercel.app/widget/votre-lien",
  },
];

const reasons: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Zap,
    title: "Mise à jour en temps réel",
    desc: "Le titre, l'artiste et la progression suivent Spotify en direct, sans délai perceptible.",
  },
  {
    icon: ShieldCheck,
    title: "Vos propres clés API",
    desc: "Vous connectez vos identifiants développeur Spotify : vos données restent chez vous.",
  },
  {
    icon: MonitorPlay,
    title: "Prêt pour OBS",
    desc: "Deux liens navigateur à copier-coller comme source dans OBS, Streamlabs ou tout autre logiciel de stream.",
  },
];

const roadmapItems: { title: string; desc: string; icon: LucideIcon; status: string; statusClass: string }[] = [
  {
    title: "Plus de plateformes musicales",
    desc: "Deezer, YouTube Music, Apple Music, SoundCloud : affichez la musique que vous écoutez, quel que soit le service, dans le même widget.",
    icon: Disc3,
    status: "Prioritaire",
    statusClass: "border-purple-500/40 bg-purple-500/10 text-purple-200",
  },
  {
    title: "Demandes de morceaux par le chat",
    desc: "Vos viewers proposent des titres avec une commande, vous validez, et la file d'attente s'affiche en overlay.",
    icon: ListPlus,
    status: "Planifié",
    statusClass: "border-white/15 bg-white/5 text-zinc-300",
  },
  {
    title: "Notifications Discord",
    desc: "Prévenez votre serveur Discord quand vous passez en live, avec le jeu, le titre et la musique en cours.",
    icon: Webhook,
    status: "En réflexion",
    statusClass: "border-white/10 bg-transparent text-zinc-400",
  },
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
    <main className="relative flex min-h-screen flex-col justify-between overflow-x-clip bg-black font-sans text-white selection:bg-purple-500/30">
      <style jsx global>{`
        /* Un seul enchaînement, à l'arrivée sur la page : le haut de l'accueil apparaît par étapes. */
        @keyframes floatIn {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .float-in {
          animation: floatIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        html {
          scroll-behavior: smooth;
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }
          .float-in {
            animation: none;
          }
        }
      `}</style>

      {/* Halo discret en haut de page : la seule lumière décorative */}
      <div className="pointer-events-none fixed left-1/2 top-0 -z-10 h-[460px] w-[1000px] -translate-x-1/2 bg-purple-600/15 blur-[170px]" />

      <div>
        <SiteHeader />

        {/* HERO */}
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-12 sm:pt-16">
          <Link
            href="/changelog"
            className={`float-in inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white ${FOCUS}`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Version {LATEST_VERSION} disponible : voir les nouveautés
          </Link>

          <h1
            className={`${displayFont.className} float-in mt-6 max-w-4xl text-[clamp(2.5rem,6.4vw,5rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-white`}
            style={{ animationDelay: "0.08s" }}
          >
            Votre musique et votre chat,
            <span className="text-zinc-500"> en overlay sur votre stream.</span>
          </h1>

          <p
            className="float-in mt-6 max-w-xl text-lg leading-relaxed text-zinc-400"
            style={{ animationDelay: "0.16s" }}
          >
            Connectez Twitch et Spotify, choisissez un style, puis ajoutez un lien par widget dans OBS. Le chat et la
            musique fonctionnent indépendamment.
          </p>

          <div className="float-in mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "0.24s" }}>
            {!session ? (
              <>
                <button onClick={() => signIn("twitch")} className={PRIMARY_BUTTON}>
                  <Tv size={20} />
                  Se connecter avec Twitch
                </button>
                <a href="#etapes" className={SECONDARY_BUTTON}>
                  Voir comment ça marche
                </a>
              </>
            ) : (
              <>
                <Link href="/dashboard" className={PRIMARY_BUTTON}>
                  Ouvrir le dashboard
                </Link>
                <Link href="/status" className={SECONDARY_BUTTON}>
                  État des services
                </Link>
                <button
                  onClick={() => signOut()}
                  className={`rounded-xl px-4 py-3.5 text-base font-medium text-zinc-400 transition-colors hover:text-white ${FOCUS}`}
                >
                  Déconnexion
                </button>
                <span className="ml-1 flex items-center gap-2.5 text-sm text-zinc-400">
                  <img
                    src={session.user?.image || ""}
                    alt=""
                    className="h-7 w-7 rounded-full border border-white/10 object-cover"
                  />
                  Connecté en tant que <span className="font-semibold text-white">{session.user?.name}</span>
                </span>
              </>
            )}
          </div>

          {/* Les deux aperçus, séparés : chaque widget est une source OBS à part */}
          <div className="float-in mt-14 grid gap-6 lg:grid-cols-2" style={{ animationDelay: "0.32s" }}>
            <PreviewPanel
              icon={<Music size={16} className="text-emerald-400" />}
              label="Widget musique"
              caption="Titre, artiste et progression synchronisés avec Spotify."
              href="/dashboard/design"
            >
              <MusicWidgetPreview />
            </PreviewPanel>

            <PreviewPanel
              icon={<MessageSquare size={16} className="text-purple-400" />}
              label="Widget chat"
              caption="Messages Twitch avec badges, rôles en surbrillance et emotes."
              href="/dashboard/chat"
            >
              <ChatWidgetPreview />
            </PreviewPanel>
          </div>
        </section>

        {/* ÉTAPES : une vraie séquence, donc numérotée */}
        <section id="etapes" className="scroll-mt-16 border-t border-white/10">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <h2 className={`${displayFont.className} max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl`}>
              Prêt en trois étapes
            </h2>

            <ol className="mt-14 grid gap-12 md:grid-cols-3 md:gap-0">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className={`md:px-8 ${index === 0 ? "md:pl-0" : "md:border-l md:border-white/10"} ${
                    index === steps.length - 1 ? "md:pr-0" : ""
                  }`}
                >
                  <span
                    className={`${displayFont.className} block text-5xl font-extrabold leading-none text-purple-400/80`}
                  >
                    {index + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">{step.desc}</p>
                  {step.snippet && (
                    <code className="mt-4 block overflow-x-auto whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-xs text-zinc-300">
                      {step.snippet}
                    </code>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* POURQUOI */}
        <section className="border-t border-white/10">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 className={`${displayFont.className} text-3xl font-bold tracking-tight sm:text-4xl`}>
                Fait pour les streamers, pas pour les entreprises.
              </h2>
            </div>

            <ul className="divide-y divide-white/10 border-y border-white/10 lg:col-span-7">
              {reasons.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex gap-5 py-7">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-purple-300">
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-white">{title}</h3>
                    <p className="mt-1.5 max-w-md text-sm leading-relaxed text-zinc-400">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ROADMAP */}
        <section className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <h2 className={`${displayFont.className} text-3xl font-bold tracking-tight sm:text-4xl`}>Prochainement</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
              Ce qui arrive sur Twichify, par ordre de priorité. Vous pouvez aussi voter pour vos idées dans la{" "}
              <Link href="/ideas" className={`text-purple-300 underline-offset-4 hover:underline ${FOCUS}`}>
                boîte à idées
              </Link>
              .
            </p>

            <ul className="mt-12 border-b border-white/10">
              {roadmapItems.map(({ title, desc, icon: Icon, status, statusClass }, index) => (
                <li
                  key={title}
                  className={`grid items-start gap-x-6 gap-y-3 border-t border-white/10 py-7 sm:grid-cols-[auto_1fr_auto] ${
                    index === 0 ? "sm:border-l-2 sm:border-l-purple-500 sm:pl-6" : "sm:pl-6"
                  }`}
                >
                  <span className="hidden h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-purple-300 sm:flex">
                    <Icon size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-white">{title}</h3>
                    <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-400">{desc}</p>
                  </div>
                  <span
                    className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}
                  >
                    {status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="flex flex-col items-start justify-between gap-8 rounded-3xl border border-white/10 bg-zinc-950/70 p-8 sm:p-12 md:flex-row md:items-center">
            <div>
              <h2 className={`${displayFont.className} text-3xl font-bold tracking-tight sm:text-4xl`}>
                Prêt à habiller votre stream ?
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
                Connectez Twitch, personnalisez vos widgets et ajoutez-les dans OBS en quelques minutes.
              </p>
            </div>

            {!session ? (
              <button onClick={() => signIn("twitch")} className={`${PRIMARY_BUTTON} shrink-0`}>
                <Tv size={20} />
                Se connecter avec Twitch
              </button>
            ) : (
              <Link href="/dashboard" className={`${PRIMARY_BUTTON} shrink-0`}>
                Ouvrir le dashboard
              </Link>
            )}
          </div>
        </section>
      </div>

      <SiteFooter />

      <TermsModal isOpen={showTermsModal} update={termsUpdate} onAccept={() => setShowTermsModal(false)} />
    </main>
  );
}

// Cadre d'un aperçu : en-tête, zone de rendu (fond neutre, pas de scène) et lien vers la personnalisation.
function PreviewPanel({
  icon,
  label,
  caption,
  href,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  caption: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/60">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5">
        <span className="flex items-center gap-2.5 text-sm font-semibold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
            {icon}
          </span>
          {label}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Données de démonstration
        </span>
      </div>

      <div className="flex min-h-[420px] flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_top_left,rgba(88,28,135,0.22),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(15,118,110,0.16),transparent_55%)] p-6">
        {children}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/10 px-5 py-3 text-sm text-zinc-400">
        <p>{caption}</p>
        <Link href={href} className={`font-medium text-purple-300 underline-offset-4 hover:underline ${FOCUS}`}>
          Personnaliser
        </Link>
      </div>
    </div>
  );
}
