"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  Crown,
  ShieldCheck,
  Shield,
  User as UserIcon,
  Star,
  HandHelping,
  Lock,
  Users,
  ArrowUpDown,
  LifeBuoy,
  HelpCircle,
  KeyRound,
  ChevronDown,
} from "lucide-react";
import { ROLE_LABELS, canActOn, assignableRoles, hasPermission, PERMISSIONS, getRoleLevel, ALL_ROLES, PERMISSION_LABELS } from "@/lib/roles";
import { useDialog } from "@/components/DialogProvider";
import { PageHeader } from "@/components/dashboard/DashboardUI";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400";

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  hasSpotifyToken: boolean;
  hasAcceptedTerms: boolean;
  createdAt?: string;
}

const roleIcons: Record<string, any> = {
  creator: Star,
  co_creator: Crown,
  admin: ShieldCheck,
  moderator: Shield,
  helper: HandHelping,
  user: UserIcon,
};

const roleColors: Record<string, string> = {
  creator: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  co_creator: "border-red-500/30 bg-red-500/10 text-red-300",
  admin: "border-purple-500/30 bg-purple-500/10 text-purple-300",
  moderator: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  helper: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  user: "border-zinc-800 bg-zinc-900/60 text-zinc-400",
};

const permissionIcons: Record<string, any> = {
  viewAdminPanel: Shield,
  manageTickets: LifeBuoy,
  manageFaq: HelpCircle,
  viewUsers: Users,
  manageRoles: KeyRound,
  deleteUsers: Trash2,
};

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const { confirm, notify } = useDialog();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string>("user");
  const [sortBy, setSortBy] = useState<"name" | "role" | "date" | "spotify">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const currentUserId = (session?.user as any)?.id;

  const fetchUsers = () => {
    fetch("/api/admin/users")
      .then((r) => {
        if (r.status === 403) throw new Error("forbidden");
        return r.json();
      })
      .then((data) => setUsers(data.users || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => setMyRole(data.role || "user"))
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }, [users, search]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return dir * (a.name || "").localeCompare(b.name || "");
        case "role":
          return dir * (getRoleLevel(a.role) - getRoleLevel(b.role));
        case "spotify":
          return dir * (Number(a.hasSpotifyToken) - Number(b.hasSpotifyToken));
        case "date":
        default:
          return dir * (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      }
    });
    return list;
  }, [filtered, sortBy, sortDir]);

  const myAssignableRoles = useMemo(() => assignableRoles(myRole), [myRole]);
  const canManageRoles = hasPermission(myRole, PERMISSIONS.MANAGE_ROLES);
  const canDeleteUsers = hasPermission(myRole, PERMISSIONS.DELETE_USERS);

  const sortOptions: { id: typeof sortBy; label: string }[] = [
    { id: "date", label: "Date d'inscription" },
    { id: "name", label: "Nom" },
    { id: "role", label: "Rôle" },
    { id: "spotify", label: "Statut Spotify" },
  ];

  const [showPermMatrix, setShowPermMatrix] = useState(false);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
      } else {
        const data = await res.json();
        notify(data.error || "Erreur lors de la mise à jour du rôle.", "error");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    const ok = await confirm({
      title: `Supprimer le compte de ${userName} ?`,
      description: "Cette action est définitive et irréversible.",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u._id !== userId));
      } else {
        const data = await res.json();
        notify(data.error || "Erreur lors de la suppression.", "error");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  if (error) {
    return (
      <div role="alert" className="mx-auto mt-10 max-w-md rounded-2xl border border-red-500/25 bg-white/[0.02] p-8 text-center">
        <AlertTriangle className="mx-auto text-red-400 mb-3" size={32} />
        <h2 className="mb-2 text-lg font-bold">Accès refusé</h2>
        <p className="text-sm text-zinc-400">
          Cette section est réservée au staff.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Utilisateurs"
        action={
          <div className="flex items-center gap-2 self-start rounded-lg border border-white/10 px-3.5 py-2.5 sm:self-auto">
            <Users size={15} className="text-purple-300" />
            <span className="text-sm text-zinc-400">
              <strong className="font-semibold text-white">{users.length}</strong> compte{users.length > 1 ? "s" : ""} · Ton rôle : <span className="font-medium text-purple-200">{ROLE_LABELS[myRole]}</span>
            </span>
          </div>
        }
      />

      {/* MATRICE DES PERMISSIONS PAR RÔLE */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <button
          onClick={() => setShowPermMatrix((v) => !v)}
          aria-expanded={showPermMatrix}
          className={`flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.02] ${FOCUS}`}
        >
          <div className="flex items-center gap-3">
            <KeyRound size={16} className="text-purple-300" />
            <div>
              <p className="text-base font-semibold text-zinc-100">Permissions par rôle</p>
              <p className="mt-0.5 text-sm text-zinc-400">Chaque rôle dispose de son propre ensemble d'actions autorisées</p>
            </div>
          </div>
          <ChevronDown size={16} className={`text-zinc-400 transition-transform duration-200 shrink-0 ${showPermMatrix ? "rotate-180" : ""}`} />
        </button>

        {showPermMatrix && (
          <div className="border-t border-white/10 p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {ALL_ROLES.slice().reverse().map((role) => {
                const RoleIcon = roleIcons[role] || UserIcon;
                const granted = Object.values(PERMISSIONS).filter((p) => hasPermission(role, p));
                const denied = Object.values(PERMISSIONS).filter((p) => !hasPermission(role, p));

                return (
                  <div
                    key={role}
                    className={`rounded-2xl border p-4 ${roleColors[role]}`}
                  >
                    <div className="mb-3.5 flex items-center gap-2.5 border-b border-white/10 pb-3.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30">
                        <RoleIcon size={15} />
                      </div>
                      <p className="text-base font-semibold">{ROLE_LABELS[role]}</p>
                    </div>

                    <div className="space-y-2">
                      {granted.length === 0 ? (
                        <p className="text-sm italic text-zinc-400">Aucune permission : accès standard.</p>
                      ) : (
                        granted.map((p) => {
                          const PermIcon = permissionIcons[p] || CheckCircle2;
                          return (
                            <div key={p} className="flex items-center gap-2 text-sm font-medium">
                              <PermIcon size={12} className="shrink-0 opacity-80" />
                              <span>{PERMISSION_LABELS[p]}</span>
                            </div>
                          );
                        })
                      )}

                      {denied.length > 0 && (
                        <details className="pt-1.5 group/details">
                          <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-zinc-200">
                            <ChevronDown size={12} className="transition-transform group-open/details:rotate-180" />
                            {denied.length} permission{denied.length > 1 ? "s" : ""} non accordée{denied.length > 1 ? "s" : ""}
                          </summary>
                          <div className="mt-1.5 space-y-1.5 pl-3.5">
                            {denied.map((p) => {
                              const PermIcon = permissionIcons[p] || XCircle;
                              return (
                                <div key={p} className="flex items-center gap-2 text-xs text-zinc-500 line-through decoration-zinc-700">
                                  <PermIcon size={12} className="shrink-0 opacity-50" />
                                  <span>{PERMISSION_LABELS[p]}</span>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* BARRE DE RECHERCHE ET TRI */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou e-mail..."
            aria-label="Rechercher un utilisateur"
            className="w-full rounded-lg border border-white/10 bg-white/[0.02] py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500/60"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            aria-label="Trier les utilisateurs"
            className="cursor-pointer rounded-lg border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-200 outline-none transition-colors focus:border-purple-500/60"
          >
            {sortOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                Trier par : {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-white ${FOCUS}`}
            title={sortDir === "asc" ? "Ordre croissant" : "Ordre décroissant"}
          >
            <ArrowUpDown size={14} />
            {sortDir === "asc" ? "Croissant" : "Décroissant"}
          </button>
        </div>
      </div>

      {/* LISTE DES UTILISATEURS */}
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center" aria-busy="true">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin mx-auto mb-2" />
          <p className="text-sm text-zinc-400">Chargement des utilisateurs...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-16 text-center">
          <UserIcon size={28} className="mx-auto mb-3 text-zinc-600" />
          <p className="text-sm text-zinc-300">Aucun utilisateur trouvé.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((u) => {
            const RoleIcon = roleIcons[u.role] || UserIcon;
            const roleClass = roleColors[u.role] || roleColors.user;
            const isSelf = u._id === currentUserId;
            const isUpdating = updatingId === u._id;
            const isLocked = !isSelf && !canActOn(myRole, u.role);

            return (
              <div
                key={u._id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20 sm:flex-row sm:items-center sm:p-5"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {u.image ? (
                    <img src={u.image} alt="" className="w-10 h-10 rounded-xl border border-zinc-700/80 object-cover shrink-0" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                      <UserIcon size={18} className="text-zinc-500" />
                    </div>
                  )}

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base font-semibold text-white">{u.name || "—"}</p>
                      {isSelf && (
                        <span className="rounded border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-xs font-semibold text-purple-200">
                          Toi
                        </span>
                      )}
                    </div>

                    <p className="truncate text-sm text-zinc-400">{u.email}</p>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${roleClass}`}>
                        <RoleIcon size={12} />
                        {ROLE_LABELS[u.role] || u.role}
                      </span>

                      {u.hasSpotifyToken ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-200">
                          <CheckCircle2 size={12} /> Spotify
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-0.5 text-xs font-medium text-zinc-400">
                          <XCircle size={12} /> Non lié
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 border-t border-white/10 pt-3 sm:border-t-0 sm:pt-0">
                  {isLocked ? (
                    <span
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-zinc-400"
                      title="Niveau égal ou supérieur au tien : aucune action possible"
                    >
                      <Lock size={13} />
                      Verrouillé
                    </span>
                  ) : (
                    <>
                      {canManageRoles && (
                        <select
                          value={u.role}
                          disabled={isSelf || isUpdating}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                          aria-label={`Rôle de ${u.name}`}
                          className="cursor-pointer rounded-lg border border-white/15 bg-zinc-950 px-3 py-2.5 text-sm font-medium text-zinc-200 outline-none transition-colors focus:border-purple-500/60 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {!myAssignableRoles.includes(u.role as any) && (
                            <option value={u.role} disabled>
                              {ROLE_LABELS[u.role]}
                            </option>
                          )}
                          {myAssignableRoles.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      )}

                      {canDeleteUsers && (
                        <button
                          onClick={() => handleDelete(u._id, u.name)}
                          disabled={isSelf || isUpdating}
                          className="cursor-pointer rounded-lg border border-red-500/25 bg-red-500/10 p-2.5 text-red-300 transition-colors hover:bg-red-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:opacity-30"
                          title="Supprimer le compte"
                          aria-label={`Supprimer le compte de ${u.name}`}
                        >
                          {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      )}

                      {!canManageRoles && !canDeleteUsers && (
                        <span className="px-2 text-sm text-zinc-400">
                          Lecture seule
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}