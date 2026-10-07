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

const roleGlow: Record<string, string> = {
  creator: "bg-amber-500/10",
  co_creator: "bg-red-500/10",
  admin: "bg-purple-500/10",
  moderator: "bg-cyan-500/10",
  helper: "bg-emerald-500/10",
  user: "bg-zinc-800/20",
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
        alert(data.error || "Erreur lors de la mise à jour du rôle.");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Supprimer définitivement le compte de ${userName} ? Cette action est irréversible.`)) return;
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u._id !== userId));
      } else {
        const data = await res.json();
        alert(data.error || "Erreur lors de la suppression.");
      }
    } finally {
      setUpdatingId(null);
    }
  };

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center rounded-2xl border border-red-500/20 bg-zinc-950/80 p-8 backdrop-blur-xl mt-10">
        <AlertTriangle className="mx-auto text-red-400 mb-3" size={32} />
        <h2 className="text-lg font-bold mb-2">Accès Refusé</h2>
        <p className="text-zinc-400 text-xs">
          Cette section est exclusivement réservée au staff.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ENTÊTE */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-purple-400 mb-1.5">
            Administration
          </p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white">
            Utilisateurs
          </h1>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3.5 py-2 backdrop-blur-md self-start sm:self-auto">
          <Users size={14} className="text-purple-400" />
          <span className="text-xs text-zinc-400">
            <strong className="text-white font-bold">{users.length}</strong> compte{users.length > 1 ? "s" : ""} · Ton rôle : <span className="text-purple-300 font-medium">{ROLE_LABELS[myRole]}</span>
          </span>
        </div>
      </div>

      {/* MATRICE DES PERMISSIONS PAR RÔLE */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl overflow-hidden">
        <button
          onClick={() => setShowPermMatrix((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
        >
          <div className="flex items-center gap-2.5">
            <KeyRound size={15} className="text-purple-400" />
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-zinc-200">Permissions par rôle</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Chaque rôle dispose de son propre ensemble d'actions autorisées</p>
            </div>
          </div>
          <ChevronDown size={16} className={`text-zinc-500 transition-transform duration-200 shrink-0 ${showPermMatrix ? "rotate-180" : ""}`} />
        </button>

        {showPermMatrix && (
          <div className="border-t border-zinc-800/80 p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {ALL_ROLES.slice().reverse().map((role) => {
                const RoleIcon = roleIcons[role] || UserIcon;
                const granted = Object.values(PERMISSIONS).filter((p) => hasPermission(role, p));
                const denied = Object.values(PERMISSIONS).filter((p) => !hasPermission(role, p));

                return (
                  <div
                    key={role}
                    className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${roleColors[role]}`}
                  >
                    <div className={`absolute -top-8 -right-8 h-28 w-28 rounded-full ${roleGlow[role]} blur-2xl pointer-events-none`} />

                    <div className="relative flex items-center gap-2.5 mb-3.5 pb-3.5 border-b border-white/10">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/30 border border-white/10 shrink-0">
                        <RoleIcon size={15} />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest">{ROLE_LABELS[role]}</p>
                    </div>

                    <div className="relative space-y-1.5">
                      {granted.length === 0 ? (
                        <p className="text-[11px] text-zinc-600 italic">Aucune permission — accès standard.</p>
                      ) : (
                        granted.map((p) => {
                          const PermIcon = permissionIcons[p] || CheckCircle2;
                          return (
                            <div key={p} className="flex items-center gap-2 text-[11px] font-semibold">
                              <PermIcon size={12} className="shrink-0 opacity-80" />
                              <span>{PERMISSION_LABELS[p]}</span>
                            </div>
                          );
                        })
                      )}

                      {denied.length > 0 && (
                        <details className="pt-1.5 group/details">
                          <summary className="text-[10px] text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors list-none flex items-center gap-1">
                            <ChevronDown size={10} className="transition-transform group-open/details:rotate-180" />
                            {denied.length} permission{denied.length > 1 ? "s" : ""} non accordée{denied.length > 1 ? "s" : ""}
                          </summary>
                          <div className="mt-1.5 space-y-1.5 pl-3.5">
                            {denied.map((p) => {
                              const PermIcon = permissionIcons[p] || XCircle;
                              return (
                                <div key={p} className="flex items-center gap-2 text-[11px] text-zinc-600 line-through decoration-zinc-700">
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
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou e-mail..."
            className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 backdrop-blur-xl transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3 py-2.5 text-xs text-zinc-200 outline-none focus:border-purple-500/50 backdrop-blur-xl transition-all cursor-pointer"
          >
            {sortOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                Trier par : {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3 py-2.5 text-xs font-bold text-zinc-300 hover:text-white hover:border-purple-500/40 transition-all backdrop-blur-xl"
            title={sortDir === "asc" ? "Ordre croissant" : "Ordre décroissant"}
          >
            <ArrowUpDown size={13} />
            {sortDir === "asc" ? "Croissant" : "Décroissant"}
          </button>
        </div>
      </div>

      {/* LISTE DES UTILISATEURS */}
      {loading ? (
        <div className="py-16 text-center border border-zinc-800/80 bg-zinc-950/60 rounded-2xl backdrop-blur-xl">
          <Loader2 className="w-5 h-5 text-purple-500 animate-spin mx-auto mb-2" />
          <p className="text-zinc-500 text-xs">Chargement des utilisateurs...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-xl">
          <UserIcon size={28} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">Aucun utilisateur trouvé.</p>
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
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 sm:p-5 hover:border-purple-500/30 transition-all backdrop-blur-xl"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {u.image ? (
                    <img src={u.image} alt="" className="w-10 h-10 rounded-xl border border-zinc-700/80 object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                      <UserIcon size={18} className="text-zinc-500" />
                    </div>
                  )}

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white truncate">{u.name || "—"}</p>
                      {isSelf && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">
                          Toi
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-500 truncate">{u.email}</p>

                    <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${roleClass}`}>
                        <RoleIcon size={10} />
                        {ROLE_LABELS[u.role] || u.role}
                      </span>

                      {u.hasSpotifyToken ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                          <CheckCircle2 size={10} /> Spotify
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-900/60 border border-zinc-800 px-2 py-0.5 rounded-md">
                          <XCircle size={10} /> Non lié
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-900">
                  {isLocked ? (
                    <span
                      className="flex items-center gap-1.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600"
                      title="Niveau égal ou supérieur au tien : aucune action possible"
                    >
                      <Lock size={12} />
                      Verrouillé
                    </span>
                  ) : (
                    <>
                      {canManageRoles && (
                        <select
                          value={u.role}
                          disabled={isSelf || isUpdating}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                          className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-200 outline-none focus:border-purple-500/50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
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
                          className="p-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Supprimer le compte"
                        >
                          {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      )}

                      {!canManageRoles && !canDeleteUsers && (
                        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold px-2">
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