import {
  Rocket,
  Music,
  Bot,
  Tv,
  MessageSquare,
  Megaphone,
  Radio,
  TrendingUp,
  Activity,
  User,
  ShieldCheck,
  Key,
  Lightbulb,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import type { FaqCategoryKey } from "@/lib/faq-categories";

// Icône par catégorie : partagée par la page d'aide et le formulaire de ticket.
// Libellés, ordre et descriptions viennent de lib/faq-categories.ts (le type force à garder les deux en phase).
export const FAQ_CATEGORY_ICONS: Record<FaqCategoryKey, LucideIcon> = {
  demarrage: Rocket,
  spotify: Music,
  bot: Bot,
  obs: Tv,
  chat: MessageSquare,
  bandeau: Megaphone,
  twitch: Radio,
  stats: TrendingUp,
  statut: Activity,
  compte: User,
  securite: ShieldCheck,
  api: Key,
  communaute: Lightbulb,
  autre: HelpCircle,
};

/** Icône d'une catégorie ; une clé inconnue (ancienne donnée) retombe sur « Autre ». */
export const faqCategoryIcon = (key: string): LucideIcon =>
  (FAQ_CATEGORY_ICONS as Record<string, LucideIcon>)[key] ?? HelpCircle;
