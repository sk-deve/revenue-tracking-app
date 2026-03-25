import { cn } from "@/lib/utils";

type StatusType = "active" | "warning" | "error" | "muted" | "trial" | "canceled" | "past_due";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
}

const statusConfig: Record<StatusType, { className: string; defaultLabel: string }> = {
  active: { className: "status-active", defaultLabel: "Active" },
  warning: { className: "status-warning", defaultLabel: "Warning" },
  error: { className: "status-error", defaultLabel: "Error" },
  muted: { className: "status-muted", defaultLabel: "Inactive" },
  trial: { className: "bg-primary/20 text-primary", defaultLabel: "Trial" },
  canceled: { className: "status-error", defaultLabel: "Canceled" },
  past_due: { className: "status-warning", defaultLabel: "Past Due" },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={cn("status-badge", config.className)}>
      {label || config.defaultLabel}
    </span>
  );
}
