import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { LeakageBreakdown } from "@/components/dashboard/LeakageBreakdown";
import { LeakageChart } from "@/components/dashboard/LeakageChart";
import { WarningIndicators } from "@/components/dashboard/WarningIndicators";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { JobsAffected } from "@/components/dashboard/JobsAffected";
import { DollarSign, Percent, RotateCcw, Briefcase } from "lucide-react";

type TrendDirection = "up" | "down";

/** ✅ NEW: rows for Jobs Affected table (from backend) */
type AffectedJobRow = {
  id: string;
  jobRef: string;
  details: string;
  type: "Discount" | "Rework" | string;
  leakage: number;
  status: "Won" | "Lost" | "Rework" | string;
  createdAt: string;
};

type DashboardOverviewResponse = {
  success: boolean;
  message?: string;
  code?: string;

  range: { key: string; from: string; to: string };
  currency: string;

  kpis: {
    totalLeakage: {
      amount: number;
      deltaVsLastMonth: {
        amount: number;
        direction: TrendDirection;
        percent: number;
      };
    };
    jobsAffected: { count: number; note?: string };
    discountLeakage: { amount: number; note?: string };
    reworkLeakage: { amount: number; note?: string };
    marginLossLeakage: { amount: number; note?: string };
  };

  breakdown: Array<{
    key: "discount" | "rework" | "marginLoss" | string;
    label: string;
    amount: number;
    percent: number;
  }>;

  warnings: Array<{
    id: string;
    severity: "high" | "medium" | "low";
    title: string;
    message: string;
    count: number;
  }>;

  trend: {
    thisMonth: { amount: number };
    lastMonth: { amount: number };
    delta: { amount: number; percent: number };
  };

  counts: {
    totalThisMonth: number;
    wonThisMonth: number;
    lostThisMonth: number;
    discountedWonThisMonth: number;
  };

  recent: {
    jobs: Array<{
      id: string;
      status: "Won" | "Lost" | string;
      quoted: number;
      final: number | null;
      leakage: number | null;
      reason: string | null;
      createdAt: string;
    }>;
  };

  /** ✅ NEW (safe optional): backend provides this for the blue-marked table */
  affectedJobs?: AffectedJobRow[];
};

// ✅ NEW: Rework activity response (for RecentActivity feed)
type ReworkOverviewResponse = {
  success: boolean;
  message?: string;
  code?: string;

  currency: string;
  range: { from: string; to: string };

  kpis: {
    totalReworkLoss: number;
    hoursLost: number;
    incidents: number;
    avgHours: number;
    topReason: string;
  };

  rows: Array<{
    id: string;
    jobRef: string;
    hours: number;
    costPerHour: number;
    loss: number;
    reason: string;
    description: string;
    date: string; // ISO
    createdBy: string | null;
  }>;
};

const API_BASE = "http://localhost:4000";

const formatMoney = (currency: string, amount: number) => {
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

const Index = () => {
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [rework, setRework] = useState<ReworkOverviewResponse | null>(null); // ✅ NEW
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        setNeedsOnboarding(false);

        const token = localStorage.getItem("token");

        // ✅ Load dashboard + rework overview together (so we can show rework in activity feed)
        const [dashRes, reworkRes] = await Promise.all([
          axios.get<DashboardOverviewResponse>(`${API_BASE}/api/dashboard/overview`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            // withCredentials: true,
          }),
          axios.get<ReworkOverviewResponse>(`${API_BASE}/api/rework/overview?limit=5`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            // withCredentials: true,
          }),
        ]);

        if (!alive) return;

        if (dashRes.data?.success) {
          setData(dashRes.data);
        } else {
          setErrorMsg(dashRes.data?.message || "Failed to load dashboard.");
        }

        // rework is optional; don't fail dashboard if this endpoint errors/returns false
        if (reworkRes.data?.success) {
          setRework(reworkRes.data);
        } else {
          setRework(null);
        }
      } catch (err: any) {
        if (!alive) return;

        const status = err?.response?.status;
        const apiMessage = err?.response?.data?.message;
        const apiCode = err?.response?.data?.code;

        if (status === 403 && apiCode === "ONBOARDING_REQUIRED") {
          setNeedsOnboarding(true);
          setErrorMsg("Onboarding is required to view the dashboard.");
        } else if (status === 401) {
          setErrorMsg("Your session expired. Please login again.");
        } else {
          setErrorMsg(apiMessage || "Server error loading dashboard.");
        }
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const currency = data?.currency || rework?.currency || "USD";

  // ✅ Metric card mapping (Rework Costs already reads kpis.reworkLeakage.amount)
  const metricCards = useMemo(() => {
    if (!data) return null;

    const total = data.kpis.totalLeakage.amount;
    const delta = data.kpis.totalLeakage.deltaVsLastMonth;

    return {
      totalLeakage: {
        title: "Total Leakage (This Month)",
        value: formatMoney(currency, total),
        change: { value: `${delta.percent}%`, trend: delta.direction, isPositive: false },
      },
      discountLoss: {
        title: "Discount Loss",
        value: formatMoney(currency, data.kpis.discountLeakage.amount),
        change: { value: "-", trend: "up" as TrendDirection, isPositive: false },
      },
      reworkCosts: {
        title: "Rework Costs",
        value: formatMoney(currency, data.kpis.reworkLeakage.amount),
        change: { value: "-", trend: "down" as TrendDirection, isPositive: true },
      },
      jobsAffected: {
        title: "Jobs Affected",
        value: String(data.kpis.jobsAffected.count),
        change: { value: "-", trend: "up" as TrendDirection, isPositive: false },
      },
    };
  }, [data, currency]);

  // ✅ Breakdown for LeakageBreakdown component
  const breakdownData = useMemo(() => {
    if (!data) return [];
    return data.breakdown.map((b) => ({
      key: b.key,
      label: b.label,
      amount: b.amount,
      percent: b.percent,
    }));
  }, [data]);

  // ✅ Trend data for LeakageChart component
  const trendData = useMemo(() => {
    if (!data) return null;
    return {
      thisMonth: data.trend.thisMonth.amount,
      lastMonth: data.trend.lastMonth.amount,
      delta: data.trend.delta,
      currency,
    };
  }, [data, currency]);

  // ✅ Warnings for WarningIndicators
  const warnings = useMemo(() => data?.warnings || [], [data]);

  // ✅ NEW: items for the blue-marked JobsAffected table
  const affectedRows = useMemo(() => {
    const rows = data?.affectedJobs || [];
    // keep it defensive: ensure required fields exist
    return rows.map((r) => ({
      ...r,
      id: String(r.id),
      jobRef: r.jobRef || "—",
      details: r.details || "—",
      type: r.type || "—",
      leakage: Number(r.leakage || 0),
      status: r.status || "—",
      createdAt: r.createdAt || new Date().toISOString(),
    }));
  }, [data]);

  /**
   * ✅ Recent activity feed:
   * - include recent jobs from dashboard
   * - ALSO include recent rework incidents (as "Rework" activity)
   * - merge + sort by createdAt/date desc
   */
  const recentActivity = useMemo(() => {
    const items: any[] = [];

    // jobs -> activity
    if (data) {
      items.push(
        ...data.recent.jobs.map((j) => ({
          id: `job:${j.id}`,
          type: "job",
          status: j.status,
          quoted: j.quoted,
          final: j.final,
          leakage: j.leakage,
          reason: j.reason,
          createdAt: j.createdAt,
          currency,
        }))
      );
    }

    // rework incidents -> activity
    if (rework?.rows?.length) {
      items.push(
        ...rework.rows.map((x) => ({
          id: `rework:${x.id}`,
          type: "rework",
          status: "Rework",
          // keep structure compatible with your RecentActivity component
          quoted: 0,
          final: null,
          leakage: x.loss, // show cost as "leakage" value
          reason: x.reason || "Rework",
          jobRef: x.jobRef,
          hours: x.hours,
          description: x.description,
          createdAt: x.date, // ✅ use incident date
          currency,
        }))
      );
    }

    // sort newest first
    items.sort((a, b) => {
      const ad = new Date(a.createdAt).getTime();
      const bd = new Date(b.createdAt).getTime();
      return bd - ad;
    });

    // keep it tight (RecentActivity UI usually shows 5)
    return items.slice(0, 10);
  }, [data, rework, currency]);

  if (loading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Loading your revenue leakage overview...">
        <div className="p-6 text-sm text-muted-foreground">Loading...</div>
      </DashboardLayout>
    );
  }

  if (needsOnboarding) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Action needed">
        <div className="p-6 rounded-lg border">
          <div className="font-semibold mb-1">Complete onboarding to unlock your dashboard</div>
          <div className="text-sm text-muted-foreground mb-4">
            Your account setup is incomplete. Finish onboarding and come back here.
          </div>

          <a
            href="/onboarding"
            className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground"
          >
            Continue Onboarding
          </a>
        </div>
      </DashboardLayout>
    );
  }

  if (!data || errorMsg) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Welcome back!">
        <div className="p-6 rounded-lg border">
          <div className="font-semibold mb-1">Could not load dashboard</div>
          <div className="text-sm text-muted-foreground">{errorMsg || "Unknown error"}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard" subtitle="Welcome back! Here's your revenue leakage overview.">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MetricCard
          title={metricCards!.totalLeakage.title}
          value={metricCards!.totalLeakage.value}
          change={metricCards!.totalLeakage.change}
          icon={<DollarSign className="h-6 w-6" />}
          variant="loss"
          delay={0}
        />
        <MetricCard
          title={metricCards!.discountLoss.title}
          value={metricCards!.discountLoss.value}
          change={metricCards!.discountLoss.change}
          icon={<Percent className="h-6 w-6" />}
          variant="warning"
          delay={50}
        />
        <MetricCard
          title={metricCards!.reworkCosts.title}
          value={metricCards!.reworkCosts.value}
          change={metricCards!.reworkCosts.change}
          icon={<RotateCcw className="h-6 w-6" />}
          variant="success"
          delay={100}
        />
        <MetricCard
          title={metricCards!.jobsAffected.title}
          value={metricCards!.jobsAffected.value}
          change={metricCards!.jobsAffected.change}
          icon={<Briefcase className="h-6 w-6" />}
          variant="default"
          delay={150}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <LeakageChart data={trendData as any} />
        <LeakageBreakdown data={breakdownData as any} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <WarningIndicators warnings={warnings as any} />
        {/* ✅ now table becomes dynamic, but keep count prop for existing UI */}
        <JobsAffected count={data.kpis.jobsAffected.count as any} items={affectedRows as any} currency={currency} />
        {/* ✅ Now includes both Jobs + Rework incidents */}
        <RecentActivity items={recentActivity as any} />
      </div>
    </DashboardLayout>
  );
};

export default Index;


