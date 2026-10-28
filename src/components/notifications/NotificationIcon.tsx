import { MessageCircle, CheckCircle2, Reply, Lightbulb, MessageSquareQuote, Megaphone, Hourglass, ThumbsDown, type LucideIcon } from "lucide-react";
import type { NotificationType } from "@/lib/notification-types";

// Pictogramme et couleur par type de notification (classes écrites en toutes lettres pour que Tailwind les détecte).
const TYPE_UI: Record<NotificationType, { icon: LucideIcon; box: string; label: string }> = {
  ticket_reply: { icon: MessageCircle, box: "border-purple-500/30 bg-purple-500/10 text-purple-300", label: "Support" },
  ticket_status: { icon: CheckCircle2, box: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", label: "Support" },
  ticket_user_reply: { icon: Reply, box: "border-amber-500/30 bg-amber-500/10 text-amber-300", label: "Support" },
  idea_status: { icon: Lightbulb, box: "border-sky-500/30 bg-sky-500/10 text-sky-300", label: "Idées" },
  idea_response: { icon: MessageSquareQuote, box: "border-purple-500/30 bg-purple-500/10 text-purple-300", label: "Idées" },
  idea_comment: { icon: MessageCircle, box: "border-sky-500/30 bg-sky-500/10 text-sky-300", label: "Idées" },
  announcement: { icon: Megaphone, box: "border-purple-500/30 bg-purple-500/10 text-purple-300", label: "Annonce" },
  ticket_stale: { icon: Hourglass, box: "border-amber-500/30 bg-amber-500/10 text-amber-300", label: "Alerte support" },
  ticket_feedback: { icon: ThumbsDown, box: "border-rose-500/30 bg-rose-500/10 text-rose-300", label: "Retour support" },
};

export function notificationLabel(type: NotificationType): string {
  return TYPE_UI[type]?.label ?? "Notification";
}

export default function NotificationIcon({ type, size = 16 }: { type: NotificationType; size?: number }) {
  const ui = TYPE_UI[type] ?? TYPE_UI.ticket_reply;
  const Icon = ui.icon;
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${ui.box}`}>
      <Icon size={size} aria-hidden="true" />
    </span>
  );
}
