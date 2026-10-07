"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Plus, Send, Trash2, X } from "lucide-react";
import {
  IMPACT_LABELS,
  INCIDENT_IMPACTS,
  INCIDENT_SERVICES,
  INCIDENT_STATUSES,
  MESSAGE_MAX,
  MESSAGE_TEMPLATES,
  STATUS_LABELS,
  TITLE_MAX,
  type IncidentImpact,
  type IncidentStatus,
} from "@/lib/incidents";

interface Incident {
  _id: string;
  title: string;
  service: string;
  status: IncidentStatus;
  impact: IncidentImpact;
  createdAt: string;
  resolvedAt?: string;
  updates?: { message: string; status?: IncidentStatus; createdAt: string }[];
}

interface LiveService {
  name: string;
  status: string;
}

type Form = { title: string; service: string; impact: IncidentImpact; status: IncidentStatus; message: string };

const EMPTY_FORM: Form = {
  title: "",
  service: INCIDENT_SERVICES[0],
  impact: "minor",
  status: "investigating",
  message: "",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const chip = (active: boolean) =>
  `rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
    active
      ? "border-purple-500 bg-purple-500/20 text-purple-300"
      : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-white"
  }`;

const inputCls =
  "w-full rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 transition-colors";

async function api(url: string, method: string, body?: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.error || `Erreur ${res.status}` };
  } catch {
    return { ok: false, error: "Erreur réseau" };
  }
}

/** Boutons de modèles de messages : remplissent le statut et le texte, l'admin complète. */
function Templates({ onPick }: { onPick: (status: IncidentStatus, text: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mr-1">Modèles</span>
      {MESSAGE_TEMPLATES.map((t) => (
        <button
          key={t.label}
          type="button"
          onClick={() => onPick(t.status, t.text)}
          className="rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1 text-[11px] font-semibold text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function StatusPicker({ value, onChange }: { value: IncidentStatus; onChange: (v: IncidentStatus) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {INCIDENT_STATUSES.map((s) => (
        <button key={s} type="button" onClick={() => onChange(s)} className={chip(value === s)}>
          {STATUS_LABELS[s]}
        </button>
      ))}
    </div>
  );
}

function IncidentCard({
  incident,
  busy,
  onUpdate,
  onDelete,
}: {
  incident: Incident;
  busy: boolean;
  onUpdate: (id: string, payload: { status?: IncidentStatus; message?: string }) => Promise<boolean>;
  onDelete: (id: string) => void;
}) {
  const [status, setStatus] = useState<IncidentStatus>(incident.status);
  const [message, setMessage] = useState("");
  const resolved = incident.status === "resolved";
  const updates = [...(incident.updates ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const canSend = !busy && (message.trim().length > 0 || status !== incident.status);

  const send = async () => {
    const ok = await onUpdate(incident._id, { status, message });
    if (ok) setMessage("");
  };

  return (
    <div
      className={`rounded-2xl border p-5 backdrop-blur-xl space-y-4 ${
        resolved ? "border-zinc-800/80 bg-zinc-950/40" : "border-amber-500/25 bg-amber-950/10"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">{incident.title}</p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {incident.service} · {IMPACT_LABELS[incident.impact] ?? incident.impact} · ouvert le {fmt(incident.createdAt)}
            {incident.resolvedAt && ` · résolu le ${fmt(incident.resolvedAt)}`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
            resolved ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-amber-500/20 bg-amber-500/10 text-amber-400"
          }`}
        >
          {STATUS_LABELS[incident.status] ?? incident.status}
        </span>
      </div>

      {updates.length > 0 && (
        <ol className="space-y-2 border-l border-zinc-800 pl-4">
          {updates.map((u, i) => (
            <li key={i}>
              <p className="whitespace-pre-line text-xs leading-relaxed text-zinc-300">{u.message}</p>
              <p className="font-mono text-[10px] text-zinc-600">{fmt(u.createdAt)}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="space-y-3 border-t border-zinc-800/80 pt-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">
          {resolved ? "Rouvrir / compléter" : "Publier une mise à jour"}
        </p>
        <StatusPicker value={status} onChange={setStatus} />
        <Templates
          onPick={(s, t) => {
            setStatus(s);
            setMessage(t);
          }}
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MESSAGE_MAX}
          rows={3}
          placeholder="Message visible publiquement sur la page de statut..."
          className={`${inputCls} resize-none`}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={send}
            disabled={!canSend}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white transition-all disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Publier
          </button>
          {!resolved && (
            <button
              onClick={() => onUpdate(incident._id, { status: "resolved" })}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              Marquer résolu
            </button>
          )}
          <button
            onClick={() => onDelete(incident._id)}
            disabled={busy}
            className="ml-auto p-2 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            title="Supprimer définitivement"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminStatusPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [services, setServices] = useState<LiveService[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const flash = (type: "ok" | "error", text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const load = useCallback(async () => {
    try {
      const [inc, live] = await Promise.all([
        fetch("/api/admin/incidents", { cache: "no-store" }),
        fetch("/api/status").then((r) => (r.ok ? r.json() : { services: [] })).catch(() => ({ services: [] })),
      ]);
      if (inc.status === 403) return setDenied(true);
      const data = await inc.json();
      setIncidents(data.incidents || []);
      setServices(live.services || []);
    } catch {
      flash("error", "Impossible de charger les incidents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = useMemo(() => incidents.filter((i) => i.status !== "resolved"), [incidents]);
  const resolved = useMemo(() => incidents.filter((i) => i.status === "resolved"), [incidents]);

  // Services en panne / dégradés sans incident ouvert : rappel pour prévenir les utilisateurs.
  const uncovered = useMemo(
    () =>
      services.filter(
        (s) =>
          (s.status === "Down" || s.status === "Degraded") &&
          !active.some((i) => i.service === s.name || i.service === "Plusieurs services")
      ),
    [services, active]
  );

  const startFromService = (s: LiveService) => {
    const down = s.status === "Down";
    setForm({
      title: down ? `${s.name} : service indisponible` : `${s.name} : performances dégradées`,
      service: s.name,
      impact: down ? "major" : "minor",
      status: MESSAGE_TEMPLATES[0].status,
      message: MESSAGE_TEMPLATES[0].text,
    });
    setCreating(true);
  };

  const createIncident = async () => {
    if (saving || !form.title.trim() || !form.message.trim()) return;
    setSaving(true);
    const res = await api("/api/admin/incidents", "POST", form);
    setSaving(false);
    if (!res.ok) return flash("error", res.error || "Échec de la création");
    flash("ok", "Incident publié sur la page de statut");
    setCreating(false);
    setForm(EMPTY_FORM);
    load();
  };

  const updateIncident = async (id: string, payload: { status?: IncidentStatus; message?: string }) => {
    setBusyId(id);
    const res = await api(`/api/admin/incidents/${id}`, "PATCH", payload);
    setBusyId(null);
    if (!res.ok) {
      flash("error", res.error || "Échec de la mise à jour");
      return false;
    }
    flash("ok", "Mise à jour publiée");
    load();
    return true;
  };

  const deleteIncident = async (id: string) => {
    if (!confirm("Supprimer définitivement cet incident ? Pour le clore normalement, utilise « Marquer résolu ».")) return;
    setBusyId(id);
    const res = await api(`/api/admin/incidents/${id}`, "DELETE");
    setBusyId(null);
    if (!res.ok) return flash("error", res.error || "Échec de la suppression");
    flash("ok", "Incident supprimé");
    load();
  };

  if (denied) {
    return (
      <div className="max-w-md mx-auto text-center rounded-2xl border border-red-500/20 bg-zinc-950/80 p-8 backdrop-blur-xl mt-10">
        <AlertTriangle className="mx-auto text-red-400 mb-3" size={32} />
        <h2 className="text-lg font-bold mb-2">Accès refusé</h2>
        <p className="text-zinc-400 text-xs">Ton rôle ne permet pas de gérer les incidents.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400 mb-2">Page de statut</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white">Incidents</h1>
          <Link
            href="/status"
            target="_blank"
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-purple-400 transition-colors"
          >
            Voir la page publique <ExternalLink size={11} />
          </Link>
        </div>
        <button
          onClick={() => {
            setForm(EMPTY_FORM);
            setCreating(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-xs font-bold text-white transition-all shrink-0"
        >
          <Plus size={15} />
          <span>Nouvel incident</span>
        </button>
      </div>

      {notice && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
            notice.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {notice.text}
        </div>
      )}

      {uncovered.length > 0 && (
        <div className="space-y-2">
          {uncovered.map((s) => (
            <div
              key={s.name}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/25 bg-rose-950/20 px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                <p className="text-xs text-zinc-200">
                  <strong className="text-white">{s.name}</strong> est{" "}
                  {s.status === "Down" ? "en panne" : "dégradé"} et aucun incident n&apos;est publié.
                </p>
              </div>
              <button
                onClick={() => startFromService(s)}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white transition-all"
              >
                Prévenir les utilisateurs
              </button>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <div className="rounded-2xl border border-purple-500/30 bg-zinc-950/80 p-5 sm:p-6 backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400">Nouvel incident</p>
            <button onClick={() => setCreating(false)} className="p-1 text-zinc-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Service concerné</label>
            <div className="flex flex-wrap gap-2">
              {INCIDENT_SERVICES.map((s) => (
                <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, service: s }))} className={chip(form.service === s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Impact</label>
            <div className="flex flex-wrap gap-2">
              {INCIDENT_IMPACTS.map((i) => (
                <button key={i} type="button" onClick={() => setForm((f) => ({ ...f, impact: i }))} className={chip(form.impact === i)}>
                  {IMPACT_LABELS[i]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Statut</label>
            <StatusPicker value={form.status} onChange={(s) => setForm((f) => ({ ...f, status: s }))} />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Titre</label>
            <input
              type="text"
              value={form.title}
              maxLength={TITLE_MAX}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex. Widget musique indisponible"
              className={inputCls}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Message public</label>
            <Templates onPick={(s, t) => setForm((f) => ({ ...f, status: s, message: t }))} />
            <textarea
              value={form.message}
              maxLength={MESSAGE_MAX}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              rows={4}
              placeholder="Que se passe-t-il ? Qui est touché ? Quand la prochaine mise à jour ?"
              className={`${inputCls} resize-none`}
            />
            <p className="text-right text-[10px] text-zinc-600">
              {form.message.length}/{MESSAGE_MAX}
            </p>
          </div>

          <button
            onClick={createIncident}
            disabled={saving || !form.title.trim() || !form.message.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            <span>Publier l&apos;incident</span>
          </button>
          <p className="text-[10px] text-zinc-600">
            Visible sur /status après quelques secondes (cache de 15 s).
          </p>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center border border-zinc-800/80 bg-zinc-950/60 rounded-2xl backdrop-blur-xl">
          <Loader2 className="w-5 h-5 text-purple-500 animate-spin mx-auto" />
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
              En cours ({active.length})
            </h2>
            {active.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-950/30 p-5">
                <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                <p className="text-xs font-medium text-zinc-400">Aucun incident en cours.</p>
              </div>
            ) : (
              active.map((i) => (
                <IncidentCard key={i._id} incident={i} busy={busyId === i._id} onUpdate={updateIncident} onDelete={deleteIncident} />
              ))
            )}
          </section>

          {resolved.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">
                Résolus (30 derniers jours)
              </h2>
              {resolved.map((i) => (
                <IncidentCard key={i._id} incident={i} busy={busyId === i._id} onUpdate={updateIncident} onDelete={deleteIncident} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
