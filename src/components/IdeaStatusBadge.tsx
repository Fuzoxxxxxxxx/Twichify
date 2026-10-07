const statusMeta: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  en_etude: { label: "À l'étude", dot: "bg-amber-400", text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  planifie: { label: "Planifié", dot: "bg-cyan-400", text: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
  en_cours: { label: "En cours", dot: "bg-blue-400", text: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  termine: { label: "Terminé", dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  rejete: { label: "Rejeté", dot: "bg-red-400", text: "text-red-300", bg: "bg-red-500/10", border: "border-red-500/30" },
};

export default function IdeaStatusBadge({ status }: { status: string }) {
  const meta = statusMeta[status] || statusMeta.en_etude;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${meta.bg} ${meta.border} ${meta.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
