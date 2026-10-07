import type { Metadata } from "next";

export const metadata: Metadata = { title: "Widget Chat | Twichify" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
