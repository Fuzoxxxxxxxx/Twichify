import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ShieldCheck, Check } from "lucide-react";
import PublicShell from "@/components/site/PublicShell";
import TwitchConnectButton from "@/components/site/TwitchConnectButton";
import {
  TWITCH_SCOPE_LIST,
  SCOPE_GROUP_LABELS,
  explainScope,
  type ScopeGroup,
} from "@/lib/twitch-scopes";

export const metadata: Metadata = {
  title: "Connexion Twitch | Twichify",
  description: "Ce que Twichify demande à Twitch lors de la connexion, et à quoi sert chaque permission.",
  robots: { index: false },
};

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";
const LINK = `text-purple-300 underline-offset-4 hover:underline ${FOCUS}`;

// Ce que Twichify ne peut pas faire avec ces permissions (cohérent avec la politique de confidentialité).
const CANNOT_DO = [
  "Envoyer ou publier un message sur ta chaîne.",
  "Modérer ton chat (bannir, supprimer des messages).",
  "Modifier ton titre, ta catégorie ou tes réglages Twitch.",
];

// Retour après connexion : uniquement un chemin interne (jamais une adresse extérieure).
function safeCallback(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/";
  return raw;
}

export default async function TwitchConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { callbackUrl: rawCallback } = await searchParams;
  const callbackUrl = safeCallback(rawCallback);

  // Les permissions viennent de lib/twitch-scopes.ts (la même liste que celle demandée à Twitch), regroupées par usage.
  const groups = (Object.keys(SCOPE_GROUP_LABELS) as ScopeGroup[]).map((group) => ({
    group,
    ...SCOPE_GROUP_LABELS[group],
    items: TWITCH_SCOPE_LIST.map((scope) => ({ scope, ...explainScope(scope) })).filter((item) => item.group === group),
  }));

  return (
    <PublicShell width="max-w-2xl">
      <div className="space-y-10 py-6">
        <header>
          <p className="text-sm font-medium text-purple-300">Avant de passer chez Twitch</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Ce que Twichify va te demander
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Twitch va afficher une fenêtre d'autorisation. Voici, en clair, chaque permission demandée et ce qu'elle
            sert à faire. Toutes sont en lecture seule.
          </p>
        </header>

        {groups.map(({ group, title, description, items }) => (
          <section key={group} aria-labelledby={`permissions-${group}`}>
            <h2 id={`permissions-${group}`} className="font-display text-xl font-bold text-white">
              {title}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">{description}</p>

            <ul className="mt-5 divide-y divide-white/10 border-y border-white/10">
              {items.map((item) => (
                <li key={item.scope} className="flex flex-col gap-1.5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-white">{item.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-zinc-400">{item.why}</p>
                  </div>
                  <code className="w-fit shrink-0 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-xs text-zinc-400">
                    {item.scope}
                  </code>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section
          aria-labelledby="cannot-do-title"
          className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6"
        >
          <h2 id="cannot-do-title" className="flex items-center gap-2.5 font-display text-xl font-bold text-white">
            <ShieldCheck size={20} className="text-emerald-300" aria-hidden="true" />
            Ce que Twichify ne peut pas faire
          </h2>
          <ul className="mt-4 space-y-2.5">
            {CANNOT_DO.map((line) => (
              <li key={line} className="flex items-start gap-3 text-sm leading-relaxed text-zinc-300">
                <Check size={16} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-relaxed text-zinc-400">
            Tu peux retirer l'accès à tout moment depuis les{" "}
            <a
              href="https://www.twitch.tv/settings/connections"
              target="_blank"
              rel="noopener noreferrer"
              className={LINK}
            >
              connexions de ton compte Twitch
            </a>
            , et supprimer ton compte Twichify en un clic depuis ton tableau de bord.
          </p>
        </section>

        <div className="space-y-5">
          <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
            En continuant, tu acceptes les{" "}
            <Link href="/privacy#conditions" className={LINK}>
              conditions d'utilisation
            </Link>{" "}
            et la{" "}
            <Link href="/privacy#confidentialite" className={LINK}>
              politique de confidentialité
            </Link>
            , où figure le détail de ce qui est enregistré. Pour l'instant, Twitch te présente les permissions ci-dessus en une
            seule fois.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <TwitchConnectButton callbackUrl={callbackUrl} />
            <Link
              href="/"
              className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 text-base font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:text-white ${FOCUS}`}
            >
              <ArrowLeft size={18} aria-hidden="true" />
              Retour
            </Link>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
