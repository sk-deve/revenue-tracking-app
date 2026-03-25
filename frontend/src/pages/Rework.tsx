import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Plus, RotateCcw, Clock, DollarSign, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

/** =========================
 *  Types
 *  ========================= */

type UiReason = "quality" | "misquote" | "error" | "scope" | "communication";
type ApiReason = "Quality" | "Misquote" | "Error" | "Customer" | "Other";

type ReworkOverviewResponse = {
  success: boolean;
  message?: string;
  code?: string;

  currency: string;
  range: { from: string; to: string };

  kpis: {
    totalReworkLoss: number;
    hoursLost: number; // we added this in controller
    incidents: number;
    avgHours?: number;
    topReason?: string;
  };

  rows: Array<{
    id: string;
    jobRef: string;
    hours: number;
    costPerHour: number;
    loss: number;
    reason: ApiReason | string;
    description?: string;
    date: string;
    createdBy?: string | null;
  }>;
};

type UiIncident = {
  id: string;
  jobId: string;
  client: string; // not in backend yet (we'll show "—" for now)
  reason: UiReason;
  hoursSpent: number;
  costPerHour: number;
  totalCost: number;
  description: string;
  date: string;
};

/** =========================
 *  Config
 *  ========================= */

const API_BASE = "http://localhost:4000"; // change if needed

const uiReasonToApi = (r: UiReason): ApiReason => {
  // Map your UI reasons to backend enum reasons
  switch (r) {
    case "quality":
      return "Quality";
    case "misquote":
      return "Misquote";
    case "error":
      return "Error";
    case "communication":
      return "Customer"; // closest match
    case "scope":
      return "Other"; // closest match
    default:
      return "Quality";
  }
};

const apiReasonToUi = (r: string): UiReason => {
  const v = String(r || "").toLowerCase();
  if (v.includes("quality")) return "quality";
  if (v.includes("misquote")) return "misquote";
  if (v.includes("error")) return "error";
  if (v.includes("customer")) return "communication";
  return "scope"; // fallback bucket
};

const formatCurrency = (currency: string, amount: number) => {
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

const toInputNumber = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const reasonColors: Record<UiReason, string> = {
  quality: "bg-loss/10 text-loss border-loss/30",
  misquote: "bg-warning/10 text-warning border-warning/30",
  error: "bg-primary/10 text-primary border-primary/30",
  scope: "bg-chart-5/10 text-chart-5 border-chart-5/30",
  communication: "bg-success/10 text-success border-success/30",
};

/** =========================
 *  Component
 *  ========================= */

export default function Rework() {
  const [showForm, setShowForm] = useState(false);

  const [data, setData] = useState<ReworkOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // form state
  const [jobRef, setJobRef] = useState("");
  const [hoursSpent, setHoursSpent] = useState<string>("");
  const [costPerHour, setCostPerHour] = useState<string>("");
  const [reason, setReason] = useState<UiReason | "">("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);

  const currency = data?.currency || "USD";

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      setNeedsOnboarding(false);

      const token = localStorage.getItem("token");

      const res = await axios.get<ReworkOverviewResponse>(`${API_BASE}/api/rework/overview`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        // withCredentials: true, // if you use cookies
      });

      if (res.data?.success) {
        setData(res.data);
      } else {
        setErrorMsg(res.data?.message || "Failed to load rework overview.");
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const apiMessage = err?.response?.data?.message;
      const apiCode = err?.response?.data?.code;

      if (status === 403 && apiCode === "ONBOARDING_REQUIRED") {
        setNeedsOnboarding(true);
        setErrorMsg("Onboarding is required.");
      } else if (status === 401) {
        setErrorMsg("Your session expired. Please login again.");
      } else {
        setErrorMsg(apiMessage || "Server error loading rework overview.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Build UI incidents from API rows */
  const incidents: UiIncident[] = useMemo(() => {
    if (!data) return [];

    return data.rows.map((x) => ({
      id: x.id,
      jobId: x.jobRef,
      client: "—", // backend doesn’t have client yet
      reason: apiReasonToUi(x.reason),
      hoursSpent: x.hours,
      costPerHour: x.costPerHour,
      totalCost: x.loss,
      description: x.description || "",
      date: new Date(x.date).toISOString().slice(0, 10),
    }));
  }, [data]);

  /** KPIs */
  const totalCost = data?.kpis?.totalReworkLoss ?? 0;
  const totalHours = data?.kpis?.hoursLost ?? 0;
  const incidentCount = data?.kpis?.incidents ?? incidents.length;

  /** Chart: cost grouped by reason */
  const reworkByReason = useMemo(() => {
    const buckets: Record<string, { reason: string; count: number; cost: number }> = {};

    for (const x of incidents) {
      const title =
        x.reason === "quality"
          ? "Quality"
          : x.reason === "misquote"
          ? "Misquote"
          : x.reason === "error"
          ? "Error"
          : x.reason === "communication"
          ? "Communication"
          : "Scope/Other";

      if (!buckets[title]) buckets[title] = { reason: title, count: 0, cost: 0 };
      buckets[title].count += 1;
      buckets[title].cost += x.totalCost;
    }

    // keep a stable order
    const order = ["Quality", "Misquote", "Error", "Communication", "Scope/Other"];
    return order
      .filter((k) => buckets[k])
      .map((k) => ({
        reason: buckets[k].reason,
        count: buckets[k].count,
        cost: Math.round(buckets[k].cost),
      }));
  }, [incidents]);

  const resetForm = () => {
    setJobRef("");
    setHoursSpent("");
    setCostPerHour("");
    setReason("");
    setDescription("");
  };

  const submitIncident = async () => {
    try {
      setSaving(true);

      if (!jobRef.trim()) {
        setErrorMsg("Job reference is required.");
        return;
      }
      if (!hoursSpent || toInputNumber(hoursSpent) <= 0) {
        setErrorMsg("Hours must be greater than 0.");
        return;
      }
      if (!reason) {
        setErrorMsg("Please select a reason.");
        return;
      }

      const token = localStorage.getItem("token");

      // backend accepts: jobRef, hours, costPerHour, reason (Title Case), description, date
      await axios.post(
        `${API_BASE}/api/rework`,
        {
          jobRef: jobRef.trim(),
          hours: toInputNumber(hoursSpent),
          costPerHour: costPerHour ? toInputNumber(costPerHour) : undefined, // if empty, backend uses onboarding laborCostPerHour
          reason: uiReasonToApi(reason),
          description: description.trim(),
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          // withCredentials: true,
        }
      );

      // refresh UI
      await fetchOverview();
      resetForm();
      setShowForm(false);
    } catch (err: any) {
      const status = err?.response?.status;
      const apiMessage = err?.response?.data?.message;
      const apiCode = err?.response?.data?.code;

      if (status === 403 && apiCode === "ONBOARDING_REQUIRED") {
        setNeedsOnboarding(true);
        setErrorMsg("Onboarding is required to log incidents.");
      } else if (status === 401) {
        setErrorMsg("Your session expired. Please login again.");
      } else {
        setErrorMsg(apiMessage || "Server error saving incident.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Rework & Mistakes" subtitle="Loading rework overview...">
        <div className="p-6 text-sm text-muted-foreground">Loading...</div>
      </DashboardLayout>
    );
  }

  if (needsOnboarding) {
    return (
      <DashboardLayout title="Rework & Mistakes" subtitle="Action needed">
        <div className="p-6 rounded-lg border">
          <div className="font-semibold mb-1">Complete onboarding to unlock rework tracking</div>
          <div className="text-sm text-muted-foreground mb-4">
            Your account setup is incomplete. Finish onboarding and come back here.
          </div>
          <a
            href="/onboarding"
            className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground"
          >
            Continue Onboarding
          </a>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Rework & Mistakes" subtitle="Track and analyze costly errors and rework">
      <div className="space-y-6">
        {/* Error banner */}
        {errorMsg && (
          <div className="rounded-lg border p-4 text-sm">
            <div className="font-semibold mb-1">Notice</div>
            <div className="text-muted-foreground">{errorMsg}</div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-5 loss-gradient animate-fade-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Rework Cost</p>
                <p className="text-2xl font-bold text-loss mt-1">{formatCurrency(currency, totalCost)}</p>
              </div>
              <div className="p-3 rounded-xl bg-loss/10">
                <DollarSign className="h-6 w-6 text-loss" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 warning-gradient animate-fade-up" style={{ animationDelay: "50ms" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hours Lost</p>
                <p className="text-2xl font-bold text-warning mt-1">{totalHours}h</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 animate-fade-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Incidents</p>
                <p className="text-2xl font-bold text-foreground mt-1">{incidentCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <AlertOctagon className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 animate-fade-up" style={{ animationDelay: "150ms" }}>
            <Button onClick={() => setShowForm(!showForm)} className="w-full h-full gap-2">
              <Plus className="h-5 w-5" />
              Log Incident
            </Button>
          </div>
        </div>

        {/* Log Form */}
        {showForm && (
          <div className="glass-card rounded-xl p-6 animate-fade-up">
            <h3 className="text-lg font-semibold text-foreground mb-4">Log Rework Incident</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Job Reference</label>
                <Input value={jobRef} onChange={(e) => setJobRef(e.target.value)} placeholder="JOB-XXXX" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Hours Spent</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={hoursSpent}
                  onChange={(e) => setHoursSpent(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Cost Per Hour</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={costPerHour}
                  onChange={(e) => setCostPerHour(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use your onboarding labor cost per hour.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Reason</label>
                <Select value={reason} onValueChange={(v) => setReason(v as UiReason)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quality">Quality Issue</SelectItem>
                    <SelectItem value="misquote">Misquote</SelectItem>
                    <SelectItem value="error">Error/Bug</SelectItem>
                    <SelectItem value="scope">Scope Change</SelectItem>
                    <SelectItem value="communication">Communication Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={submitIncident} disabled={saving}>
                {saving ? "Saving..." : "Log Incident"}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Charts and Table Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar Chart */}
          <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "200ms" }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Rework by Reason</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reworkByReason} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(220, 13%, 91%)"
                    strokeOpacity={0.3}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatCurrency(currency, value).replace(/\.00$/, "")}
                    tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 12 }}
                  />
                  <YAxis
                    dataKey="reason"
                    type="category"
                    width={110}
                    tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(currency, value), "Cost"]}
                    contentStyle={{
                      backgroundColor: "hsl(0, 0%, 100%)",
                      border: "1px solid hsl(220, 13%, 91%)",
                      borderRadius: "12px",
                    }}
                  />
                  <Bar dataKey="cost" fill="hsl(4, 90%, 58%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Incidents List */}
          <div className="lg:col-span-2 glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "250ms" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Recent Incidents</h3>
              <Button variant="outline" size="sm" onClick={fetchOverview}>
                Refresh
              </Button>
            </div>

            {incidents.length === 0 ? (
              <div className="text-sm text-muted-foreground">No incidents logged this month.</div>
            ) : (
              <div className="space-y-3">
                {incidents.map((incident, index) => (
                  <div
                    key={incident.id}
                    className={cn(
                      "p-4 rounded-lg border transition-all duration-200 hover:shadow-md animate-slide-in",
                      reasonColors[incident.reason]
                    )}
                    style={{ animationDelay: `${300 + index * 80}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-current/10">
                          <RotateCcw className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-medium">{incident.jobId}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-current/20 capitalize">
                              {incident.reason}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/80 mt-1">{incident.description || "—"}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {incident.client} • {incident.date}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-loss">
                          -{formatCurrency(currency, incident.totalCost)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {incident.hoursSpent}h × {formatCurrency(currency, incident.costPerHour)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
