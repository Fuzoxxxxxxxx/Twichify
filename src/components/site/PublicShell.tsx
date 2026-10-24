import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";

// Cadre commun des pages publiques : fond, halo, en-tête du site, colonne de contenu et pied de page.
// `width` : largeur max de la colonne (max-w-3xl pour un texte, max-w-5xl ou max-w-6xl pour une page plus riche).
export default function PublicShell({
  children,
  width = "max-w-3xl",
}: {
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <main className="relative flex min-h-screen flex-col justify-between overflow-x-clip bg-black font-sans text-zinc-300 selection:bg-purple-500/30 selection:text-purple-100">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 top-0 -z-10 h-[420px] w-[900px] -translate-x-1/2 bg-purple-600/10 blur-[160px]"
      />

      <div>
        <SiteHeader />
        <div className={`mx-auto px-6 pb-24 pt-10 ${width}`}>{children}</div>
      </div>

      <SiteFooter />
    </main>
  );
}
