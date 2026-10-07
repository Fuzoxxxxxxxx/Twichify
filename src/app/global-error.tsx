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
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-300 mb-4">
            Erreur critique
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Twichify a rencontré un problème.
          </h1>
          <p className="text-zinc-400 text-sm max-w-md mb-6">
            Un problème inattendu empêche l'affichage du site. Réessaie dans un instant.
          </p>

          {error?.digest && (
            <p className="mb-6 px-3.5 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-zinc-500">
              ID de diagnostic : <span className="text-purple-300 select-all">{error.digest}</span>
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="px-7 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90 transition-opacity cursor-pointer"
            >
              Réessayer
            </button>
            <a
              href="/"
              className="px-6 py-3.5 rounded-2xl font-bold text-sm bg-zinc-900/60 border border-zinc-800/80 text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
            >
              Accueil
            </a>
          </div>

          <p className="mt-12 text-xs text-zinc-500">
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
