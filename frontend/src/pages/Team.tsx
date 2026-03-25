import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Plus,
  Mail,
  Shield,
  Clock,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

// ✅ set your API base (adjust if needed)
const API_BASE = "http://localhost:4000";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
});

// ✅ attach JWT automatically (adjust key if your app uses different)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // <-- change if different
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type UiRole = "owner" | "admin" | "editor" | "viewer";

interface TeamRowFromApi {
  id: string;
  isOwner?: boolean;
  name: string;
  email: string;
  role: string; // "Owner" | "Admin" | "Editor" | "Viewer" | legacy values
  roleLabel?: string; // "Owner" | "Admin" | "Editor" | "Viewer"
  status: "Invited" | "Active" | "Disabled" | "Expired";
  jobs?: number;
  leakage?: number;
  lastActive?: string;
}

interface TeamMemberUI {
  id: string;
  name: string;
  email: string;
  role: UiRole;
  avatar: string;
  lastActive: string;
  jobsThisMonth: number;
  leakageAmount: number;
  status: TeamRowFromApi["status"];
  isOwner: boolean;
}

interface StatsApi {
  totalMembers: number;
  activeToday?: number;
  pendingInvites?: number;

  // compat fields (you already had)
  active?: number;
  invited?: number;
}

interface ActivityRowApi {
  id: string;
  title: string;
  meta: string;
  action: string;
  actorName: string;
  time: string; // ISO date
}

const roleColors: Record<UiRole, string> = {
  owner: "bg-chart-5/10 text-chart-5 border-chart-5/30",
  admin: "bg-primary/10 text-primary border-primary/30",
  editor: "bg-success/10 text-success border-success/30",
  viewer: "bg-muted text-muted-foreground border-border",
};

const rolePermissions: Record<UiRole, string[]> = {
  owner: ["Full access", "Manage billing", "Delete workspace", "Manage team"],
  admin: ["Manage team", "Edit settings", "View reports", "All data access"],
  editor: ["Add/edit jobs", "Log discounts", "Log rework", "View reports"],
  viewer: ["View dashboard", "View reports", "Read-only access"],
};

function initials(name: string, email: string) {
  const base = (name || email || "").trim();
  const parts = base.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return "??";
}

function mapApiRoleToUiRole(row: TeamRowFromApi): UiRole {
  if (row.isOwner || row.role === "Owner" || row.roleLabel === "Owner") return "owner";

  const label = (row.roleLabel || row.role || "").toLowerCase();

  // legacy support
  if (label === "manager") return "admin";
  if (label === "staff") return "editor";

  if (label === "admin") return "admin";
  if (label === "editor") return "editor";
  if (label === "viewer") return "viewer";

  return "editor";
}

function mapUiRoleToApiRole(role: UiRole): string {
  // backend supports Admin/Editor/Viewer
  if (role === "admin") return "Admin";
  if (role === "editor") return "Editor";
  if (role === "viewer") return "Viewer";
  return "Editor";
}

function timeAgoLabel(iso: string) {
  const dt = new Date(iso);
  const diff = Date.now() - dt.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export default function Team() {
  const [showInvite, setShowInvite] = useState(false);

  // form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UiRole>("editor");

  // data state
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<TeamMemberUI[]>([]);
  const [stats, setStats] = useState<StatsApi | null>(null);
  const [activity, setActivity] = useState<
    { id: string; user: string; action: string; target: string; time: string }[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [error, setError] = useState<string>("");

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q)
    );
  }, [members, search]);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [membersRes, statsRes, activityRes] = await Promise.all([
        api.get("/team/members"),
        api.get("/team/stats"),
        api.get("/team/activity?limit=5"),
      ]);

      const rows: TeamRowFromApi[] = membersRes.data?.rows || [];
      const uiRows: TeamMemberUI[] = rows.map((r) => ({
        id: r.id,
        isOwner: !!r.isOwner,
        name: r.name,
        email: r.email,
        role: mapApiRoleToUiRole(r),
        avatar: initials(r.name, r.email),
        lastActive: r.lastActive || "—",
        jobsThisMonth: r.jobs ?? 0,
        leakageAmount: r.leakage ?? 0,
        status: r.status,
      }));

      setMembers(uiRows);
      setStats(statsRes.data?.stats || null);

      const aRows: ActivityRowApi[] = activityRes.data?.rows || [];
      setActivity(
        aRows.map((x) => ({
          id: x.id,
          user: x.actorName || "User",
          action: x.title || x.action,
          target: x.meta || "",
          time: timeAgoLabel(x.time),
        }))
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load team data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSendInvite() {
    setError("");

    const email = inviteEmail.trim().toLowerCase();
    if (!email) return setError("Email is required.");

    setSendingInvite(true);
    try {
      await api.post("/team/invite", {
        email,
        role: mapUiRoleToApiRole(inviteRole),
        name: "", // UI doesn't collect name, keep empty
      });

      setInviteEmail("");
      setInviteRole("editor");
      setShowInvite(false);

      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to send invite.");
    } finally {
      setSendingInvite(false);
    }
  }

  return (
    <DashboardLayout title="Team Access" subtitle="Manage team members and permissions">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team members..."
              className="pl-9 bg-card border-border"
            />
          </div>
          <Button onClick={() => setShowInvite(!showInvite)} className="gap-2">
            <Plus className="h-4 w-4" />
            Invite Member
          </Button>
        </div>

        {error && (
          <div className="glass-card rounded-xl p-4 border border-loss/30 bg-loss/5 text-sm text-loss">
            {error}
          </div>
        )}

        {/* Invite Form */}
        {showInvite && (
          <div className="glass-card rounded-xl p-6 animate-fade-up">
            <h3 className="text-lg font-semibold text-foreground mb-4">Invite Team Member</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Role</label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UiRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={handleSendInvite} disabled={sendingInvite}>
                {sendingInvite ? "Sending..." : "Send Invitation"}
              </Button>
              <Button variant="outline" onClick={() => setShowInvite(false)} disabled={sendingInvite}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-xl p-5 animate-fade-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats?.totalMembers ?? members.length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div
            className="glass-card rounded-xl p-5 animate-fade-up"
            style={{ animationDelay: "50ms" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Today</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats?.activeToday ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <Clock className="h-6 w-6 text-success" />
              </div>
            </div>
          </div>

          <div
            className="glass-card rounded-xl p-5 animate-fade-up"
            style={{ animationDelay: "100ms" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Invites</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats?.pendingInvites ?? stats?.invited ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <Mail className="h-6 w-6 text-warning" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Members Table */}
          <div
            className="lg:col-span-2 glass-card rounded-xl overflow-hidden animate-fade-up"
            style={{ animationDelay: "150ms" }}
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Team Members</h3>
              {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                      Member
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                      Role
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                      Jobs
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                      Leakage
                    </th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                      Last Active
                    </th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {filteredMembers.map((member, index) => (
                    <tr
                      key={member.id}
                      className="hover:bg-muted/30 transition-colors animate-slide-in"
                      style={{ animationDelay: `${200 + index * 50}ms` }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                            {member.avatar}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "text-xs font-medium px-2.5 py-1 rounded-full capitalize border",
                            roleColors[member.role]
                          )}
                        >
                          {member.role}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-foreground">
                          {member.jobsThisMonth}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {member.leakageAmount > 0 ? (
                          <span className="text-sm font-semibold text-loss">
                            -${member.leakageAmount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="text-xs text-muted-foreground">{member.lastActive}</span>
                      </td>

                      <td className="px-6 py-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={member.isOwner}>
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {!loading && filteredMembers.length === 0 && (
                    <tr>
                      <td className="px-6 py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                        No team members found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Role Permissions */}
            <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "200ms" }}>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">Role Permissions</h3>
              </div>

              <div className="space-y-4">
                {Object.entries(rolePermissions).map(([role, permissions], index) => (
                  <div
                    key={role}
                    className="animate-slide-in"
                    style={{ animationDelay: `${300 + index * 80}ms` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full capitalize border",
                          roleColors[role as UiRole]
                        )}
                      >
                        {role}
                      </span>
                    </div>

                    <ul className="text-xs text-muted-foreground space-y-1 pl-2">
                      {permissions.map((perm) => (
                        <li key={perm} className="flex items-center gap-1.5">
                          <div className="h-1 w-1 rounded-full bg-muted-foreground" />
                          {perm}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Log */}
            <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "250ms" }}>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">Activity Log</h3>
              </div>

              <div className="space-y-3">
                {activity.map((a, index) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 animate-slide-in"
                    style={{ animationDelay: `${350 + index * 50}ms` }}
                  >
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{a.user}</span>{" "}
                        {a.action}{" "}
                        {a.target ? (
                          <span className="font-mono text-xs text-primary">{a.target}</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">{a.time}</p>
                    </div>
                  </div>
                ))}

                {!loading && activity.length === 0 && (
                  <p className="text-sm text-muted-foreground">No recent activity.</p>
                )}
              </div>

              <Button variant="ghost" className="w-full mt-4 text-sm">
                View All Activity
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
