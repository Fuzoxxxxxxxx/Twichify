// Durée écoulée depuis une date ISO, en français (« il y a 5 min », « il y a 2 j », puis la date au-delà d'une semaine).
export function timeAgo(iso: string, now: number = Date.now()): string {
  const diffSeconds = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  if (diffSeconds < 60) return "à l'instant";

  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;

  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
