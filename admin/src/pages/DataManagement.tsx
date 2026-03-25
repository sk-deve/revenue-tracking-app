import { useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  Download,
  Trash2,
  Search,
  Database,
  FileJson,
  Shield,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DataRequest {
  id: string;
  user: string;
  email: string;
  type: "export" | "delete";
  status: "pending" | "completed" | "processing";
  requestedAt: string;
}

const mockRequests: DataRequest[] = [
  { id: "1", user: "John Doe", email: "john@example.com", type: "export", status: "completed", requestedAt: "2025-01-10" },
  { id: "2", user: "Sarah Wilson", email: "sarah@company.io", type: "delete", status: "pending", requestedAt: "2025-01-11" },
  { id: "3", user: "Mike Johnson", email: "mike@startup.co", type: "export", status: "processing", requestedAt: "2025-01-11" },
];

export default function DataManagement() {
  const [searchEmail, setSearchEmail] = useState("");
  const [deleteEmail, setDeleteEmail] = useState("");

  const columns = [
    {
      header: "User",
      accessor: (row: DataRequest) => (
        <div>
          <p className="font-medium">{row.user}</p>
          <p className="text-sm text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      header: "Type",
      accessor: (row: DataRequest) => (
        <span className={`px-2.5 py-1 rounded-md text-sm font-medium ${
          row.type === "export" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
        }`}>
          {row.type === "export" ? "Data Export" : "Account Deletion"}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: (row: DataRequest) => (
        <StatusBadge
          status={row.status === "completed" ? "active" : row.status === "processing" ? "warning" : "muted"}
          label={row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        />
      ),
    },
    { header: "Requested", accessor: "requestedAt" as keyof DataRequest },
    {
      header: "Actions",
      accessor: (row: DataRequest) => (
        <div className="flex gap-2">
          {row.type === "export" && row.status === "completed" && (
            <Button variant="ghost" size="sm" className="gap-2">
              <Download className="w-4 h-4" /> Download
            </Button>
          )}
          {row.status === "pending" && (
            <Button variant="ghost" size="sm">Process</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Data Management & Compliance"
        description="Legal, privacy, and data safety controls."
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/20">
            <Database className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">2.4 TB</p>
            <p className="text-sm text-muted-foreground">Total Data Stored</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-success/20">
            <Shield className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold">AES-256</p>
            <p className="text-sm text-muted-foreground">Encryption</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-warning/20">
            <Clock className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold">90 days</p>
            <p className="text-sm text-muted-foreground">Data Retention</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-muted">
            <FileJson className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold">3</p>
            <p className="text-sm text-muted-foreground">Pending Requests</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Export User Data */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Export User Data</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Export all data for a specific user (GDPR compliant).
          </p>
          <div className="flex gap-3">
            <Input
              placeholder="Enter user email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="flex-1"
            />
            <Button className="gap-2">
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        </div>

        {/* Delete Account */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 className="w-5 h-5 text-destructive" />
            <h3 className="text-lg font-semibold">Delete Account</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete a user account and all associated data.
          </p>
          <div className="flex gap-3">
            <Input
              placeholder="Enter user email..."
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              className="flex-1"
            />
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Confirm Account Deletion
                  </DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. All user data will be permanently deleted.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm">
                    You are about to delete the account for: <strong>{deleteEmail || "No email entered"}</strong>
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button variant="destructive">Confirm Delete</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Recent Requests */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Recent Data Requests</h3>
        <DataTable columns={columns} data={mockRequests} keyField="id" />
      </div>

      {/* Data Retention */}
      <div className="mt-8 stat-card">
        <h3 className="text-lg font-semibold mb-4">Data Retention Rules</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div>
              <p className="font-medium">User Activity Logs</p>
              <p className="text-sm text-muted-foreground">Login history, actions, audit trail</p>
            </div>
            <span className="text-sm font-medium">90 days</span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div>
              <p className="font-medium">Deleted Account Data</p>
              <p className="text-sm text-muted-foreground">Soft-deleted accounts before permanent removal</p>
            </div>
            <span className="text-sm font-medium">30 days</span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div>
              <p className="font-medium">Backup Retention</p>
              <p className="text-sm text-muted-foreground">Database and file backups</p>
            </div>
            <span className="text-sm font-medium">365 days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
