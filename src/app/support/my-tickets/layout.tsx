import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mes tickets | Twichify" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
