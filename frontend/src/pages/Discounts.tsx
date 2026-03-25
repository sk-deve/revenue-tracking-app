import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, AlertTriangle, Percent, TrendingUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

interface DiscountRecord {
  id: string; // mongo id
  jobId: string; // display like JOB-xxxx
  client: string;
  originalPrice: number;
  discountAmount: number;
  discountPercent: number;
  reason: string;
  date: string;
  exceededThreshold: boolean;
}

type DiscountTrackingResponse = {
  success: boolean;
  message?: string;
  code?: string;

  range: { from: string; to: string };
  currency: string;

  kpis: {
    totalDiscountLoss: number;
    maxDiscountAllowed: number;
    alerts: number;
    avgDiscountPercent: number;
  };

  history: Array<{
    id: string;
    service?: string;
    discountPercent: number;
    discountLoss: number;
    reason: string;
    alert: "Exceeded" | "OK";
    // NOTE: backend currently doesn't send client/original/date.
    // We'll safely map what exists.
  }>;
};

const API_BASE = "http://localhost:4000";

const money = (currency: string, amount: number) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${Math.round(amount).toLocaleString()}`;
  }
};

const jobLabel = (id: string) => `JOB-${String(id).slice(-4).toUpperCase()}`;

export default function Discounts() {
  const [data, setData] = useState<DiscountTrackingResponse | null>(null);
  const [records, setRecords] = useState<DiscountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await axios.get<DiscountTrackingResponse>(`${API_BASE}/api/discounts`, {
          headers: getAuthHeaders(),
          // withCredentials: true,
        });

        if (!alive) return;

        if (!res.data?.success) {
          setErrorMsg(res.data?.message || "Failed to load discount tracking.");
          setData(null);
          setRecords([]);
          return;
        }

        setData(res.data);

        // ✅ Map backend history -> table records
        // Backend history currently has: { id, service, discountPercent, discountLoss, reason, alert }
        // It does NOT include client/original/date yet, so we fill with safe values.
        const mapped: DiscountRecord[] = (res.data.history || []).map((h) => ({
          id: h.id,
          jobId: jobLabel(h.id),
          client: "—", // not provided by backend yet
          originalPrice: 0, // not provided by backend yet
          discountAmount: h.discountLoss || 0,
          discountPercent: h.discountPercent || 0,
          reason: h.reason || "—",
          date: "", // not provided by backend yet
          exceededThreshold: h.alert === "Exceeded",
        }));

        setRecords(mapped);
      } catch (err: any) {
        const status = err?.response?.status;
        const apiMessage = err?.response?.data?.message;
        const apiCode = err?.response?.data?.code;

        if (status === 403 && apiCode === "ONBOARDING_REQUIRED") {
          setErrorMsg("Onboarding is required to view discount tracking.");
        } else if (status === 401) {
          setErrorMsg("Your session expired. Please login again.");
        } else {
          setErrorMsg(apiMessage || "Server error loading discount tracking.");
        }

        setData(null);
        setRecords([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filteredRecords = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return records;

    return records.filter((r) => {
      return (
        r.jobId.toLowerCase().includes(s) ||
        r.client.toLowerCase().includes(s) ||
        r.reason.toLowerCase().includes(s)
      );
    });
  }, [records, search]);

  // ✅ Pie chart: group by reason from records (dynamic)
  const discountByReason = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of records) {
      const key = r.reason && r.reason !== "—" ? r.reason : "Other";
      map.set(key, (map.get(key) || 0) + (r.discountAmount || 0));
    }

    const palette = [
      "hsl(222, 89%, 55%)",
      "hsl(4, 90%, 58%)",
      "hsl(38, 92%, 50%)",
      "hsl(152, 76%, 36%)",
      "hsl(280, 65%, 60%)",
      "hsl(200, 80%, 50%)",
      "hsl(320, 70%, 55%)",
    ];

    const arr = Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return arr.map((item, idx) => ({
      ...item,
      color: palette[idx % palette.length],
    }));
  }, [records]);

  const currency = data?.currency || "USD";
  const totalDiscountLoss = data?.kpis?.totalDiscountLoss ?? 0;
  const alertCount = data?.kpis?.alerts ?? 0;
  const avgDiscount = data?.kpis?.avgDiscountPercent ?? 0;
  const threshold = data?.kpis?.maxDiscountAllowed ?? 0;

  return (
    <DashboardLayout title="Discount Tracking" subtitle="Monitor margin erosion from discounts">
      <div className="space-y-6">
        {/* Error */}
        {errorMsg && (
          <div className="glass-card rounded-xl p-4 border border-loss/30 bg-loss/10 text-sm text-foreground">
            {errorMsg}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-5 loss-gradient animate-fade-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Discount Loss</p>
                <p className="text-2xl font-bold text-loss mt-1">
                  {loading ? "—" : money(currency, totalDiscountLoss)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-loss/10">
                <Percent className="h-6 w-6 text-loss" />
              </div>
            </div>
          </div>

          <div
            className="glass-card rounded-xl p-5 warning-gradient animate-fade-up"
            style={{ animationDelay: "50ms" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Threshold Alerts</p>
                <p className="text-2xl font-bold text-warning mt-1">
                  {loading ? "—" : alertCount}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 animate-fade-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Discount</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {loading ? "—" : `${avgDiscount.toFixed(1)}%`}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 animate-fade-up" style={{ animationDelay: "150ms" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Threshold</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {loading ? "—" : `${threshold}%`}
                </p>
              </div>
              <Button variant="outline" size="sm" className="text-xs" disabled>
                Edit
              </Button>
            </div>
          </div>
        </div>

        {/* Charts and Table Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pie Chart */}
          <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "200ms" }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Discounts by Reason</h3>

            {loading ? (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </div>
            ) : discountByReason.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                No discounted jobs this month.
              </div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={discountByReason}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {discountByReason.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [money(currency, value), "Amount"]}
                      contentStyle={{
                        backgroundColor: "hsl(0, 0%, 100%)",
                        border: "1px solid hsl(220, 13%, 91%)",
                        borderRadius: "12px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Discount History Table */}
          <div className="lg:col-span-2 glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "250ms" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Discount History</h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-9 bg-secondary/50"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">Job</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">Client</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">Original</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">Discount</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">Reason</th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">Alert</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                        Loading...
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        No discounted jobs found.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record, index) => (
                      <tr
                        key={record.id}
                        className="hover:bg-muted/30 transition-colors animate-slide-in"
                        style={{ animationDelay: `${300 + index * 50}ms` }}
                      >
                        <td className="py-3">
                          <span className="text-sm font-mono font-medium text-primary">{record.jobId}</span>
                        </td>
                        <td className="py-3 text-sm text-foreground">{record.client}</td>
                        <td className="py-3 text-right text-sm text-foreground">
                          {record.originalPrice > 0 ? money(currency, record.originalPrice) : "—"}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-semibold text-loss">
                              -{money(currency, record.discountAmount)}
                            </span>
                            <span className={cn("text-xs", record.exceededThreshold ? "text-loss" : "text-muted-foreground")}>
                              {record.discountPercent}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">{record.reason}</td>
                        <td className="py-3 text-center">
                          {record.exceededThreshold && (
                            <div className="flex justify-center">
                              <AlertTriangle className="h-5 w-5 text-warning animate-pulse-subtle" />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ✅ Note for you: backend doesn't send client/original/date yet */}
            {!loading && records.length > 0 && (
              <div className="mt-4 text-xs text-muted-foreground">
                Note: If you want the table to show <span className="font-medium">Client</span>,{" "}
                <span className="font-medium">Original</span>, and <span className="font-medium">Date</span>,
                add these fields to the discount API history items: <code>clientName</code>,{" "}
                <code>quotedPrice</code>, <code>createdAt</code>.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
