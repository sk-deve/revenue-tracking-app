import { useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, AlertCircle, CheckCircle, AlertTriangle, Info, Database, Globe, Webhook } from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "error" | "warning" | "info" | "success";
  source: string;
  message: string;
}

const mockLogs: LogEntry[] = [
  { id: "1", timestamp: "2025-01-11 14:32:15", level: "error", source: "Webhook", message: "Payment webhook failed: Timeout after 30s" },
  { id: "2", timestamp: "2025-01-11 14:30:42", level: "warning", source: "API", message: "Rate limit approaching for IP 192.168.1.1" },
  { id: "3", timestamp: "2025-01-11 14:28:18", level: "success", source: "Backup", message: "Daily backup completed successfully" },
  { id: "4", timestamp: "2025-01-11 14:25:03", level: "info", source: "System", message: "Edge function deployed: process-payment" },
  { id: "5", timestamp: "2025-01-11 14:22:55", level: "error", source: "Database", message: "Connection pool exhausted, scaling up" },
  { id: "6", timestamp: "2025-01-11 14:20:11", level: "success", source: "Auth", message: "SSO configuration updated" },
  { id: "7", timestamp: "2025-01-11 14:18:30", level: "warning", source: "Storage", message: "Storage usage at 85% capacity" },
  { id: "8", timestamp: "2025-01-11 14:15:00", level: "info", source: "System", message: "Scheduled maintenance window started" },
];

const levelIcons = {
  error: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
};

const levelStyles = {
  error: "text-destructive",
  warning: "text-warning",
  success: "text-success",
  info: "text-primary",
};

export default function SystemLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filteredLogs = mockLogs.filter((log) => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || log.level === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="System Logs & Health"
        description="Debug problems fast — saves hours when something breaks."
        actions={
          <Button variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        }
      />

      {/* Health Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-success/20">
            <Globe className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">API Status</p>
            <p className="font-semibold text-success">Operational</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-success/20">
            <Database className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Database</p>
            <p className="font-semibold text-success">Healthy</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-warning/20">
            <Webhook className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Failed Webhooks</p>
            <p className="font-semibold text-warning">3 pending</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-success/20">
            <CheckCircle className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Backup</p>
            <p className="font-semibold">2 hours ago</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "error", "warning", "success", "info"].map((level) => (
            <Button
              key={level}
              variant={filter === level ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(level)}
              className="capitalize"
            >
              {level}
            </Button>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div className="space-y-2">
        {filteredLogs.map((log) => {
          const Icon = levelIcons[log.level];
          return (
            <div key={log.id} className="stat-card flex items-start gap-4 py-4">
              <Icon className={`w-5 h-5 mt-0.5 ${levelStyles[log.level]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-mono text-muted-foreground">{log.timestamp}</span>
                  <StatusBadge
                    status={log.level === "error" ? "error" : log.level === "warning" ? "warning" : log.level === "success" ? "active" : "muted"}
                    label={log.source}
                  />
                </div>
                <p className="text-sm">{log.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
