import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change?: {
    value: string;
    trend: "up" | "down";
    isPositive?: boolean;
  };
  icon: ReactNode;
  variant?: "default" | "loss" | "success" | "warning";
  className?: string;
  delay?: number;
}

export function MetricCard({
  title,
  value,
  change,
  icon,
  variant = "default",
  className,
  delay = 0,
}: MetricCardProps) {
  const gradientClasses = {
    default: "metric-gradient",
    loss: "loss-gradient",
    success: "success-gradient",
    warning: "warning-gradient",
  };

  const iconClasses = {
    default: "text-primary bg-primary/10",
    loss: "text-loss bg-loss/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
  };

  return (
    <div
      className={cn(
        "glass-card rounded-xl p-6 animate-fade-up",
        gradientClasses[variant],
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {change && (
            <div className="flex items-center gap-1.5">
              {change.trend === "up" ? (
                <TrendingUp className={cn("h-4 w-4", change.isPositive ? "text-success" : "text-loss")} />
              ) : (
                <TrendingDown className={cn("h-4 w-4", change.isPositive ? "text-success" : "text-loss")} />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  change.isPositive ? "text-success" : "text-loss"
                )}
              >
                {change.value}
              </span>
              <span className="text-sm text-muted-foreground">vs last month</span>
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", iconClasses[variant])}>{icon}</div>
      </div>
    </div>
  );
}
