import type { Metadata } from "next";

export const metadata: Metadata = { title: "Connexion annulée | Twichify" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
