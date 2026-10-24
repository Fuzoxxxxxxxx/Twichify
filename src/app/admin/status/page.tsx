"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Megaphone, Plus, Send, Trash2, X } from "lucide-react";
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
import { useDialog } from "@/components/DialogProvider";
import { PageHeader } from "@/components/dashboard/DashboardUI";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

interface Incident {
  _id: string;
  title: string;
  service: string;
  status: IncidentStatus;
  impact: IncidentImpact;
  createdAt: string;
  resolvedAt?: string;
  bannerActive?: boolean;
  updates?: { message: string; status?: IncidentStatus; createdAt: string }[];
}

interface LiveService {
  name: string;
  status: string;
}

type Form = {
  title: string;
  service: string;
  impact: IncidentImpact;
  status: IncidentStatus;
  message: string;
  showBanner: boolean;
};

type UpdatePayload = { status?: IncidentStatus; message?: string; banner?: boolean };

const EMPTY_FORM: Form = {
  title: "",
  service: INCIDENT_SERVICES[0],
  impact: "minor",
  status: "investigating",
  message: "",
  showBanner: false,
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const chip = (active: boolean) =>
  `cursor-pointer rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${FOCUS} ${
    active
      ? "border-purple-500/60 bg-purple-500/20 text-purple-100"
      : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
  }`;

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60";

async function api(
  url: string,
  method: string,
  body?: unknown
): Promise<{ ok: boolean; error?: string; data?: { bannerNote?: string } }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data };
    return { ok: false, error: data.error || `Erreur ${res.status}` };
  } catch {
    return { ok: false, error: "Erreur réseau" };
  }
}

/** Boutons de modèles de messages : remplissent le statut et le texte, l'admin complète. */
function Templates({ onPick }: { onPick: (status: IncidentStatus, text: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm text-zinc-400">Modèles</span>
      {MESSAGE_TEMPLATES.map((t) => (
        <button
          key={t.label}
          type="button"
          onClick={() => onPick(t.status, t.text)}
          className={`cursor-pointer rounded-full border border-white/10 px-3.5 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-white ${FOCUS}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function StatusPicker({ value, onChange }: { value: IncidentStatus; onChange: (v: IncidentStatus) => void }) {
  return (
    <div role="group" aria-label="Statut" className="flex flex-wrap gap-2">
      {INCIDENT_STATUSES.map((s) => (
        <button key={s} type="button" onClick={() => onChange(s)} aria-pressed={value === s} className={chip(value === s)}>
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
  onUpdate: (id: string, payload: UpdatePayload) => Promise<boolean>;
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
      className={`space-y-4 rounded-2xl border p-5 ${
        resolved ? "border-white/10 bg-white/[0.02]" : "border-amber-500/30 bg-amber-500/[0.05]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base font-semibold text-white">{incident.title}</p>
          <p className="mt-1 text-sm text-zinc-400">
            {incident.service} · {IMPACT_LABELS[incident.impact] ?? incident.impact} · ouvert le {fmt(incident.createdAt)}
            {incident.resolvedAt && ` · résolu le ${fmt(incident.resolvedAt)}`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${
            resolved ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          {STATUS_LABELS[incident.status] ?? incident.status}
        </span>
      </div>

      {updates.length > 0 && (
        <ol className="space-y-2 border-l border-white/10 pl-4">
          {updates.map((u, i) => (
            <li key={i}>
              <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">{u.message}</p>
              <p className="text-xs text-zinc-400">{fmt(u.createdAt)}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="space-y-3 border-t border-white/10 pt-4">
        <p className="text-sm font-medium text-zinc-200">
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
          aria-label="Message de mise à jour"
          placeholder="Message visible publiquement sur la page de statut..."
          className={`${inputCls} resize-none`}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={send}
            disabled={!canSend}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-50 ${FOCUS}`}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Publier
          </button>
          {!resolved && (
            <button
              onClick={() => onUpdate(incident._id, { status: "resolved" })}
              disabled={busy}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              Marquer résolu
            </button>
          )}
          {!resolved && (
            <button
              onClick={() => onUpdate(incident._id, { banner: !incident.bannerActive })}
              disabled={busy}
              aria-pressed={!!incident.bannerActive}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${FOCUS} ${
                incident.bannerActive
                  ? "border-purple-500/50 bg-purple-500/15 text-purple-100 hover:bg-purple-500/25"
                  : "border-white/15 text-zinc-300 hover:border-white/30 hover:text-white"
              }`}
            >
              <Megaphone size={14} />
              {incident.bannerActive ? "Retirer la bannière" : "Afficher en bannière"}
            </button>
          )}
          <button
            onClick={() => onDelete(incident._id)}
            disabled={busy}
            className="ml-auto cursor-pointer rounded-lg border border-red-500/25 bg-red-500/10 p-2.5 text-red-300 transition-colors hover:bg-red-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:opacity-50"
            title="Supprimer définitivement"
            aria-label="Supprimer définitivement"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminStatusPage() {
  const { confirm } = useDialog();
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
      showBanner: down, // une panne franche mérite d'être signalée partout, une dégradation reste sur la page de statut
    });
    setCreating(true);
  };

  const createIncident = async () => {
    if (saving || !form.title.trim() || !form.message.trim()) return;
    setSaving(true);
    const res = await api("/api/admin/incidents", "POST", form);
    setSaving(false);
    if (!res.ok) return flash("error", res.error || "Échec de la création");
    const note = res.data?.bannerNote;
    flash(
      note ? "error" : "ok",
      note ?? (form.showBanner ? "Incident publié sur la page de statut et en bannière" : "Incident publié sur la page de statut")
    );
    setCreating(false);
    setForm(EMPTY_FORM);
    load();
  };

  const updateIncident = async (id: string, payload: UpdatePayload) => {
    setBusyId(id);
    const res = await api(`/api/admin/incidents/${id}`, "PATCH", payload);
    setBusyId(null);
    if (!res.ok) {
      flash("error", res.error || "Échec de la mise à jour");
      return false;
    }
    const bannerNote = res.data?.bannerNote;
    flash(bannerNote ? "error" : "ok", bannerNote ?? "Mise à jour publiée");
    load();
    return true;
  };

  const deleteIncident = async (id: string) => {
    const ok = await confirm({
      title: "Supprimer cet incident ?",
      description: "Suppression définitive. Pour le clore normalement, utilise « Marquer résolu ».",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    setBusyId(id);
    const res = await api(`/api/admin/incidents/${id}`, "DELETE");
    setBusyId(null);
    if (!res.ok) return flash("error", res.error || "Échec de la suppression");
    flash("ok", "Incident supprimé");
    load();
  };

  if (denied) {
    return (
      <div role="alert" className="mx-auto mt-10 max-w-md rounded-2xl border border-red-500/25 bg-white/[0.02] p-8 text-center">
        <AlertTriangle className="mx-auto text-red-400 mb-3" size={32} />
        <h2 className="mb-2 text-lg font-bold">Accès refusé</h2>
        <p className="text-sm text-zinc-400">Ton rôle ne permet pas de gérer les incidents.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Page de statut"
        title="Incidents"
        action={
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <Link
              href="/status"
              target="_blank"
              className={`inline-flex items-center gap-1.5 rounded text-sm text-zinc-400 transition-colors hover:text-purple-300 ${FOCUS}`}
            >
              Voir la page publique <ExternalLink size={13} />
            </Link>
            <button
              onClick={() => {
                setForm(EMPTY_FORM);
                setCreating(true);
              }}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500 ${FOCUS}`}
            >
              <Plus size={16} />
              <span>Nouvel incident</span>
            </button>
          </div>
        }
      />

      {notice && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            notice.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/30 bg-rose-500/10 text-rose-200"
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
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="shrink-0 text-rose-300" />
                <p className="text-sm text-zinc-200">
                  <strong className="font-semibold text-white">{s.name}</strong> est{" "}
                  {s.status === "Down" ? "en panne" : "dégradé"} et aucun incident n&apos;est publié.
                </p>
              </div>
              <button
                onClick={() => startFromService(s)}
                className="cursor-pointer rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
              >
                Prévenir les utilisateurs
              </button>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <div className="space-y-5 rounded-2xl border border-purple-500/30 bg-white/[0.02] p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <p className="text-base font-semibold text-white">Nouvel incident</p>
            <button
              onClick={() => setCreating(false)}
              aria-label="Fermer le formulaire"
              className={`cursor-pointer rounded p-2 text-zinc-400 transition-colors hover:text-white ${FOCUS}`}
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-2">
            <p id="inc-service-label" className="text-sm font-medium text-zinc-200">Service concerné</p>
            <div role="group" aria-labelledby="inc-service-label" className="flex flex-wrap gap-2">
              {INCIDENT_SERVICES.map((s) => (
                <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, service: s }))} aria-pressed={form.service === s} className={chip(form.service === s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p id="inc-impact-label" className="text-sm font-medium text-zinc-200">Impact</p>
            <div role="group" aria-labelledby="inc-impact-label" className="flex flex-wrap gap-2">
              {INCIDENT_IMPACTS.map((i) => (
                <button key={i} type="button" onClick={() => setForm((f) => ({ ...f, impact: i }))} aria-pressed={form.impact === i} className={chip(form.impact === i)}>
                  {IMPACT_LABELS[i]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-200">Statut</p>
            <StatusPicker value={form.status} onChange={(s) => setForm((f) => ({ ...f, status: s }))} />
          </div>

          <div className="space-y-2">
            <label htmlFor="inc-title" className="text-sm font-medium text-zinc-200">Titre</label>
            <input
              id="inc-title"
              type="text"
              value={form.title}
              maxLength={TITLE_MAX}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex. Widget musique indisponible"
              className={inputCls}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="inc-message" className="text-sm font-medium text-zinc-200">Message public</label>
            <Templates onPick={(s, t) => setForm((f) => ({ ...f, status: s, message: t }))} />
            <textarea
              id="inc-message"
              value={form.message}
              maxLength={MESSAGE_MAX}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              rows={4}
              placeholder="Que se passe-t-il ? Qui est touché ? Quand la prochaine mise à jour ?"
              className={`${inputCls} resize-none`}
            />
            <p className="text-right text-xs tabular-nums text-zinc-400">
              {form.message.length}/{MESSAGE_MAX}
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-4">
            <input
              type="checkbox"
              checked={form.showBanner}
              onChange={(e) => setForm((f) => ({ ...f, showBanner: e.target.checked }))}
              className="mt-0.5 h-4 w-4 accent-purple-500"
            />
            <span>
              <span className="block text-sm font-semibold text-white">Afficher aussi en bannière sur tout le site</span>
              <span className="block text-sm text-zinc-400">
                Retirée automatiquement à la résolution. Ne remplace jamais une annonce manuelle du propriétaire.
              </span>
            </span>
          </label>

          <button
            onClick={createIncident}
            disabled={saving || !form.title.trim() || !form.message.trim()}
            className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-50 ${FOCUS}`}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            <span>Publier l&apos;incident</span>
          </button>
          <p className="text-xs text-zinc-400">
            Visible sur /status après quelques secondes (cache de 15 s).
          </p>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center" aria-busy="true">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-purple-400" />
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-amber-300">
              En cours ({active.length})
            </h2>
            {active.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                <p className="text-sm font-medium text-zinc-300">Aucun incident en cours.</p>
              </div>
            ) : (
              active.map((i) => (
                <IncidentCard key={i._id} incident={i} busy={busyId === i._id} onUpdate={updateIncident} onDelete={deleteIncident} />
              ))
            )}
          </section>

          {resolved.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-bold text-zinc-300">
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
