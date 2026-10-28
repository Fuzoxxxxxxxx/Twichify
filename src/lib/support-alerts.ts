import mongoose from "mongoose";
import SupportTicket from "@/models/SupportTicket";
import User from "@/models/User";
import { ALL_ROLES, hasPermission, PERMISSIONS } from "@/lib/roles";
import { notify, snippet } from "@/lib/notifications";
import { isStaffMessage, type StatsMessage } from "@/lib/support-stats";

// Un ticket qui attend une réponse du staff depuis plus de STALE_TICKET_HOURS déclenche une alerte.
// Tant qu'il reste sans réponse, un rappel part au plus toutes les STALE_REALERT_HOURS.
export const STALE_TICKET_HOURS = 48;
export const STALE_REALERT_HOURS = 24;

// Plafond d'alertes par exécution : évite une rafale (et des centaines de notifications) au premier passage,
// quand beaucoup de vieux tickets sont déjà en attente. Les suivants seront traités aux exécutions suivantes.
const MAX_ALERTS_PER_RUN = 20;

const HOUR_MS = 60 * 60 * 1000;

interface OpenTicket {
  _id: unknown;
  userId: string;
  subject: string;
  status: string;
  createdAt: Date | string;
  assignedTo?: { userId: string; userName: string } | null;
  messages: StatsMessage[];
}

const time = (d: Date | string) => new Date(d).getTime();

/**
 * Depuis quand le ticket attend une réponse du staff : à partir de la création s'il n'a jamais reçu de réponse,
 * sinon à partir du dernier message du demandeur postérieur à la dernière réponse du staff.
 * Renvoie null si la balle est dans le camp du demandeur (le staff a répondu en dernier).
 */
export function awaitingStaffSince(t: Pick<OpenTicket, "createdAt" | "messages">): number | null {
  const staffTimes = t.messages.filter(isStaffMessage).map((m) => time(m.createdAt));
  const userTimes = t.messages.filter((m) => m.authorRole === "user").map((m) => time(m.createdAt));
  const lastStaff = staffTimes.length ? Math.max(...staffTimes) : undefined;
  const lastUser = userTimes.length ? Math.max(...userTimes) : undefined;

  if (lastStaff === undefined) return time(t.createdAt);
  if (lastUser !== undefined && lastUser > lastStaff) return lastUser;
  return null;
}

function formatWaiting(ms: number): string {
  const hours = Math.floor(ms / HOUR_MS);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
}

async function ensureDb() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.DATABASE_URL!);
  }
}

/**
 * Prévient le staff des tickets en attente depuis trop longtemps.
 * - Destinataire : la personne qui a pris le ticket en charge, sinon tous ceux qui peuvent gérer les tickets.
 * - Chaque ticket alerté est marqué (`staffAlertedAt`) pour limiter la fréquence des rappels.
 * Ne lève jamais d'erreur vers l'appelant : renvoie le nombre de tickets alertés.
 */
export async function runSupportAlerts(now: number = Date.now()): Promise<{ checked: number; alerted: number }> {
  try {
    await ensureDb();

    const realertBefore = new Date(now - STALE_REALERT_HOURS * HOUR_MS);
    const open = await SupportTicket.find({
      status: { $in: ["en_attente", "en_cours"] },
      $or: [{ staffAlertedAt: null }, { staffAlertedAt: { $lte: realertBefore } }],
    })
      .select("userId subject status createdAt assignedTo messages.authorRole messages.createdAt")
      .lean<OpenTicket[]>();

    const stale = open
      .map((t) => ({ ticket: t, since: awaitingStaffSince(t) }))
      .filter((x): x is { ticket: OpenTicket; since: number } => x.since !== null && now - x.since >= STALE_TICKET_HOURS * HOUR_MS)
      .sort((a, b) => a.since - b.since) // les plus anciens d'abord
      .slice(0, MAX_ALERTS_PER_RUN);

    if (stale.length === 0) return { checked: open.length, alerted: 0 };

    // Staff à prévenir quand personne n'a pris le ticket : chargé une seule fois par exécution.
    let allStaffIds: string[] | null = null;
    const loadStaffIds = async () => {
      if (allStaffIds === null) {
        const roles = ALL_ROLES.filter((r) => hasPermission(r, PERMISSIONS.MANAGE_TICKETS));
        const users = await User.find({ role: { $in: roles } }).select("_id").lean<{ _id: unknown }[]>();
        allStaffIds = users.map((u) => String(u._id));
      }
      return allStaffIds;
    };

    let alerted = 0;
    for (const { ticket, since } of stale) {
      const id = String(ticket._id);
      const assignee = ticket.assignedTo?.userId;
      const recipients = assignee ? [assignee] : await loadStaffIds();
      if (recipients.length === 0) continue;

      const waiting = formatWaiting(now - since);
      for (const userId of recipients) {
        await notify({
          userId,
          type: "ticket_stale",
          title: `Sans réponse depuis ${waiting} : « ${snippet(ticket.subject, 60)} »`,
          body: assignee ? "Ce ticket que tu as pris en charge attend une réponse." : "Personne n'a encore pris ce ticket en charge.",
          href: `/admin/tickets/${id}`,
          dedupeKey: `ticket:${id}:stale`,
        });
      }

      await SupportTicket.updateOne({ _id: id }, { $set: { staffAlertedAt: new Date(now) } });
      alerted++;
    }

    return { checked: open.length, alerted };
  } catch (error) {
    console.error("[support] échec des alertes de tickets en retard :", error);
    return { checked: 0, alerted: 0 };
  }
}

// Version à appeler depuis un cron fréquent (check-status) : au plus une exécution toutes les 15 minutes par instance.
let lastThrottledRun = 0;
const THROTTLE_MS = 15 * 60 * 1000;

export async function runSupportAlertsThrottled(now: number = Date.now()): Promise<void> {
  if (now - lastThrottledRun < THROTTLE_MS) return;
  lastThrottledRun = now;
  await runSupportAlerts(now);
}
