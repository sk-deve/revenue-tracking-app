import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Search, MoreHorizontal, UserX, RefreshCw, Eye, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserRow {
  id: string;
  name: string;
  email: string;
  signupDate: string;     // ISO
  lastLoginAt: string | null; // ISO or null
  status: "active" | "muted";
}

type UsersApiResponse = {
  success: boolean;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  users: {
    id: string;
    name: string;
    email: string;
    businessName?: string;
    signupDate: string;
    lastLoginAt: string | null;
    status: "Active" | "Suspended";
  }[];
  message?: string;
};

type StatsApiResponse = {
  success: boolean;
  stats: {
    totalUsers: number;
    activeToday: number;
    suspended: number;
    newThisWeek: number;
  };
  message?: string;
};

const API_BASE = "http://localhost:4000";
const ADMIN_USERS_BASE = `${API_BASE}/api/admin/users`;

function formatDate(d: string) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function relativeFromNow(iso: string | null) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;

  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (sec < 30) return "Just now";
  if (min < 60) return `${min} min ago`;
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(day / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
}

export default function UserManagement() {
  // ✅ axios setup in same file
  const adminHeaders = useMemo(() => {
    const token = localStorage.getItem("adminToken");
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  }, []);

  const [searchTerm, setSearchTerm] = useState("");

  // server data
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    suspended: 0,
    newThisWeek: 0,
  });

  // pagination (optional, ready for later)
  const [page] = useState(1);
  const [limit] = useState(50);

  // ui state
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  // ✅ fetch stats
  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await axios.get<StatsApiResponse>(`${ADMIN_USERS_BASE}/stats`, {
        headers: adminHeaders,
        timeout: 15000,
      });

      if (!res.data?.success) throw new Error(res.data?.message || "Failed to load stats");

      setStats(res.data.stats);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load stats");
    } finally {
      setLoadingStats(false);
    }
  };

  // ✅ fetch users
  const fetchUsers = async (q: string) => {
    try {
      setLoadingUsers(true);
      setError("");

      const res = await axios.get<UsersApiResponse>(`${ADMIN_USERS_BASE}`, {
        headers: adminHeaders,
        params: { search: q || "", page, limit },
        timeout: 15000,
      });

      if (!res.data?.success) throw new Error(res.data?.message || "Failed to load users");

      const mapped: UserRow[] = (res.data.users || []).map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        signupDate: u.signupDate,
        lastLoginAt: u.lastLoginAt,
        status: u.status === "Suspended" ? "muted" : "active",
      }));

      setUsers(mapped);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to load users");
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // ✅ debounce search to backend
  useEffect(() => {
    const t = setTimeout(() => {
      fetchUsers(searchTerm.trim());
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // ✅ initial load
  useEffect(() => {
    fetchStats();
    fetchUsers("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ export CSV
  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await axios.get(`${ADMIN_USERS_BASE}/export`, {
        headers: adminHeaders,
        params: { search: searchTerm.trim() || "" },
        responseType: "blob",
        timeout: 30000,
      });

      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  // ✅ suspend/unsuspend
  const toggleSuspend = async (row: UserRow) => {
    try {
      setActionLoadingId(row.id);
      setError("");

      const isSuspended = row.status === "muted";
      const url = isSuspended
        ? `${ADMIN_USERS_BASE}/${row.id}/unsuspend`
        : `${ADMIN_USERS_BASE}/${row.id}/suspend`;

      await axios.patch(
        url,
        isSuspended ? {} : { reason: "Suspended by admin" },
        { headers: adminHeaders, timeout: 15000 }
      );

      // refresh both
      await Promise.all([fetchUsers(searchTerm.trim()), fetchStats()]);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Action failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns = [
    {
      header: "User",
      accessor: (row: UserRow) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {row.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0]?.toUpperCase())
                .join("")}
            </span>
          </div>
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-sm text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Signup Date",
      accessor: (row: UserRow) => formatDate(row.signupDate),
    },
    {
      header: "Last Login",
      accessor: (row: UserRow) => relativeFromNow(row.lastLoginAt),
    },
    {
      header: "Status",
      accessor: (row: UserRow) => <StatusBadge status={row.status} />,
    },
    {
      header: "Actions",
      accessor: (row: UserRow) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={actionLoadingId === row.id}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem className="gap-2" disabled>
              <Eye className="w-4 h-4" /> Impersonate (coming)
            </DropdownMenuItem>

            <DropdownMenuItem className="gap-2" disabled>
              <RefreshCw className="w-4 h-4" /> Reset Password (coming)
            </DropdownMenuItem>

            <DropdownMenuItem className="gap-2" onClick={() => toggleSuspend(row)}>
              <UserX className="w-4 h-4" />
              {row.status === "active" ? "Suspend" : "Activate"}
            </DropdownMenuItem>

            <DropdownMenuItem className="gap-2 text-destructive" disabled>
              <Trash2 className="w-4 h-4" /> Delete Account (coming)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-20",
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="User Management"
        description="Control accounts and support users."
        actions={
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting..." : "Export Users"}
          </Button>
        }
      />

      {/* Error */}
      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {loadingUsers ? (
          <p className="mt-2 text-xs text-muted-foreground">Loading users...</p>
        ) : null}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <p className="metric-label">Total Users</p>
          <p className="text-2xl font-bold">{loadingStats ? "—" : stats.totalUsers.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="metric-label">Active Today</p>
          <p className="text-2xl font-bold text-success">{loadingStats ? "—" : stats.activeToday.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="metric-label">Suspended</p>
          <p className="text-2xl font-bold text-warning">{loadingStats ? "—" : stats.suspended.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="metric-label">New This Week</p>
          <p className="text-2xl font-bold text-primary">{loadingStats ? "—" : stats.newThisWeek.toLocaleString()}</p>
        </div>
      </div>

      {/* Table */}
      <DataTable columns={columns} data={users} keyField="id" />
    </div>
  );
}
