import { AlertTriangle, Percent, RotateCcw, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type WarningItem = {
  id: string;
  title: string;
  message: string;
  severity: "high" | "medium" | "low";
  count: number;
};

type IconKey = "discount" | "rework" | "margin";

type Props = {
  warnings: WarningItem[];
  onViewAll?: () => void; // optional click handler
};

const iconMap: Record<IconKey, any> = {
  discount: Percent,
  rework: RotateCcw,
  margin: TrendingDown,
};

const severityStyles = {
  high: {
    bg: "bg-loss/10",
    border: "border-loss/30",
    icon: "text-loss bg-loss/20",
    badge: "bg-loss text-loss-foreground",
    pulse: true,
  },
  medium: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    icon: "text-warning bg-warning/20",
    badge: "bg-warning text-warning-foreground",
    pulse: false,
  },
  low: {
    bg: "bg-primary/10",
    border: "border-primary/30",
    icon: "text-primary bg-primary/20",
    badge: "bg-primary text-primary-foreground",
    pulse: false,
  },
} as const;

// ✅ decide icon based on warning id/title text
const getIconKey = (w: WarningItem): IconKey => {
  const text = `${w.id} ${w.title}`.toLowerCase();

  if (text.includes("discount")) return "discount";
  if (text.includes("rework")) return "rework";
  if (text.includes("margin")) return "margin";

  // fallback: choose based on message keywords
  const msg = (w.message || "").toLowerCase();
  if (msg.includes("discount")) return "discount";
  if (msg.includes("rework")) return "rework";
  if (msg.includes("margin")) return "margin";

  // default safe
  return "discount";
};

// ✅ badge text
const badgeValue = (w: WarningItem) => {
  // Your backend gives "count". Use xN.
  if (Number.isFinite(w.count) && w.count > 0) return `x${w.count}`;
  return "!";
};

export function WarningIndicators({ warnings, onViewAll }: Props) {
  const list = warnings ?? [];

  return (
    <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "300ms" }}>
      <div className="flex items-center gap-2 mb-6">
        <AlertTriangle className="h-5 w-5 text-warning" />
        <h3 className="text-lg font-semibold text-foreground">Warning Indicators</h3>
      </div>

      {list.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No alerts triggered for this period.
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((warning, index) => {
            const iconKey = getIconKey(warning);
            const Icon = iconMap[iconKey];
            const styles = severityStyles[warning.severity];

            return (
              <div
                key={warning.id}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border transition-all duration-200 hover:shadow-md animate-slide-in",
                  styles.bg,
                  styles.border
                )}
                style={{ animationDelay: `${400 + index * 100}ms` }}
              >
                <div
                  className={cn("p-2 rounded-lg", styles.icon, styles.pulse && "animate-pulse-subtle")}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-foreground">{warning.title}</h4>
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", styles.badge)}>
                      {badgeValue(warning)}
                    </span>
                  </div>

                  {/* backend `message` -> UI description */}
                  <p className="text-sm text-muted-foreground">{warning.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={onViewAll}
        className="w-full mt-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        View All Alerts →
      </button>
    </div>
  );
}
