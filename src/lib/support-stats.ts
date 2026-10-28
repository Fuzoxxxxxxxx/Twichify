// Calculs des statistiques du support : fonctions pures (aucun accès base), donc faciles à vérifier.
// Les durées sont en millisecondes ; l'interface se charge de les formater.

export interface StatsMessage {
  authorId?: string;
  authorName?: string;
  authorRole: string;
  createdAt: Date | string;
}

export interface StatsTicket {
  _id: unknown;
  subject: string;
  category: string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  assignedTo?: { userId: string; userName: string } | null;
  satisfaction?: { rating?: string; comment?: string; ratedAt?: Date | string | null } | null;
  messages: StatsMessage[];
}

export const STATS_PERIODS = [7, 30, 90] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;
const CLOSED_STATUSES = ["resolu", "ferme"];

const time = (d: Date | string) => new Date(d).getTime();

export const isStaffMessage = (m: StatsMessage) => m.authorRole !== "user" && m.authorRole !== "system";

/** Délai entre l'ouverture du ticket et la première réponse d'un membre du staff (null si personne n'a répondu). */
export function firstResponseMs(t: StatsTicket): number | null {
  const first = t.messages
    .filter(isStaffMessage)
    .map((m) => time(m.createdAt))
    .sort((a, b) => a - b)[0];
  if (first === undefined) return null;
  return Math.max(0, first - time(t.createdAt));
}

/**
 * Moment de clôture d'un ticket résolu ou fermé : dernier message système (« marqué comme résolu »…),
 * à défaut la dernière mise à jour. Null si le ticket est encore ouvert.
 */
export function closedAt(t: StatsTicket): number | null {
  if (!CLOSED_STATUSES.includes(t.status)) return null;
  const lastSystem = t.messages
    .filter((m) => m.authorRole === "system")
    .map((m) => time(m.createdAt))
    .sort((a, b) => b - a)[0];
  return lastSystem ?? time(t.updatedAt);
}

const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface PeriodStats {
  created: number;
  closed: number;
  /** closed / created, ou null s'il n'y a aucun ticket. */
  resolutionRate: number | null;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  answered: number;
  unanswered: number;
  avgFirstResponseMs: number | null;
  medianFirstResponseMs: number | null;
  /** Part des tickets répondus qui l'ont été en moins de 24 h (null si aucun ticket répondu). */
  answeredWithin24hRate: number | null;
  avgResolutionMs: number | null;
  medianResolutionMs: number | null;
  avgMessagesPerTicket: number | null;
  /** Tickets pour lesquels le demandeur a répondu à l'enquête de satisfaction. */
  rated: number;
  /** Parmi eux, ceux qui disent que leur problème est réglé. */
  satisfied: number;
  /** satisfied / rated, ou null si personne n'a répondu. */
  satisfactionRate: number | null;
}

export function computePeriod(tickets: StatsTicket[]): PeriodStats {
  const byStatus: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const firstResponses: number[] = [];
  const resolutions: number[] = [];
  let closed = 0;
  let messageCount = 0;
  let rated = 0;
  let satisfied = 0;

  for (const t of tickets) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    messageCount += t.messages.filter((m) => m.authorRole !== "system").length;

    if (t.satisfaction?.rating === "yes" || t.satisfaction?.rating === "no") {
      rated++;
      if (t.satisfaction.rating === "yes") satisfied++;
    }

    const response = firstResponseMs(t);
    if (response !== null) firstResponses.push(response);

    const end = closedAt(t);
    if (end !== null) {
      closed++;
      resolutions.push(Math.max(0, end - time(t.createdAt)));
    }
  }

  return {
    created: tickets.length,
    closed,
    resolutionRate: tickets.length ? closed / tickets.length : null,
    byStatus,
    byCategory,
    answered: firstResponses.length,
    unanswered: tickets.length - firstResponses.length,
    avgFirstResponseMs: average(firstResponses),
    medianFirstResponseMs: median(firstResponses),
    answeredWithin24hRate: firstResponses.length ? firstResponses.filter((ms) => ms <= DAY_MS).length / firstResponses.length : null,
    avgResolutionMs: average(resolutions),
    medianResolutionMs: median(resolutions),
    avgMessagesPerTicket: tickets.length ? messageCount / tickets.length : null,
    rated,
    satisfied,
    satisfactionRate: rated ? satisfied / rated : null,
  };
}

export interface NegativeFeedback {
  id: string;
  subject: string;
  comment: string;
  ratedAt: string;
}

/** Les 5 derniers retours « problème non réglé » de la liste, du plus récent au plus ancien (avec leur commentaire s'il y en a un). */
export function computeNegativeFeedback(tickets: StatsTicket[]): NegativeFeedback[] {
  return tickets
    .filter((t) => t.satisfaction?.rating === "no")
    .map((t) => ({
      id: String(t._id),
      subject: t.subject,
      comment: (t.satisfaction?.comment ?? "").trim(),
      ratedAt: new Date(t.satisfaction?.ratedAt ?? t.updatedAt).toISOString(),
    }))
    .sort((a, b) => Date.parse(b.ratedAt) - Date.parse(a.ratedAt))
    .slice(0, 5);
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD (UTC)
  created: number;
  closed: number;
}

const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Une entrée par jour (UTC) entre `sinceMs` et `nowMs` inclus, avec les tickets créés et clôturés ce jour-là. */
export function buildDaily(tickets: StatsTicket[], sinceMs: number, nowMs: number): DailyPoint[] {
  const points = new Map<string, DailyPoint>();
  const startDay = Date.UTC(new Date(sinceMs).getUTCFullYear(), new Date(sinceMs).getUTCMonth(), new Date(sinceMs).getUTCDate());
  for (let ms = startDay; ms <= nowMs; ms += DAY_MS) {
    const key = dayKey(ms);
    points.set(key, { date: key, created: 0, closed: 0 });
  }

  for (const t of tickets) {
    const created = points.get(dayKey(time(t.createdAt)));
    if (created) created.created++;

    const end = closedAt(t);
    if (end !== null) {
      const closedPoint = points.get(dayKey(end));
      if (closedPoint) closedPoint.closed++;
    }
  }

  return Array.from(points.values());
}

export interface StaffActivity {
  id: string;
  name: string;
  role: string;
  replies: number;
  tickets: number;
  /** Nombre de tickets pour lesquels cette personne a donné la toute première réponse. */
  firstResponses: number;
}

export function computeStaffActivity(tickets: StatsTicket[]): StaffActivity[] {
  const map = new Map<string, StaffActivity & { ticketSet: Set<string> }>();

  for (const t of tickets) {
    const staffMessages = t.messages.filter(isStaffMessage).sort((a, b) => time(a.createdAt) - time(b.createdAt));
    staffMessages.forEach((m, index) => {
      const id = m.authorId || m.authorName || "inconnu";
      let entry = map.get(id);
      if (!entry) {
        entry = { id, name: m.authorName || "Staff", role: m.authorRole, replies: 0, tickets: 0, firstResponses: 0, ticketSet: new Set() };
        map.set(id, entry);
      }
      entry.replies++;
      entry.ticketSet.add(String(t._id));
      if (index === 0) entry.firstResponses++;
    });
  }

  return Array.from(map.values())
    .map(({ ticketSet, ...rest }) => ({ ...rest, tickets: ticketSet.size }))
    .sort((a, b) => b.replies - a.replies)
    .slice(0, 10);
}

export interface WaitingTicket {
  id: string;
  subject: string;
  category: string;
  ageMs: number;
}

export interface Backlog {
  open: number;
  waiting: number;
  inProgress: number;
  /** Tickets « en attente » les plus anciens, du plus ancien au plus récent (5 maximum). */
  oldestWaiting: WaitingTicket[];
}

/**
 * Backlog actuel (tous tickets encore ouverts, quelle que soit la période choisie).
 * L'âge d'un ticket en attente se compte depuis le dernier message du demandeur, ou la création à défaut,
 * pour ne pas faire passer pour « ancien » un ticket qui vient de recevoir une relance.
 */
export function computeBacklog(openTickets: StatsTicket[], nowMs: number): Backlog {
  const waiting = openTickets.filter((t) => t.status === "en_attente");

  const waitingSince = (t: StatsTicket) => {
    const lastStaff = t.messages.filter(isStaffMessage).map((m) => time(m.createdAt)).sort((a, b) => b - a)[0];
    const lastUser = t.messages.filter((m) => m.authorRole === "user").map((m) => time(m.createdAt)).sort((a, b) => b - a)[0];
    // En attente d'une réponse du staff : on part du dernier message du demandeur postérieur à la dernière réponse.
    if (lastUser !== undefined && (lastStaff === undefined || lastUser > lastStaff)) return lastUser;
    return time(t.createdAt);
  };

  return {
    open: openTickets.length,
    waiting: waiting.length,
    inProgress: openTickets.filter((t) => t.status === "en_cours").length,
    oldestWaiting: waiting
      .map((t) => ({ id: String(t._id), subject: t.subject, category: t.category, ageMs: Math.max(0, nowMs - waitingSince(t)) }))
      .sort((a, b) => b.ageMs - a.ageMs)
      .slice(0, 5),
  };
}
