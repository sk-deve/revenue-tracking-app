import { useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Shield, AlertTriangle, Ban, Eye, Lock, Unlock } from "lucide-react";

interface SecurityEvent {
  id: string;
  timestamp: string;
  type: "failed_login" | "suspicious" | "rate_limit" | "blocked";
  ip: string;
  user: string;
  details: string;
}

const mockEvents: SecurityEvent[] = [
  { id: "1", timestamp: "2025-01-11 14:32:15", type: "failed_login", ip: "192.168.1.105", user: "unknown@test.com", details: "5 failed attempts" },
  { id: "2", timestamp: "2025-01-11 14:28:42", type: "suspicious", ip: "10.0.0.55", user: "john@acme.com", details: "Login from new country" },
  { id: "3", timestamp: "2025-01-11 14:25:18", type: "rate_limit", ip: "172.16.0.10", user: "api-bot", details: "1000 requests/min exceeded" },
  { id: "4", timestamp: "2025-01-11 14:20:03", type: "blocked", ip: "203.0.113.50", user: "-", details: "Known malicious IP" },
  { id: "5", timestamp: "2025-01-11 14:15:55", type: "failed_login", ip: "192.168.1.200", user: "admin@platform.com", details: "3 failed attempts" },
  { id: "6", timestamp: "2025-01-11 14:10:11", type: "suspicious", ip: "10.0.0.88", user: "sarah@startup.io", details: "Unusual data export" },
];

const blockedIPs = [
  { ip: "203.0.113.50", reason: "Brute force attacks", blockedAt: "2025-01-10" },
  { ip: "198.51.100.25", reason: "Spam registration", blockedAt: "2025-01-08" },
  { ip: "192.0.2.100", reason: "API abuse", blockedAt: "2025-01-05" },
];

export default function SecurityAbuse() {
  const [searchTerm, setSearchTerm] = useState("");
  const [newBlockIP, setNewBlockIP] = useState("");

  const typeStyles: Record<string, { status: "error" | "warning" | "muted" | "active"; label: string }> = {
    failed_login: { status: "warning", label: "Failed Login" },
    suspicious: { status: "error", label: "Suspicious" },
    rate_limit: { status: "warning", label: "Rate Limit" },
    blocked: { status: "error", label: "Blocked" },
  };

  const columns = [
    { header: "Timestamp", accessor: "timestamp" as keyof SecurityEvent },
    {
      header: "Type",
      accessor: (row: SecurityEvent) => (
        <StatusBadge status={typeStyles[row.type].status} label={typeStyles[row.type].label} />
      ),
    },
    {
      header: "IP Address",
      accessor: (row: SecurityEvent) => <span className="font-mono text-sm">{row.ip}</span>,
    },
    { header: "User", accessor: "user" as keyof SecurityEvent },
    { header: "Details", accessor: "details" as keyof SecurityEvent },
    {
      header: "Actions",
      accessor: (row: SecurityEvent) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
            <Ban className="w-4 h-4" />
          </Button>
        </div>
      ),
      className: "w-24",
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Security & Abuse Protection"
        description="Protect the platform from malicious activity."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-warning/20">
            <AlertTriangle className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold">24</p>
            <p className="text-sm text-muted-foreground">Failed Logins (24h)</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-destructive/20">
            <Shield className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold">5</p>
            <p className="text-sm text-muted-foreground">Suspicious Events</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-warning/20">
            <Lock className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold">12</p>
            <p className="text-sm text-muted-foreground">Rate Limited</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-destructive/20">
            <Ban className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold">3</p>
            <p className="text-sm text-muted-foreground">Blocked IPs</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by IP or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Events Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Recent Security Events</h3>
        <DataTable columns={columns} data={mockEvents} keyField="id" />
      </div>

      {/* Blocked IPs */}
      <div className="stat-card">
        <h3 className="text-lg font-semibold mb-4">Blocked IP Addresses</h3>
        
        <div className="flex gap-3 mb-6">
          <Input
            placeholder="Enter IP to block..."
            value={newBlockIP}
            onChange={(e) => setNewBlockIP(e.target.value)}
            className="max-w-xs font-mono"
          />
          <Button className="gap-2">
            <Ban className="w-4 h-4" /> Block IP
          </Button>
        </div>

        <div className="space-y-3">
          {blockedIPs.map((item) => (
            <div key={item.ip} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm">{item.ip}</span>
                <span className="text-sm text-muted-foreground">{item.reason}</span>
                <span className="text-xs text-muted-foreground">Blocked: {item.blockedAt}</span>
              </div>
              <Button variant="ghost" size="sm" className="gap-2 text-success">
                <Unlock className="w-4 h-4" /> Unblock
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
