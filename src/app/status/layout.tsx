import type { Metadata } from "next";

export const metadata: Metadata = { title: "État des services | Twichify" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
