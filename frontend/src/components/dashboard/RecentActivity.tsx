import { Clock, DollarSign, Percent, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export type RecentActivityItem = {
  id: string;
  status: string; // "Won" | "Lost" etc
  quoted: number;
  final: number | null;
  leakage: number | null;
  reason: string | null;
  createdAt: string;
  currency: string;
};

type ActivityType = "discount" | "rework" | "quote" | "margin";

type Props = {
  items: RecentActivityItem[];
  onViewAll?: () => void;
};

const iconMap: Record<ActivityType, any> = {
  discount: Percent,
  rework: RotateCcw,
  quote: DollarSign,
  margin: DollarSign,
};

const typeStyles: Record<ActivityType, string> = {
  discount: "text-loss bg-loss/10",
  rework: "text-warning bg-warning/10",
  quote: "text-success bg-success/10",
  margin: "text-primary bg-primary/10",
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

const shortJobId = (id: string) => `JOB-${id.slice(-6).toUpperCase()}`;

const relativeTime = (iso: string) => {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - d);

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
};

// ✅ infer type from backend fields
const inferType = (x: RecentActivityItem): ActivityType => {
  const q = Number(x.quoted || 0);
  const f = Number(x.final || 0);

  // discount if quoted > final (won jobs)
  if (x.final !== null && q > 0 && f >= 0 && q > f) return "discount";

  // rework isn't in your backend recent payload; keep reserved for later
  // margin if there is leakage amount
  if (Number(x.leakage || 0) > 0) return "margin";

  // quote if lost OR no final
  if (x.status === "Lost" || x.final === null) return "quote";

  return "margin";
};

export function RecentActivity({ items, onViewAll }: Props) {
  const list = items ?? [];

  return (
    <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "400ms" }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View All
        </button>
      </div>

      {list.length === 0 ? (
        <div className="text-sm text-muted-foreground">No recent activity yet.</div>
      ) : (
        <div className="space-y-4">
          {list.map((activity, index) => {
            const type = inferType(activity);
            const Icon = iconMap[type];

            // amount logic:
            // - if leakage exists => negative number (loss)
            // - else show quoted (positive)
            const isLoss = Number(activity.leakage || 0) > 0;
            const amountText = isLoss
              ? `-${money(activity.currency, Number(activity.leakage || 0))}`
              : money(activity.currency, Number(activity.quoted || 0));

            // description logic:
            const description =
              activity.reason ||
              (type === "discount"
                ? "Discount applied to job"
                : type === "quote"
                ? "Quote updated"
                : "Leakage event recorded");

            return (
              <div
                key={activity.id}
                className="flex items-center gap-4 animate-slide-in"
                style={{ animationDelay: `${500 + index * 80}ms` }}
              >
                <div className={cn("p-2 rounded-lg", typeStyles[type])}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{description}</p>
                    <span className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      {shortJobId(activity.id)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{relativeTime(activity.createdAt)}</p>
                </div>

                <span
                  className={cn(
                    "text-sm font-semibold",
                    isLoss ? "text-loss" : "text-success"
                  )}
                >
                  {amountText}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

