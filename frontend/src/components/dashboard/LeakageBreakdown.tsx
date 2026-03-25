import { cn } from "@/lib/utils";

export type BreakdownItem = {
  key: string;
  label: string;
  amount: number;
  percent: number;
};

type ColorKey = "primary" | "loss" | "warning" | "chart-5";

type LeakageItemUI = {
  name: string;
  amount: number;
  percentage: number;
  color: ColorKey;
};

type Props = {
  data: BreakdownItem[];     // from backend: data.breakdown
  currency: string;         // from backend: data.currency
  // optional: if you want to ensure total includes categories not in breakdown
  totalLeakageAmount?: number; // from backend: data.kpis.totalLeakage.amount
};

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

export function LeakageBreakdown({ data, currency, totalLeakageAmount }: Props) {
  // ✅ Map backend categories to your colors
  const colorByKey = (key: string): ColorKey => {
    const k = key.toLowerCase();
    if (k.includes("discount")) return "loss";
    if (k.includes("rework")) return "warning";
    if (k.includes("margin")) return "primary";
    return "chart-5";
  };

  // ✅ Convert backend -> UI items
  const baseItems: LeakageItemUI[] = (data || [])
    .filter((x) => Number.isFinite(Number(x.amount)))
    .map((b) => ({
      name: b.label,
      amount: Math.max(0, Math.round(b.amount)),
      percentage: Math.max(0, Math.round(b.percent)),
      color: colorByKey(b.key),
    }));

  // ✅ Compute totals
  const breakdownSum = baseItems.reduce((sum, item) => sum + item.amount, 0);

  // If totalLeakageAmount provided, use it; otherwise fallback to breakdown sum
  const total = Math.max(0, Math.round(totalLeakageAmount ?? breakdownSum));

  // ✅ If breakdown doesn't cover all leakage, add "Other Leakage"
  // (Your backend currently returns 3 categories, but total leakage also includes lostQuotesLeakage sometimes, etc.)
  const otherAmount = Math.max(0, total - breakdownSum);

  const items: LeakageItemUI[] =
    otherAmount > 0
      ? [
          ...baseItems,
          {
            name: "Other Leakage",
            amount: otherAmount,
            percentage: total > 0 ? Math.round((otherAmount / total) * 100) : 0,
            color: "chart-5",
          },
        ]
      : baseItems;

  // ✅ Normalize percentages so progress bar sums to 100 (optional but makes UI clean)
  // If backend already provides exact percent, great. If not, compute from amount.
  const hasValidPercents = items.every((i) => Number.isFinite(i.percentage));
  const normalized = (() => {
    if (!hasValidPercents) {
      return items.map((i) => ({
        ...i,
        percentage: total > 0 ? Math.round((i.amount / total) * 100) : 0,
      }));
    }

    // If percentages don't sum to 100 due to rounding, adjust last item
    const sumPct = items.reduce((s, i) => s + i.percentage, 0);
    if (items.length > 0 && sumPct !== 100) {
      const diff = 100 - sumPct;
      const last = items[items.length - 1];
      return [
        ...items.slice(0, -1),
        { ...last, percentage: Math.max(0, last.percentage + diff) },
      ];
    }
    return items;
  })();

  const colorClasses: Record<ColorKey, string> = {
    primary: "bg-primary",
    loss: "bg-loss",
    warning: "bg-warning",
    "chart-5": "bg-chart-5",
  };

  const textColorClasses: Record<ColorKey, string> = {
    primary: "text-primary",
    loss: "text-loss",
    warning: "text-warning",
    "chart-5": "text-chart-5",
  };

  const bgColorClasses: Record<ColorKey, string> = {
    primary: "bg-primary/10",
    loss: "bg-loss/10",
    warning: "bg-warning/10",
    "chart-5": "bg-chart-5/10",
  };

  return (
    <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Leakage Breakdown</h3>
          <p className="text-sm text-muted-foreground">This month's revenue loss by category</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-loss">{money(currency, total)}</p>
          <p className="text-sm text-muted-foreground">Total leakage</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary mb-6">
        {normalized.map((item, index) => (
          <div
            key={item.name}
            className={cn(colorClasses[item.color], "transition-all duration-500")}
            style={{
              width: `${item.percentage}%`,
              animationDelay: `${index * 100}ms`,
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="space-y-4">
        {normalized.map((item, index) => (
          <div
            key={item.name}
            className="flex items-center justify-between animate-slide-in"
            style={{ animationDelay: `${300 + index * 100}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className={cn("h-3 w-3 rounded-full", colorClasses[item.color])} />
              <span className="text-sm font-medium text-foreground">{item.name}</span>
            </div>

            <div className="flex items-center gap-4">
              <span
                className={cn(
                  "text-sm font-semibold px-2 py-0.5 rounded-md",
                  bgColorClasses[item.color],
                  textColorClasses[item.color]
                )}
              >
                {item.percentage}%
              </span>

              <span className="text-sm font-medium text-foreground w-28 text-right">
                {money(currency, item.amount)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

