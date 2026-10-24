import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// En-tête commun des pages publiques : lien de retour, titre, texte d'introduction, mention (date de mise à jour…)
// et un emplacement `action` à droite du titre.
export default function PageIntro({
  title,
  children,
  meta,
  action,
  backHref = "/",
  backLabel = "Accueil",
}: {
  title: string;
  children?: React.ReactNode;
  meta?: string;
  action?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="border-b border-white/10 pb-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 rounded text-sm text-zinc-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        {backLabel}
      </Link>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{title}</h1>
          {children && <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">{children}</p>}
          {meta && (
            <p className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
              {meta}
            </p>
          )}
        </div>
        {action}
      </div>
    </header>
  );
}

// Section d'un texte long (mentions légales…) : titre, puis contenu séparé par un filet, sans carte.
export function LegalSection({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-t border-white/10 py-8 first:border-t-0">
      <h2 id={`${id}-title`} className="flex items-center gap-3 font-display text-xl font-bold text-white">
        {icon && <span className="text-purple-300">{icon}</span>}
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-base leading-relaxed text-zinc-400 [&_a]:text-purple-300 [&_a:hover]:underline">
        {children}
      </div>
    </section>
  );
}
