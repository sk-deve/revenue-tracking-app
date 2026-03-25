import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Calendar } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { useEffect, useMemo, useState } from "react";

/** ✅ If you already have an API helper, use that instead */
const API_BASE = "http://localhost:4000";
const REPORTS_BASE = `${API_BASE}/api/reports`;

type TrendPoint = {
  month: string; // "Jul"
  discounts: number;
  rework: number;
  margin: number;
  key: string; // "2024-07"
};

type MonthlyTotals = {
  totalLeakage: number;
  discount: number;
  rework: number;
  marginLoss: number;
};

type BreakdownItem = {
  key: string;
  label: string;
  amount: number;
  percent: number;
};

type NamedAmount = {
  name: string;
  amount: number;
};

type MonthlyReportResponse = {
  success: boolean;
  currency: string;
  month: { key: string; from: string; to: string };
  totals: MonthlyTotals;
  typeBreakdown: BreakdownItem[];
  byService: NamedAmount[];
  byEmployee: NamedAmount[];
  insights: { title: string; message: string }[];
};

type TrendResponse = {
  success: boolean;
  currency: string;
  months: number;
  points: TrendPoint[];
};

const COLOR_POOL = [
  "hsl(222, 89%, 55%)",
  "hsl(4, 90%, 58%)",
  "hsl(38, 92%, 50%)",
  "hsl(152, 76%, 36%)",
  "hsl(280, 65%, 60%)",
  "hsl(200, 80%, 50%)",
  "hsl(120, 55%, 45%)",
  "hsl(330, 70%, 55%)",
  "hsl(25, 90%, 55%)",
  "hsl(260, 70%, 55%)",
];

function formatMoney(n: number) {
  const num = Number.isFinite(n) ? n : 0;
  return `$${num.toLocaleString()}`;
}

/** Convert "2024-12" -> "December 2024" */
function prettyMonth(key: string) {
  if (!/^\d{4}-\d{2}$/.test(key)) return key;
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return `${d.toLocaleString("en", { month: "long" })} ${y}`;
}

export default function Reports() {
  const [selectedMonth, setSelectedMonth] = useState<string>(""); // "YYYY-MM"
  const [currency, setCurrency] = useState<string>("USD");

  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [monthly, setMonthly] = useState<MonthlyReportResponse | null>(null);

  const [loadingTrend, setLoadingTrend] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ NEW: PDF downloading state
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // ✅ build default selected month = current month (YYYY-MM)
  useEffect(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(key);
  }, []);

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  }, []);

  // ✅ load trend (6 months)
  useEffect(() => {
    const run = async () => {
      try {
        setLoadingTrend(true);
        setError(null);

        const res = await fetch(`${REPORTS_BASE}/trend?months=6`, {
          headers: authHeaders,
        });

        const data: TrendResponse = await res.json();
        if (!res.ok || !data?.success) {
          const errMsg = (data as any)?.message || "Failed to load trend report";
          throw new Error(errMsg);
        }

        setCurrency(data.currency || "USD");
        setTrend(Array.isArray(data.points) ? data.points : []);
      } catch (e: any) {
        setError(e?.message || "Failed to load trend report");
      } finally {
        setLoadingTrend(false);
      }
    };

    run();
  }, [authHeaders]);

  // ✅ load monthly report when month changes
  useEffect(() => {
    if (!selectedMonth) return;

    const run = async () => {
      try {
        setLoadingMonthly(true);
        setError(null);

        const res = await fetch(`${REPORTS_BASE}/monthly?month=${selectedMonth}`, {
          headers: authHeaders,
        });

        const data: MonthlyReportResponse = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error((data as any)?.message || "Failed to load monthly report");
        }

        setCurrency(data.currency || "USD");
        setMonthly(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load monthly report");
        setMonthly(null);
      } finally {
        setLoadingMonthly(false);
      }
    };

    run();
  }, [selectedMonth, authHeaders]);

  // ✅ NEW: download PDF report (backend streams PDF)
  const handleDownloadPdf = async () => {
    if (!selectedMonth) return;

    try {
      setDownloadingPdf(true);
      setError(null);

      const token = localStorage.getItem("token");
      const url = `${REPORTS_BASE}/monthly/pdf?month=${encodeURIComponent(selectedMonth)}`;

      const res = await fetch(url, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        // backend might return JSON error
        let msg = "Failed to download PDF report.";
        try {
          const j = await res.json();
          msg = (j as any)?.message || msg;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const blob = await res.blob();

      // filename from header if present
      const disposition = res.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `Leakage-Report-${selectedMonth}.pdf`;

      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      setError(e?.message || "Failed to download PDF report.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ✅ derive summary values from backend
  const totals = monthly?.totals;
  const totalLeakage = totals?.totalLeakage ?? 0;

  // ✅ compute percent cards from backend breakdown
  const breakdownMap = useMemo(() => {
    const map: Record<string, BreakdownItem> = {};
    for (const item of monthly?.typeBreakdown || []) map[item.key] = item;
    return map;
  }, [monthly]);

  // ✅ pie chart data from backend byService
  const leakageByService = useMemo(() => {
    const arr = (monthly?.byService || []).map((x, idx) => ({
      name: x.name,
      value: x.amount,
      color: COLOR_POOL[idx % COLOR_POOL.length],
    }));
    return arr.length ? arr : [{ name: "No data", value: 1, color: "hsl(220, 13%, 91%)" }];
  }, [monthly]);

  // ✅ bar chart data from backend byEmployee (single amount)
  const leakageByEmployee = useMemo(() => {
    const rows = (monthly?.byEmployee || []).map((x) => ({
      name: x.name,
      discounts: x.amount,
      rework: 0,
    }));
    return rows.length ? rows : [{ name: "No data", discounts: 0, rework: 0 }];
  }, [monthly]);

  // ✅ month dropdown options from trend keys (latest 6 months)
  const monthOptions = useMemo(() => {
    const keys = trend.map((p) => p.key).filter(Boolean);
    if (!keys.length) return selectedMonth ? [selectedMonth] : [];
    return Array.from(new Set(keys)).slice(-6).reverse();
  }, [trend, selectedMonth]);

  const monthlySubtitle = selectedMonth
    ? `${prettyMonth(selectedMonth)} leakage breakdown`
    : "Monthly leakage breakdown";

  return (
    <DashboardLayout title="Revenue Leakage Report" subtitle="Comprehensive analysis of your revenue loss">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-44 bg-card">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((key) => (
                  <SelectItem key={key} value={key}>
                    {prettyMonth(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" className="gap-2" disabled>
              <Calendar className="h-4 w-4" />
              Custom Range
            </Button>
          </div>

          {/* ✅ ENABLED + CONNECTED PDF BUTTON */}
          <Button
            className="gap-2"
            onClick={handleDownloadPdf}
            disabled={!selectedMonth || downloadingPdf || loadingMonthly}
          >
            <Download className="h-4 w-4" />
            {downloadingPdf ? "Downloading..." : "Download PDF Report"}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="glass-card rounded-xl p-4 border border-loss/20 bg-loss/5">
            <p className="text-sm text-loss">{error}</p>
          </div>
        )}

        {/* Monthly Summary */}
        <div className="glass-card rounded-xl p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Monthly Summary</h3>
              <p className="text-sm text-muted-foreground">
                {loadingMonthly ? "Loading monthly report..." : monthlySubtitle}
              </p>
            </div>

            <div className="text-right">
              <p className="text-3xl font-bold text-loss">
                {currency === "USD" ? formatMoney(totalLeakage) : `${totalLeakage.toLocaleString()} ${currency}`}
              </p>
              <p className="text-sm text-muted-foreground">Total leakage this month</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-loss/10 border border-loss/20">
              <p className="text-sm font-medium text-muted-foreground">Discounts</p>
              <p className="text-2xl font-bold text-loss mt-1">
                {formatMoney(totals?.discount ?? 0)}
              </p>
              <p className="text-sm text-loss mt-1">
                {breakdownMap.discount ? `${breakdownMap.discount.percent}% of total` : "—"}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm font-medium text-muted-foreground">Rework</p>
              <p className="text-2xl font-bold text-warning mt-1">
                {formatMoney(totals?.rework ?? 0)}
              </p>
              <p className="text-sm text-warning mt-1">
                {breakdownMap.rework ? `${breakdownMap.rework.percent}% of total` : "—"}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm font-medium text-muted-foreground">Margin Loss</p>
              <p className="text-2xl font-bold text-primary mt-1">
                {formatMoney(totals?.marginLoss ?? 0)}
              </p>
              <p className="text-sm text-primary mt-1">
                {breakdownMap.marginLoss ? `${breakdownMap.marginLoss.percent}% of total` : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend Chart */}
          <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "100ms" }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Leakage by Type (6-Month Trend)
            </h3>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="discountsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(4, 90%, 58%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(4, 90%, 58%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="reworkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(222, 89%, 55%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(222, 89%, 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" strokeOpacity={0.3} />
                  <XAxis dataKey="month" tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(value) => `$${value / 1000}k`} tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                    contentStyle={{
                      backgroundColor: "hsl(0, 0%, 100%)",
                      border: "1px solid hsl(220, 13%, 91%)",
                      borderRadius: "12px",
                    }}
                  />

                  <Area type="monotone" dataKey="discounts" stroke="hsl(4, 90%, 58%)" strokeWidth={2} fill="url(#discountsGrad)" name="Discounts" />
                  <Area type="monotone" dataKey="rework" stroke="hsl(38, 92%, 50%)" strokeWidth={2} fill="url(#reworkGrad)" name="Rework" />
                  <Area type="monotone" dataKey="margin" stroke="hsl(222, 89%, 55%)" strokeWidth={2} fill="url(#marginGrad)" name="Margin" />
                </AreaChart>
              </ResponsiveContainer>

              {loadingTrend && (
                <p className="text-xs text-muted-foreground mt-2">Loading trend...</p>
              )}
            </div>
          </div>

          {/* By Service */}
          <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "150ms" }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Leakage by Service</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leakageByService}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {leakageByService.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Amount"]}
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
          </div>
        </div>

        {/* By Employee */}
        <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <h3 className="text-lg font-semibold text-foreground mb-4">Leakage by Employee (Optional View)</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leakageByEmployee} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" strokeOpacity={0.3} />
                <XAxis dataKey="name" tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => `$${value / 1000}k`} tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                  contentStyle={{
                    backgroundColor: "hsl(0, 0%, 100%)",
                    border: "1px solid hsl(220, 13%, 91%)",
                    borderRadius: "12px",
                  }}
                />
                <Legend />
                <Bar dataKey="discounts" name="Leakage" fill="hsl(4, 90%, 58%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Note: backend currently returns total leakage per employee (not split by type).
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

