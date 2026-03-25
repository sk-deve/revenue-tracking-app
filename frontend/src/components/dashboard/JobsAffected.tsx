import { Briefcase, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type JobsAffectedRow = {
  id: string;
  status: string; // "Won" | "Lost" etc
  quoted: number;
  final: number | null;
  leakage: number | null;
  reason: string | null;
  createdAt: string;
  currency: string;
};

type Props = {
  items: JobsAffectedRow[];   // from backend recent jobs (or affected jobs endpoint later)
  totalCount: number;         // from kpis.jobsAffected.count
  currency: string;
  onViewAll?: () => void;
};

type LeakType = "discount" | "rework" | "margin" | "other";
type UiStatus = "open" | "closed";

const typeColors: Record<Exclude<LeakType, "other"> | "other", string> = {
  discount: "bg-loss/10 text-loss",
  rework: "bg-warning/10 text-warning",
  margin: "bg-primary/10 text-primary",
  other: "bg-muted text-muted-foreground",
};

const statusColors: Record<UiStatus, string> = {
  open: "bg-success/10 text-success",
  closed: "bg-muted text-muted-foreground",
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

// ✅ Try to infer type with what we have
const inferType = (row: JobsAffectedRow): LeakType => {
  const q = Number(row.quoted || 0);
  const f = Number(row.final || 0);
  const leak = Number(row.leakage || 0);

  // if quoted > final => discount
  if (row.final !== null && q > 0 && f >= 0 && q > f) return "discount";

  // if there is leakage but not discount => margin/other
  if (leak > 0) return "margin";

  return "other";
};

const mapStatus = (status: string): UiStatus => {
  // You can change logic based on your meaning
  // Won = closed, Lost = closed, else open
  if (status === "Won" || status === "Lost") return "closed";
  return "open";
};

const shortId = (id: string) => {
  if (!id) return "JOB";
  return `JOB-${id.slice(-6).toUpperCase()}`;
};

export function JobsAffected({ items, totalCount, currency, onViewAll }: Props) {
  const rows = items ?? [];

  const totalLeakage = rows.reduce((sum, r) => sum + (r.leakage ? Number(r.leakage) : 0), 0);

  return (
    <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "350ms" }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Jobs Affected</h3>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{totalCount}</p>
          <p className="text-sm text-muted-foreground">{money(currency, totalLeakage)} lost</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">
                Job
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">
                Details
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">
                Type
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">
                Leakage
              </th>
              <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                  No affected jobs found.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const type = inferType(row);
                const uiStatus = mapStatus(row.status);

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-muted/30 transition-colors animate-slide-in"
                    style={{ animationDelay: `${450 + index * 80}ms` }}
                  >
                    <td className="py-3">
                      <span className="text-sm font-mono font-medium text-primary">
                        {shortId(row.id)}
                      </span>
                    </td>

                    <td className="py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {row.reason ? row.reason : "No reason provided"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(row.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </td>

                    <td className="py-3">
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-1 rounded-full capitalize",
                          typeColors[type]
                        )}
                      >
                        {type === "other" ? "other" : type}
                      </span>
                    </td>

                    <td className="py-3 text-right">
                      <span className="text-sm font-semibold text-loss">
                        -{money(currency, row.leakage ? Number(row.leakage) : 0)}
                      </span>
                    </td>

                    <td className="py-3 text-center">
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-1 rounded-full capitalize",
                          statusColors[uiStatus]
                        )}
                      >
                        {uiStatus}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Button type="button" variant="outline" className="w-full mt-4 gap-2" onClick={onViewAll}>
        View All Jobs
        <ExternalLink className="h-4 w-4" />
      </Button>
    </div>
  );
}

