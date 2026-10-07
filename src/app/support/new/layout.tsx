import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nouveau ticket | Twichify" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
