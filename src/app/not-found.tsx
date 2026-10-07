import type { Metadata } from "next";
import NotFoundContent from "@/components/NotFoundContent";

export const metadata: Metadata = { title: "Page introuvable | Twichify" };

export default function NotFound() {
  return <NotFoundContent />;
}
