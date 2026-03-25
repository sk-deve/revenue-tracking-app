import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Search,
  MoreHorizontal,
  Eye,
  Ban,
  ArrowUpCircle,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
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

interface Business {
  id: string;
  name: string;
  owner: string;
  ownerEmail: string;
  plan: string;
  createdDate: string;
  lastActivity: string;
  status: "active" | "muted";
}

type ApiBusiness = {
  id: string;
  businessName: string;
  owner: { name: string; email: string };
  plan: string;
  createdAt: string;
  lastActivityAt: string;
  status: "Active" | "Disabled";
  enterprise: boolean;
};

type BusinessesResponse = {
  success: boolean;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  businesses: ApiBusiness[];
  message?: string;
};

type StatsResponse = {
  success: boolean;
  stats: {
    totalBusinesses: number;
    activeToday: number;
    enterprise: number;
    disabled: number;
  };
  message?: string;
};

const API_BASE = "http://localhost:4000";
const ADMIN_BUSINESSES_BASE = `${API_BASE}/api/admin/businesses`;

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

function relativeTime(iso?: string) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";

  const diffMs = Date.now() - t;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 30) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function BusinessManagement() {
  // ✅ axios setup in same file (matches your style)
  const LIST_URL = `${ADMIN_BUSINESSES_BASE}`;
  const STATS_URL = `${ADMIN_BUSINESSES_BASE}/stats`;

  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState<Business[]>([]);
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    activeToday: 0,
    enterprise: 0,
    disabled: 0,
  });

  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string>("");

  // ✅ auth header (same approach you used elsewhere)
  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  }, []);

  const mapApiToUi = (b: ApiBusiness): Business => {
    const isMuted = b.status === "Disabled";
    return {
      id: b.id,
      name: b.businessName || "Unassigned",
      owner: b.owner?.name || "Owner",
      ownerEmail: b.owner?.email || "",
      plan: b.plan || "Starter",
      createdDate: fmtDate(b.createdAt),
      lastActivity: relativeTime(b.lastActivityAt),
      status: isMuted ? "muted" : "active",
    };
  };

  // ✅ load stats
  useEffect(() => {
    const runStats = async () => {
      try {
        setLoadingStats(true);
        setError("");

        const res = await axios.get<StatsResponse>(STATS_URL, {
          headers: authHeaders,
          withCredentials: false,
          timeout: 15000,
        });

        if (!res.data?.success) {
          throw new Error(res.data?.message || "Failed to load business stats");
        }

        setStats(res.data.stats);
      } catch (err: any) {
        const serverMsg = err?.response?.data?.message;
        setError(serverMsg || err?.message || "Failed to load business stats");
      } finally {
        setLoadingStats(false);
      }
    };

    runStats();
  }, [STATS_URL, authHeaders]);

  // ✅ load businesses (server-side search so it scales)
  useEffect(() => {
    const runList = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await axios.get<BusinessesResponse>(LIST_URL, {
          params: {
            search: searchTerm || "",
            page: 1,
            limit: 50,
          },
          headers: authHeaders,
          withCredentials: false,
          timeout: 15000,
        });

        if (!res.data?.success) {
          throw new Error(res.data?.message || "Failed to load businesses");
        }

        const mapped = Array.isArray(res.data.businesses)
          ? res.data.businesses.map(mapApiToUi)
          : [];

        setData(mapped);
      } catch (err: any) {
        const serverMsg = err?.response?.data?.message;
        setError(serverMsg || err?.message || "Failed to load businesses");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    // simple debounce so it doesn’t spam your API while typing
    const t = setTimeout(runList, 350);
    return () => clearTimeout(t);
  }, [LIST_URL, searchTerm, authHeaders]);

  // ✅ actions (enable/disable)
  const disableBusiness = async (id: string) => {
    try {
      setError("");
      await axios.patch(
        `${ADMIN_BUSINESSES_BASE}/${id}/disable`,
        {},
        {
          headers: authHeaders,
          withCredentials: false,
          timeout: 15000,
        }
      );

      // update UI instantly
      setData((prev) => prev.map((b) => (b.id === id ? { ...b, status: "muted" } : b)));
      setStats((s) => ({
        ...s,
        disabled: s.disabled + 1,
      }));
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message;
      setError(serverMsg || err?.message || "Failed to disable business");
    }
  };

  const enableBusiness = async (id: string) => {
    try {
      setError("");
      await axios.patch(
        `${ADMIN_BUSINESSES_BASE}/${id}/enable`,
        {},
        {
          headers: authHeaders,
          withCredentials: false,
          timeout: 15000,
        }
      );

      setData((prev) => prev.map((b) => (b.id === id ? { ...b, status: "active" } : b)));
      setStats((s) => ({
        ...s,
        disabled: Math.max(0, s.disabled - 1),
      }));
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message;
      setError(serverMsg || err?.message || "Failed to enable business");
    }
  };

  const columns = [
    {
      header: "Business",
      accessor: (row: Business) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-sm text-muted-foreground">ID: {row.id}</p>
        </div>
      ),
    },
    {
      header: "Owner",
      accessor: (row: Business) => (
        <div>
          <p className="font-medium">{row.owner}</p>
          <p className="text-sm text-muted-foreground">{row.ownerEmail}</p>
        </div>
      ),
    },
    {
      header: "Plan",
      accessor: (row: Business) => (
        <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary text-sm font-medium">
          {row.plan}
        </span>
      ),
    },
    { header: "Created", accessor: "createdDate" as keyof Business },
    { header: "Last Activity", accessor: "lastActivity" as keyof Business },
    {
      header: "Status",
      accessor: (row: Business) => <StatusBadge status={row.status} />,
    },
    {
      header: "Actions",
      accessor: (row: Business) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={loading}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem className="gap-2">
              <Eye className="w-4 h-4" /> View Data
            </DropdownMenuItem>

            <DropdownMenuItem className="gap-2" disabled>
              <ArrowUpCircle className="w-4 h-4" /> Change Plan
            </DropdownMenuItem>

            <DropdownMenuItem className="gap-2" disabled>
              <RotateCcw className="w-4 h-4" /> Reset Rules
            </DropdownMenuItem>

            {row.status === "active" ? (
              <DropdownMenuItem
                className="gap-2 text-destructive"
                onClick={() => disableBusiness(row.id)}
              >
                <Ban className="w-4 h-4" /> Disable Business
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className="gap-2" onClick={() => enableBusiness(row.id)}>
                <CheckCircle2 className="w-4 h-4" /> Enable Business
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-20",
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Business Management" description="Manage each business using your platform." />

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by business or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {loading && <p className="mt-2 text-xs text-muted-foreground">Loading businesses...</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <p className="metric-label">Total Businesses</p>
          <p className="text-2xl font-bold">
            {loadingStats ? "—" : stats.totalBusinesses.toLocaleString()}
          </p>
        </div>

        <div className="stat-card">
          <p className="metric-label">Active Today</p>
          <p className="text-2xl font-bold text-success">
            {loadingStats ? "—" : stats.activeToday.toLocaleString()}
          </p>
        </div>

        <div className="stat-card">
          <p className="metric-label">Enterprise</p>
          <p className="text-2xl font-bold text-primary">
            {loadingStats ? "—" : stats.enterprise.toLocaleString()}
          </p>
        </div>

        <div className="stat-card">
          <p className="metric-label">Disabled</p>
          <p className="text-2xl font-bold text-destructive">
            {loadingStats ? "—" : stats.disabled.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Table */}
      <DataTable columns={columns} data={data} keyField="id" />
    </div>
  );
}
