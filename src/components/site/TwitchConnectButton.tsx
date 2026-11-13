"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Tv } from "lucide-react";

// Bouton « Continuer vers Twitch » de l'écran /auth/connexion. Quelqu'un déjà connecté est renvoyé directement
// vers sa destination au lieu de revoir l'écran de consentement.
export default function TwitchConnectButton({ callbackUrl }: { callbackUrl: string }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace(callbackUrl);
  }, [status, callbackUrl, router]);

  return (
    <button
      type="button"
      onClick={() => signIn("twitch", { callbackUrl })}
      disabled={status === "authenticated"}
      className="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-purple-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-purple-500 active:bg-purple-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Tv size={20} />
      Continuer vers Twitch
    </button>
  );
}
