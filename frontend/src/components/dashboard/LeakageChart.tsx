import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type LeakageTrendData = {
  thisMonth: number; // current month leakage total
  lastMonth: number; // previous month leakage total
  delta?: { amount: number; percent: number };
  currency: string;
  range?: { key: string; from: string; to: string };
};

type Props = {
  data: LeakageTrendData;
};

const getMonthLabel = (iso: string) => {
  // iso like "2026-01-01T00:00:00.000Z"
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short" });
};

export function LeakageChart({ data }: Props) {
  // ✅ Build chart points dynamically (no static)
  // We keep your chart keys: thisYear / lastYear to avoid rewriting chart
  const chartData = (() => {
    // If backend sent range, we can label nicely
    const thisLabel = data.range?.from ? getMonthLabel(data.range.from) : "This";
    // last month label: derive from range.from, else generic
    let lastLabel = "Last";
    if (data.range?.from) {
      const from = new Date(data.range.from);
      const last = new Date(from.getFullYear(), from.getMonth() - 1, 1);
      lastLabel = last.toLocaleString(undefined, { month: "short" });
    }

    // Two points:
    // - First point shows lastMonth as "thisYear" and 0 for "lastYear" (optional)
    // - Second point shows thisMonth as "thisYear" and lastMonth as "lastYear"
    //
    // Better:
    // Keep both series present on both points so areas render nicely.
    return [
      {
        month: lastLabel,
        thisYear: data.lastMonth,
        lastYear: 0,
      },
      {
        month: thisLabel,
        thisYear: data.thisMonth,
        lastYear: data.lastMonth,
      },
    ];
  })();

  const money = (v: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: data.currency,
        maximumFractionDigits: 0,
      }).format(v);
    } catch {
      return `$${Math.round(v).toLocaleString()}`;
    }
  };

  return (
    <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "100ms" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Leakage Trend</h3>
          <p className="text-sm text-muted-foreground">Comparing this month vs last month</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-loss" />
            <span className="text-sm text-muted-foreground">This Month</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary/40" />
            <span className="text-sm text-muted-foreground">Last Month</span>
          </div>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorThisYear" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(4, 90%, 58%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(4, 90%, 58%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorLastYear" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(222, 89%, 55%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(222, 89%, 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" strokeOpacity={0.3} />

            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 12 }}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 12 }}
              tickFormatter={(value) => `${money(value).replace(/\.00$/, "")}`}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(220, 13%, 91%)",
                borderRadius: "12px",
                boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)",
              }}
              formatter={(value: number) => [money(value), ""]}
              labelStyle={{ color: "hsl(222, 47%, 11%)", fontWeight: 600 }}
            />

            {/* Last month series */}
            <Area
              type="monotone"
              dataKey="lastYear"
              stroke="hsl(222, 89%, 55%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorLastYear)"
            />

            {/* This month series */}
            <Area
              type="monotone"
              dataKey="thisYear"
              stroke="hsl(4, 90%, 58%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorThisYear)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

