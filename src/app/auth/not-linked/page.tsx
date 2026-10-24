"use client";

import { UserX, Lock, Eye, CheckCircle2, ExternalLink } from "lucide-react";
import AuthNotice from "@/components/site/AuthNotice";

/**
 * Page affichée quand NextAuth renvoie l'erreur OAuthAccountNotLinked : un compte existe déjà avec cet e-mail,
 * mais il a été créé avec un autre compte Twitch. On y arrive via /auth/signin (voir pages.signIn dans la config NextAuth).
 * Même structure que /auth/cancelled (composant AuthNotice), avec un accent ambre au lieu de violet.
 */
export default function AuthNotLinked() {
  return (
    <AuthNotice
      tone="amber"
      icon={UserX}
      title="Ce n'est pas le bon compte"
      helpLabel="Pourquoi ce message ?"
      modalTitle="Protection de ton compte"
      modalSubtitle="Pourquoi la connexion est-elle refusée ?"
      modalItems={[
        {
          icon: CheckCircle2,
          title: "Une sécurité volontaire",
          text: "Un compte existe déjà avec ton adresse e-mail. Pour éviter qu'un autre compte ne s'en empare, on refuse de lier automatiquement un nouveau compte Twitch.",
        },
        {
          icon: Eye,
          title: "Quel compte utiliser ?",
          text: "Celui de ta toute première connexion à Twichify. Si tu as plusieurs comptes Twitch, essaie l'autre.",
        },
        {
          icon: Lock,
          title: "Tu as changé de compte Twitch ?",
          text: "Si tu n'as plus accès à l'ancien, passe par la page d'aide pour nous contacter : on regardera ta situation.",
        },
      ]}
      extra={
        <div className="mt-8 w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left text-sm leading-relaxed text-zinc-400">
          <p className="mb-1 font-semibold text-zinc-200">Ça recommence à chaque essai ?</p>
          Twitch réutilise le compte déjà ouvert dans ton navigateur. Déconnecte-toi de{" "}
          <a
            href="https://www.twitch.tv/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded text-purple-300 underline decoration-purple-500/40 underline-offset-2 hover:text-purple-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
          >
            twitch.tv <ExternalLink size={12} />
          </a>
          , puis reconnecte-toi avec le bon compte avant de réessayer.
        </div>
      }
    >
      <p>Un compte Twichify existe déjà avec cette adresse e-mail, mais il a été créé avec un autre compte Twitch.</p>
      <p>
        Pour confirmer ton identité, connecte-toi avec le{" "}
        <span className="font-semibold text-white">même compte Twitch que lors de ta première connexion</span>.
      </p>
    </AuthNotice>
  );
}
