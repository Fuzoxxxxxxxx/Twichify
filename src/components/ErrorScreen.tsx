"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LifeBuoy, Activity, ArrowLeft, Link2, Copy, Check, type LucideIcon } from "lucide-react";
import PublicShell from "@/components/site/PublicShell";

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

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

// Classes écrites en toutes lettres pour que Tailwind les détecte.
const TONES: Record<ErrorTone, { badge: string; badgeIcon: string; code: string; btn: string; digest: string }> = {
  purple: {
    badge: "border-purple-500/30 bg-purple-500/10 text-purple-200",
    badgeIcon: "text-purple-300",
    code: "text-purple-400/40",
    btn: "bg-purple-600 text-white hover:bg-purple-500",
    digest: "text-purple-300",
  },
  amber: {
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    badgeIcon: "text-amber-300",
    code: "text-amber-400/40",
    btn: "bg-amber-500 text-black hover:bg-amber-400",
    digest: "text-amber-300",
  },
  rose: {
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    badgeIcon: "text-rose-300",
    code: "text-rose-400/40",
    btn: "bg-rose-600 text-white hover:bg-rose-500",
    digest: "text-rose-300",
  },
};

const SECONDARY_CLASS = `flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 text-base font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:text-white sm:w-auto ${FOCUS}`;

function Action({ action, variant, btnClass }: { action: ErrorAction; variant: "primary" | "secondary"; btnClass: string }) {
  const Icon = action.icon;
  const className =
    variant === "primary"
      ? `flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl px-6 py-3.5 text-base font-semibold transition-colors sm:w-auto ${btnClass} ${FOCUS}`
      : SECONDARY_CLASS;

  const content = (
    <>
      <Icon size={18} />
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

// Écran commun aux pages d'erreur (403, 404, 500) : cadre du site, code, message, actions et liens utiles
// sont définis une seule fois ici.
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

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

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
    <PublicShell width="max-w-xl">
      {/* Cet écran a son propre pied de page (celui du cadre) : on masque le bandeau légal global. */}
      <style>{`[data-legal-footer] { display: none; }`}</style>

      <div className="flex flex-col items-center py-10 text-center">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium ${t.badge}`}>
          <BadgeIcon size={14} className={t.badgeIcon} aria-hidden="true" />
          {badge}
        </span>

        <p
          aria-hidden="true"
          className={`mt-6 select-none font-display text-[clamp(6rem,24vw,10rem)] font-extrabold leading-none tracking-tighter ${t.code}`}
        >
          {code}
        </p>

        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{title}</h1>

        <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-400">{message}</p>

        {shownPath && (
          <div className="mt-6 inline-flex max-w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-zinc-300">
            <Link2 size={13} className="shrink-0 text-zinc-500" aria-hidden="true" />
            <span className="truncate">{shownPath}</span>
          </div>
        )}

        {digest && (
          <div className="mt-6 inline-flex max-w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] py-1.5 pl-3.5 pr-1.5 font-mono text-xs text-zinc-400">
            <span className="shrink-0">ID de diagnostic</span>
            <span className={`select-all truncate ${t.digest}`}>{digest}</span>
            <button
              type="button"
              onClick={copyDigest}
              aria-label="Copier l'ID de diagnostic"
              className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/10 hover:text-white ${FOCUS}`}
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
        )}

        <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <Action action={primary} variant="primary" btnClass={t.btn} />
          {secondary && <Action action={secondary} variant="secondary" btnClass={t.btn} />}
        </div>

        {canGoBack && (
          <button
            type="button"
            onClick={() => router.back()}
            className={`mt-5 inline-flex cursor-pointer items-center gap-1.5 rounded text-sm font-medium text-zinc-400 transition-colors hover:text-white ${FOCUS}`}
          >
            <ArrowLeft size={14} /> Page précédente
          </button>
        )}

        {suggestions && suggestions.length > 0 && (
          <div className="mt-10 w-full border-t border-white/10 pt-6">
            <p className="mb-3 text-sm text-zinc-400">Pages populaires</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-white ${FOCUS}`}
                >
                  <Icon size={14} className="text-zinc-400" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Liens utiles */}
        <nav
          aria-label="Liens utiles"
          className="mt-10 flex w-full flex-col justify-center gap-3 border-t border-white/10 pt-6 text-left sm:flex-row sm:gap-8"
        >
          <Link href="/help" className={`group flex items-center gap-3 rounded ${FOCUS}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-300">
              <LifeBuoy size={18} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-zinc-100 group-hover:text-white">Centre d'aide</span>
              <span className="block text-sm text-zinc-400">FAQ et contact du support</span>
            </span>
          </Link>

          <Link href="/status" className={`group flex items-center gap-3 rounded ${FOCUS}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-300">
              <Activity size={18} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-zinc-100 group-hover:text-white">Statut des services</span>
              <span className="block text-sm text-zinc-400">Vérifier l'état de Twichify</span>
            </span>
          </Link>
        </nav>
      </div>
    </PublicShell>
  );
}
