import type { Metadata } from "next";

export const metadata: Metadata = { title: "Accès refusé | Twichify" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
