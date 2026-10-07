"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Tv, LifeBuoy, Activity, ArrowUpRight, ArrowLeft, Link2, Copy, Check, type LucideIcon } from "lucide-react";

export type ErrorAction = {
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
};

export type ErrorTone = "purple" | "amber" | "rose";

type ErrorScreenProps = {
  code: string;
  badge: string;
  badgeIcon: LucideIcon;
  title: string;
  message: ReactNode;
  /** Identifiant de diagnostic Next.js (erreurs serveur uniquement). */
  digest?: string;
  primary: ErrorAction;
  secondary?: ErrorAction;
  /** Couleur d'accent : purple (404), amber (403), rose (500). */
  tone?: ErrorTone;
  /** Affiche l'adresse demandée (utile pour la 404). */
  showPath?: boolean;
  /** Adresse à afficher à la place de l'URL courante (ex. page demandée avant redirection). */
  path?: string;
  /** Pages proposées sous les boutons. */
  suggestions?: { label: string; href: string; icon: LucideIcon }[];
};

// Classes écrites en toutes lettres pour que Tailwind les détecte.
const TONES: Record<
  ErrorTone,
  { orbA: string; orbB: string; line: string; badge: string; badgeIcon: string; code: string; btn: string; card: string; digest: string; spot: string }
> = {
  purple: {
    orbA: "bg-purple-600/25",
    orbB: "bg-indigo-500/20",
    line: "via-purple-400/70",
    badge: "bg-purple-500/10 border-purple-500/25 text-purple-200",
    badgeIcon: "text-purple-400",
    code: "text-purple-500/50",
    btn: "from-purple-600 via-indigo-600 to-purple-600 hover:shadow-[0_0_40px_rgba(147,51,234,0.4)]",
    card: "hover:border-purple-500/40",
    digest: "text-purple-300",
    spot: "rgba(168,85,247,0.14)",
  },
  amber: {
    orbA: "bg-amber-500/20",
    orbB: "bg-purple-600/20",
    line: "via-amber-400/70",
    badge: "bg-amber-500/10 border-amber-500/25 text-amber-200",
    badgeIcon: "text-amber-400",
    code: "text-amber-500/45",
    btn: "from-amber-500 via-orange-500 to-amber-500 hover:shadow-[0_0_40px_rgba(245,158,11,0.35)]",
    card: "hover:border-amber-500/40",
    digest: "text-amber-300",
    spot: "rgba(245,158,11,0.12)",
  },
  rose: {
    orbA: "bg-rose-600/25",
    orbB: "bg-purple-600/20",
    line: "via-rose-400/70",
    badge: "bg-rose-500/10 border-rose-500/25 text-rose-200",
    badgeIcon: "text-rose-400",
    code: "text-rose-500/45",
    btn: "from-rose-600 via-pink-600 to-rose-600 hover:shadow-[0_0_40px_rgba(244,63,94,0.4)]",
    card: "hover:border-rose-500/40",
    digest: "text-rose-300",
    spot: "rgba(244,63,94,0.12)",
  },
};

const SECONDARY_CLASS =
  "w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all text-zinc-200 hover:text-white active:scale-95 cursor-pointer";

function Action({
  action,
  variant,
  btnClass,
}: {
  action: ErrorAction;
  variant: "primary" | "secondary";
  btnClass: string;
}) {
  const Icon = action.icon;

  const className =
    variant === "primary"
      ? `group relative w-full sm:w-auto flex items-center justify-center gap-2.5 bg-gradient-to-r ${btnClass} bg-[length:200%_auto] hover:bg-right text-white px-7 py-3.5 rounded-2xl font-bold text-sm transition-all duration-500 hover:scale-[1.02] active:scale-95 overflow-hidden cursor-pointer`
      : SECONDARY_CLASS;

  const content =
    variant === "primary" ? (
      <>
        <span className="absolute inset-0 bg-white/20 -skew-x-12 -translate-x-full animate-shine" aria-hidden="true" />
        <Icon size={18} />
        {action.label}
      </>
    ) : (
      <>
        <Icon size={18} className="text-zinc-400" />
        {action.label}
      </>
    );

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={className}>
      {content}
    </button>
  );
}

function HelpCard({
  href,
  icon: Icon,
  title,
  desc,
  hoverClass,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  hoverClass: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3.5 rounded-2xl border border-white/5 bg-zinc-950/50 backdrop-blur-xl px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:bg-zinc-900/60 ${hoverClass}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition-transform group-hover:scale-105">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-zinc-100">{title}</span>
        <span className="block text-xs text-zinc-500">{desc}</span>
      </span>
      <ArrowUpRight
        size={16}
        className="shrink-0 text-zinc-600 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-zinc-300"
      />
    </Link>
  );
}

// Écran commun aux pages d'erreur (403, 404, 500) : header, carte centrale,
// liens utiles et footer (avec mentions légales) sont définis une seule fois ici.
export default function ErrorScreen({
  code,
  badge,
  badgeIcon: BadgeIcon,
  title,
  message,
  digest,
  primary,
  secondary,
  tone = "purple",
  showPath,
  path,
  suggestions,
}: ErrorScreenProps) {
  const t = TONES[tone];
  const [copied, setCopied] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const shownPath = path ?? (showPath ? pathname : undefined);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  // Halo qui suit le curseur sur la carte (variables CSS, sans re-render).
  const onCardMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const copyDigest = async () => {
    if (!digest) return;
    try {
      await navigator.clipboard.writeText(digest);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible : l'ID reste sélectionnable à la main.
    }
  };

  return (
    <main className="min-h-screen bg-[#030305] text-zinc-100 font-sans flex flex-col overflow-hidden relative selection:bg-purple-500/30">
      <style jsx global>{`
        @keyframes drift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(30px, -24px, 0) scale(1.08); }
        }
        @keyframes shine {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(250%) skewX(-12deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes codePulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        .animate-drift { animation: drift 14s ease-in-out infinite; }
        .animate-drift-slow { animation: drift 20s ease-in-out infinite reverse; }
        .animate-shine { animation: shine 3.5s infinite; }
        .fade-up { animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .code-pulse { animation: codePulse 4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .animate-drift, .animate-drift-slow, .animate-shine, .fade-up, .code-pulse { animation: none; }
        }
        /* Cet écran a son propre footer : on masque le bandeau global. */
        [data-legal-footer] { display: none; }
      `}</style>

      {/* Ambiance : orbes flottants + grille masquée */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className={`absolute -top-32 left-[12%] h-[420px] w-[420px] rounded-full blur-[140px] animate-drift ${t.orbA}`} />
        <div className={`absolute bottom-[-120px] right-[8%] h-[460px] w-[460px] rounded-full blur-[150px] animate-drift-slow ${t.orbB}`} />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_45%,#000_60%,transparent_100%)]" />
      </div>

      {/* HEADER */}
      <header className="max-w-7xl w-full mx-auto px-6 py-8 flex items-center z-20">
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-700 flex items-center justify-center text-white shadow-lg shadow-purple-600/20 group-hover:scale-105 group-hover:shadow-purple-600/40 transition-all duration-300">
            <Tv size={20} />
          </div>
          <span className="font-extrabold text-xl tracking-wide bg-gradient-to-r from-white via-zinc-200 to-purple-400 bg-clip-text text-transparent">
            Twichify
          </span>
        </Link>
      </header>

      {/* CONTENU */}
      <div className="relative z-10 mx-auto my-auto w-full max-w-2xl px-6 py-8">
        <div
          ref={cardRef}
          onMouseMove={onCardMove}
          className="group/card fade-up relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/60 p-8 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:p-12">
          {/* Filet lumineux en haut de la carte */}
          <div
            aria-hidden="true"
            className={`absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent ${t.line} to-transparent`}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
            style={{
              background: `radial-gradient(420px circle at var(--mx, 50%) var(--my, 0%), ${t.spot}, transparent 70%)`,
            }}
          />

          <div
            className={`mx-auto mb-4 inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 text-xs font-semibold backdrop-blur-xl ${t.badge}`}
          >
            <BadgeIcon size={14} className={t.badgeIcon} aria-hidden="true" />
            <span className="uppercase tracking-wider">{badge}</span>
          </div>

          {/* Code : copie floutée derrière pour l'effet de halo */}
          <div className="relative my-1 flex select-none items-center justify-center" aria-hidden="true">
            <span
              className={`code-pulse absolute text-[120px] font-black leading-none tracking-tighter blur-2xl sm:text-[180px] ${t.code}`}
            >
              {code}
            </span>
            <span className="relative bg-gradient-to-b from-white via-zinc-300 to-zinc-700 bg-clip-text text-[120px] font-black leading-none tracking-tighter text-transparent sm:text-[180px]">
              {code}
            </span>
          </div>

          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{title}</h1>

          <p className="mx-auto mb-8 max-w-md text-sm font-normal leading-relaxed text-zinc-400 sm:text-base">
            {message}
          </p>

          {shownPath && (
            <div className="mb-8 -mt-4 inline-flex max-w-full items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-xs text-zinc-400">
              <Link2 size={13} className="shrink-0 text-zinc-500" aria-hidden="true" />
              <span className="truncate">{shownPath}</span>
            </div>
          )}

          {digest && (
            <div className="mb-8 inline-flex max-w-full items-center gap-2 rounded-xl border border-white/10 bg-black/40 py-1.5 pl-3.5 pr-1.5 font-mono text-xs text-zinc-500">
              <span className="shrink-0">ID de diagnostic</span>
              <span className={`truncate select-all ${t.digest}`}>{digest}</span>
              <button
                type="button"
                onClick={copyDigest}
                aria-label="Copier l'ID de diagnostic"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          )}

          <div className="flex w-full flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Action action={primary} variant="primary" btnClass={t.btn} />
            {secondary && <Action action={secondary} variant="secondary" btnClass={t.btn} />}
          </div>

          {canGoBack && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-200 cursor-pointer"
              >
                <ArrowLeft size={13} /> Page précédente
              </button>
            </div>
          )}

          {suggestions && suggestions.length > 0 && (
            <div className="mt-8 border-t border-white/5 pt-6">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
                Pages populaires
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map(({ label, href, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                  >
                    <Icon size={13} className="text-zinc-400" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Liens utiles */}
        <nav aria-label="Liens utiles" className="fade-up mt-4 grid gap-3 sm:grid-cols-2" style={{ animationDelay: "0.15s" }}>
          <HelpCard
            href="/help"
            icon={LifeBuoy}
            title="Centre d'aide"
            desc="FAQ et contact du support"
            hoverClass={t.card}
          />
          <HelpCard
            href="/status"
            icon={Activity}
            title="Statut des services"
            desc="Vérifier l'état de Twichify"
            hoverClass={t.card}
          />
        </nav>
      </div>

      {/* FOOTER */}
      <footer className="w-full border-t border-white/5 bg-black/40 backdrop-blur-md py-4 px-6 mt-auto z-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500">
          <span>© 2026 Twichify</span>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/privacy" className="hover:text-purple-400 transition-colors">
              Confidentialité & CGU
            </Link>
            <Link href="/mentions-legales" className="hover:text-purple-400 transition-colors">
              Mentions légales
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
