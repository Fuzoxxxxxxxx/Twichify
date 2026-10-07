import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ticket | Twichify" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
