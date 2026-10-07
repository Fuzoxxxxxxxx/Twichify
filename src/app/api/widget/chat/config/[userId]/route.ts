import { NextResponse, NextRequest } from "next/server";
import mongoose from "mongoose";
import { findUserByWidgetRef } from "@/lib/widget-token";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_CHAT_SETTINGS = {
  theme: "glass",
  fontSize: "14",
  showBadges: true,
  hideBots: false,
  hideCommands: false,
  animation: "slide",
  maxMessages: 8,
  position: "bottom-left",
  widgetWidth: 380,
  showTimestamps: false,
  showColors: true,
  compactMode: false,
  charLimit: 0,
  messageLifetime: 15,
  showReplies: false,
  highlightFirstMessage: false,
  ignoredUsers: [] as string[],
  roleHighlights: {
    moderator: { enabled: false, color: "#22c55e" },
    subscriber: { enabled: false, color: "#a855f7" },
    vip: { enabled: false, color: "#ec4899" },
    broadcaster: { enabled: false, color: "#ef4444" },
    bot: { enabled: false, color: "#f97316" },
  },
  moderationWords: [] as string[],
};

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId || userId === "undefined") {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    const user = await findUserByWidgetRef(userId);

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable." },
        { status: 404 }
      );
    }

    const merged = {
      ...DEFAULT_CHAT_SETTINGS,
      ...(user.chatWidgetSettings || {}),
      // Fusion profonde pour roleHighlights : évite qu'un ancien document partiel
      // (ex: seulement "moderator" enregistré) n'écrase les autres rôles par undefined.
      roleHighlights: {
        ...DEFAULT_CHAT_SETTINGS.roleHighlights,
        ...((user.chatWidgetSettings && (user.chatWidgetSettings as any).roleHighlights) || {}),
      },
    };

    return NextResponse.json({
      chatWidgetSettings: merged,
      twitchUsername: user.name, 
      // Le widget n'envoie ses compteurs que si l'utilisateur a activé les statistiques de chat.
      chatStatsEnabled: !!user.chatStats?.enabled,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });

  } catch (error) {
    console.error("Erreur API Chat Config:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}