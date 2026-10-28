import { NextResponse } from "next/server";
import mongoose from "mongoose";
import NotificationModel from "@/models/Notification";
import { getSessionUser } from "@/lib/auth-helpers";
import {
  NOTIFICATION_DEFAULT_LIMIT,
  NOTIFICATION_MAX_LIMIT,
  type NotificationItem,
  type NotificationType,
} from "@/lib/notification-types";

export const dynamic = "force-dynamic";

async function ensureDb() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }
}

function toItem(n: any): NotificationItem {
  return {
    id: String(n._id),
    type: n.type as NotificationType,
    title: n.title,
    body: n.body || "",
    href: n.href || null,
    read: !!n.readAt,
    createdAt: new Date(n.createdAt).toISOString(),
  };
}

// GET : notifications de l'utilisateur connecté, les plus récentes d'abord.
// Paramètres : ?limit=30 (max 100), ?unread=1 (seulement les non lues). Renvoie aussi le total de non lues.
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const requested = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(requested) && requested > 0
      ? Math.min(Math.floor(requested), NOTIFICATION_MAX_LIMIT)
      : NOTIFICATION_DEFAULT_LIMIT;
    const onlyUnread = url.searchParams.get("unread") === "1";

    await ensureDb();
    const userId = String(user._id);

    const [docs, unreadCount] = await Promise.all([
      NotificationModel.find({ userId, ...(onlyUnread ? { readAt: null } : {}) })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments({ userId, readAt: null }),
    ]);

    return NextResponse.json({ notifications: docs.map(toItem), unreadCount }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Erreur GET notifications:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST : actions sur ses propres notifications.
//   { action: "read", ids: string[] }   marque comme lues
//   { action: "readAll" }               marque toutes comme lues
//   { action: "delete", ids: string[] } supprime
//   { action: "clearRead" }             supprime toutes les notifications déjà lues
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const ids: string[] = Array.isArray(body?.ids)
      ? body.ids.filter((id: unknown) => typeof id === "string" && mongoose.isValidObjectId(id)).slice(0, NOTIFICATION_MAX_LIMIT)
      : [];

    await ensureDb();
    const userId = String(user._id);

    switch (action) {
      case "read":
        if (ids.length === 0) return NextResponse.json({ error: "Aucun identifiant valide" }, { status: 400 });
        await NotificationModel.updateMany({ userId, _id: { $in: ids }, readAt: null }, { $set: { readAt: new Date() } });
        break;
      case "readAll":
        await NotificationModel.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
        break;
      case "delete":
        if (ids.length === 0) return NextResponse.json({ error: "Aucun identifiant valide" }, { status: 400 });
        await NotificationModel.deleteMany({ userId, _id: { $in: ids } });
        break;
      case "clearRead":
        await NotificationModel.deleteMany({ userId, readAt: { $ne: null } });
        break;
      default:
        return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }

    const unreadCount = await NotificationModel.countDocuments({ userId, readAt: null });
    return NextResponse.json({ ok: true, unreadCount });
  } catch (error) {
    console.error("Erreur POST notifications:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
