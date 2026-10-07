const statusMeta: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  en_attente: { label: "En attente", dot: "bg-amber-400", text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  en_cours: { label: "En cours", dot: "bg-blue-400", text: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  resolu: { label: "Résolu", dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  ferme: { label: "Fermé", dot: "bg-zinc-400", text: "text-zinc-300", bg: "bg-zinc-500/10", border: "border-zinc-500/30" },
};

export default function TicketStatusBadge({ status }: { status: string }) {
  const meta = statusMeta[status] || statusMeta.en_attente;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${meta.bg} ${meta.border} ${meta.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}