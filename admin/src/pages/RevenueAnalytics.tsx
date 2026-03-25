import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { TrendingDown, Percent, Wrench, DollarSign } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ✅ your backend base
const API_BASE = "http://localhost:4000";

type ApiLeakageType = {
  key: "discount" | "rework" | "marginLoss";
  label: string;
  amount: number;
  percent: number;
};

type ApiTopBusiness = {
  businessId: string;
  businessName: string;
  amount: number;
};

type ApiResponse = {
  success: boolean;
  currency: string;
  range: "all" | "month";
  periodKey: string;
  businessesCount: number;
  totals: {
    totalLeakageTracked: number;
    avgLeakagePerBusiness: number;
  };
  leakageByType: ApiLeakageType[];
  topLeakageType: {
    key: string;
    label: string;
    percent: number;
  };
  topLeakingBusinesses: ApiTopBusiness[];
};

const TYPE_COLOR: Record<string, string> = {
  Discounts: "hsl(217, 91%, 60%)",
  Rework: "hsl(142, 76%, 36%)",
  "Margin Loss": "hsl(38, 92%, 50%)",
  Other: "hsl(280, 65%, 60%)",
};

function money(n: number, currency = "USD") {
  const num = Number.isFinite(n) ? n : 0;
  if (currency === "USD") return `$${num.toLocaleString()}`;
  return `${num.toLocaleString()} ${currency}`;
}

// keep your static feature usage for now
const featureUsage = [
  { feature: "Rules Engine", usage: 89 },
  { feature: "PDF Reports", usage: 72 },
  { feature: "Drill-down Analytics", usage: 58 },
  { feature: "Team Access", usage: 45 },
  { feature: "API Integration", usage: 32 },
];

export default function RevenueAnalytics() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [data, setData] = useState<ApiResponse | null>(null);

  // ✅ Auth header (same way you did in reports)
  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await axios.get<ApiResponse>(
          `${API_BASE}/api/admin/analytics/revenue?range=all`,
          { headers: authHeaders }
        );

        if (!res.data?.success) {
          throw new Error((res.data as any)?.message || "Failed to load analytics");
        }

        setData(res.data);
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || "Failed to load analytics");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [authHeaders]);

  // ✅ Pie data from backend
  const leakageByType = useMemo(() => {
    const arr =
      data?.leakageByType?.map((t) => ({
        name: t.label,
        value: t.amount,
        color: TYPE_COLOR[t.label] || "hsl(280, 65%, 60%)",
      })) || [];

    // if no data, show a placeholder slice
    return arr.length ? arr : [{ name: "No data", value: 1, color: "hsl(217, 33%, 17%)" }];
  }, [data]);

  // ✅ Bar data from backend
  const leakageByBusiness = useMemo(() => {
    const rows =
      data?.topLeakingBusinesses?.map((b) => ({
        business: b.businessName,
        leakage: b.amount,
      })) || [];

    return rows.length ? rows : [{ business: "No data", leakage: 0 }];
  }, [data]);

  const currency = data?.currency || "USD";
  const totalLeakageTracked = data?.totals?.totalLeakageTracked ?? 0;
  const avgLeakage = data?.totals?.avgLeakagePerBusiness ?? 0;

  const topTypeLabel = data?.topLeakageType?.label || "—";
  const topTypePercent = data?.topLeakageType?.percent ?? 0;

  const mostUsed = featureUsage[0]; // keep as static
  const businessesCount = data?.businessesCount ?? 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Revenue Leakage Analytics"
        description="Understand how customers use the product and where money is lost."
      />

      {/* ✅ Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Leakage Tracked"
          value={loading ? "Loading..." : money(totalLeakageTracked, currency)}
          change={
            loading
              ? "Loading..."
              : businessesCount > 0
              ? `All businesses combined (${businessesCount})`
              : "All businesses combined"
          }
          changeType="neutral"
          icon={TrendingDown}
          iconColor="text-destructive"
        />

        <StatCard
          title="Avg Leakage / Business"
          value={loading ? "Loading..." : money(avgLeakage, currency)}
          change="Based on onboarded businesses"
          changeType="neutral"
          icon={DollarSign}
        />

        <StatCard
          title="Top Leakage Type"
          value={loading ? "Loading..." : topTypeLabel}
          change={loading ? "Loading..." : `${topTypePercent}% of total`}
          changeType="neutral"
          icon={Percent}
          iconColor="text-warning"
        />

        <StatCard
          title="Most Used Feature"
          value={mostUsed.feature}
          change={`${mostUsed.usage}% adoption`}
          changeType="positive"
          icon={Wrench}
          iconColor="text-success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Leakage by Type */}
        <div className="stat-card">
          <h3 className="text-lg font-semibold mb-6">Leakage by Type</h3>

          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leakageByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {leakageByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222, 47%, 10%)",
                    border: "1px solid hsl(217, 33%, 17%)",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [money(value, currency), "Amount"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-4 justify-center mt-4">
            {leakageByType.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Leaking Businesses */}
        <div className="stat-card">
          <h3 className="text-lg font-semibold mb-6">Top Leaking Businesses</h3>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leakageByBusiness} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
                <XAxis
                  type="number"
                  stroke="hsl(215, 20%, 55%)"
                  fontSize={12}
                  tickFormatter={(v) => (currency === "USD" ? `$${v / 1000}k` : `${v / 1000}k`)}
                />
                <YAxis
                  type="category"
                  dataKey="business"
                  stroke="hsl(215, 20%, 55%)"
                  fontSize={12}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222, 47%, 10%)",
                    border: "1px solid hsl(217, 33%, 17%)",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [money(value, currency), "Leakage"]}
                />
                <Bar dataKey="leakage" fill="hsl(0, 72%, 51%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Feature Usage */}
      <div className="stat-card">
        <h3 className="text-lg font-semibold mb-6">Feature Adoption</h3>
        <div className="space-y-4">
          {featureUsage.map((feature) => (
            <div key={feature.feature} className="flex items-center gap-4">
              <span className="w-40 text-sm font-medium">{feature.feature}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${feature.usage}%` }}
                />
              </div>
              <span className="w-12 text-sm text-muted-foreground text-right">
                {feature.usage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
