"use client";

import "./globals.css";

// Affiché quand le layout racine lui-même plante : il remplace tout le
// document, donc <html> et <body> sont obligatoires et on évite Providers/Link.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-[#030305] text-zinc-100 font-sans antialiased">
        <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-medium text-purple-300 mb-4">
            Erreur critique
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Twichify a rencontré un problème.
          </h1>
          <p className="text-zinc-400 text-base max-w-md mb-6">
            Un problème inattendu empêche l'affichage du site. Réessaie dans un instant.
          </p>

          {error?.digest && (
            <p className="mb-6 px-3.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-xs font-mono text-zinc-400">
              ID de diagnostic : <span className="text-purple-300 select-all">{error.digest}</span>
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="px-6 py-3.5 rounded-xl font-semibold text-base bg-purple-600 text-white hover:bg-purple-500 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
            >
              Réessayer
            </button>
            <a
              href="/"
              className="px-6 py-3.5 rounded-xl font-semibold text-base border border-white/15 text-zinc-200 hover:text-white hover:border-white/30 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
            >
              Accueil
            </a>
          </div>

          <p className="mt-12 text-sm text-zinc-400">
            © 2026 Twichify ·{" "}
            <a href="/mentions-legales" className="hover:text-purple-400 transition-colors">
              Mentions légales
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
