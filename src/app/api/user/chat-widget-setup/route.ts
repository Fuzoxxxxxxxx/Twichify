import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route"; // À ajuster selon ton arborescence
import mongoose from "mongoose";
import User from "@/models/User";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    // On récupère les paramètres envoyés par le Dashboard pour le widget chat
    const { 
      theme,
      fontSize,
      showBadges,
      hideBots,
      hideCommands,
      animation,
      maxMessages,
      position,
      widgetWidth,
      showTimestamps,
      showColors,
      compactMode,
      charLimit,
      roleHighlights,
      moderationWords,
      moderationMode,
      messageLifetime,
      ignoredUsers,
      showReplies,
      highlightFirstMessage,
    } = await req.json();

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL!);
    }

    // On met à jour l'objet chatWidgetSettings
    await User.findOneAndUpdate(
      { email: session.user?.email },
      { 
        $set: { 
          "chatWidgetSettings.theme": theme,
          "chatWidgetSettings.fontSize": fontSize,
          "chatWidgetSettings.showBadges": showBadges,
          "chatWidgetSettings.hideBots": hideBots,
          "chatWidgetSettings.hideCommands": hideCommands,
          "chatWidgetSettings.animation": animation,
          "chatWidgetSettings.maxMessages": maxMessages,
          "chatWidgetSettings.position": position,
          "chatWidgetSettings.widgetWidth": widgetWidth,
          "chatWidgetSettings.showTimestamps": showTimestamps,
          "chatWidgetSettings.showColors": showColors,
          "chatWidgetSettings.compactMode": compactMode,
          "chatWidgetSettings.charLimit": charLimit,
          "chatWidgetSettings.roleHighlights": roleHighlights,
          "chatWidgetSettings.moderationWords": moderationWords,
          "chatWidgetSettings.moderationMode": moderationMode,
          "chatWidgetSettings.messageLifetime": messageLifetime,
          "chatWidgetSettings.ignoredUsers": ignoredUsers,
          "chatWidgetSettings.showReplies": showReplies,
          "chatWidgetSettings.highlightFirstMessage": highlightFirstMessage,
        } 
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur API Chat Design:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}