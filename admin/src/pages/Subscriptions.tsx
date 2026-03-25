import { useState } from "react";
import { Search, MoreHorizontal, Play, Clock, Gift, XCircle } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Subscription {
  id: string;
  business: string;
  plan: string;
  status: "active" | "trial" | "canceled" | "past_due";
  amount: string;
  billingId: string;
  nextBilling: string;
}

const mockSubscriptions: Subscription[] = [
  { id: "1", business: "Acme Corp", plan: "Pro", status: "active", amount: "$49/mo", billingId: "ls_123abc", nextBilling: "Jan 15, 2025" },
  { id: "2", business: "TechStart Inc", plan: "Business", status: "active", amount: "$99/mo", billingId: "ls_456def", nextBilling: "Jan 20, 2025" },
  { id: "3", business: "BuildRight LLC", plan: "Starter", status: "trial", amount: "$29/mo", billingId: "ls_789ghi", nextBilling: "Trial ends Jan 25" },
  { id: "4", business: "CloudScale", plan: "Enterprise", status: "active", amount: "$299/mo", billingId: "ls_012jkl", nextBilling: "Feb 1, 2025" },
  { id: "5", business: "DataFlow", plan: "Pro", status: "past_due", amount: "$49/mo", billingId: "ls_345mno", nextBilling: "Payment failed" },
  { id: "6", business: "OldCompany", plan: "Business", status: "canceled", amount: "$99/mo", billingId: "ls_678pqr", nextBilling: "Canceled" },
];

export default function Subscriptions() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSubs = mockSubscriptions.filter((sub) =>
    sub.business.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      header: "Business",
      accessor: (row: Subscription) => (
        <div>
          <p className="font-medium">{row.business}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.billingId}</p>
        </div>
      ),
    },
    {
      header: "Plan",
      accessor: (row: Subscription) => (
        <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary text-sm font-medium">
          {row.plan}
        </span>
      ),
    },
    { header: "Amount", accessor: "amount" as keyof Subscription },
    {
      header: "Status",
      accessor: (row: Subscription) => <StatusBadge status={row.status} />,
    },
    { header: "Next Billing", accessor: "nextBilling" as keyof Subscription },
    {
      header: "Actions",
      accessor: (row: Subscription) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="gap-2">
              <Play className="w-4 h-4" /> Activate Subscription
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <Clock className="w-4 h-4" /> Extend Trial
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <Gift className="w-4 h-4" /> Grant VIP Access
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-destructive">
              <XCircle className="w-4 h-4" /> Force Cancel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-20",
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Subscriptions & Billing"
        description="Money control — saves deals and handles edge cases."
      />

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search subscriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="stat-card">
          <p className="metric-label">Total MRR</p>
          <p className="text-2xl font-bold text-success">$32,100</p>
        </div>
        <div className="stat-card">
          <p className="metric-label">Active</p>
          <p className="text-2xl font-bold">3,421</p>
        </div>
        <div className="stat-card">
          <p className="metric-label">Trials</p>
          <p className="text-2xl font-bold text-primary">287</p>
        </div>
        <div className="stat-card">
          <p className="metric-label">Past Due</p>
          <p className="text-2xl font-bold text-warning">23</p>
        </div>
        <div className="stat-card">
          <p className="metric-label">Canceled</p>
          <p className="text-2xl font-bold text-destructive">47</p>
        </div>
      </div>

      <DataTable columns={columns} data={filteredSubs} keyField="id" />
    </div>
  );
}
