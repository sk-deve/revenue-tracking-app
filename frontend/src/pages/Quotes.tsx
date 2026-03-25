import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

interface Quote {
  id: string;
  client: string;
  service: string;
  quotedPrice: number;
  finalPrice: number; // 0 means none (Lost/Pending)
  discount: number; // percent
  discountReason: string;
  status: "won" | "lost" | "pending";
  leakage: number;
  date: string; // yyyy-mm-dd
}

type JobsRecentApiRow = {
  id: string;
  clientName?: string;
  service?: string;

  status: "Won" | "Lost" | string;
  quoted: number;
  final: number | null;
  leakage: number | null;
  reason: string | null;

  date?: string;
  createdAt?: string;
  notes?: string | null;
};

type JobsRecentResponse = {
  success: boolean;
  message?: string;
  rows?: JobsRecentApiRow[];
};

type CreateJobResponse = {
  success: boolean;
  message?: string;
  job?: any;
};

const API_BASE = import.meta.env.VITE_API_URL;

const statusColors: Record<Quote["status"], string> = {
  won: "bg-success/10 text-success",
  lost: "bg-loss/10 text-loss",
  pending: "bg-warning/10 text-warning",
};

const money = (amount: number) => `$${Math.round(amount).toLocaleString()}`;

const toYMD = (iso: string | Date) => {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const calcDiscountPct = (quoted: number, final: number) => {
  if (quoted > 0 && final >= 0 && quoted > final) {
    return Math.round(((quoted - final) / quoted) * 1000) / 10; // 1 decimal
  }
  return 0;
};

const mapStatus = (backendStatus: string): Quote["status"] => {
  if (backendStatus === "Won") return "won";
  if (backendStatus === "Lost") return "lost";
  return "pending";
};

const mapReasonLabel = (v: string) => {
  switch (v) {
    case "volume":
      return "Volume Discount";
    case "competitive":
      return "Competitive Pricing";
    case "longterm":
      return "Long-term Client";
    case "negotiation":
      return "Negotiation";
    case "other":
      return "Other";
    default:
      return v || "-";
  }
};

export default function Quotes() {
  const [showForm, setShowForm] = useState(false);

  // ✅ list state
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ✅ search
  const [search, setSearch] = useState("");

  // ✅ FILTERS
  const [showFilter, setShowFilter] = useState(false);
  const filterWrapRef = useRef<HTMLDivElement | null>(null);

  const [filterStatus, setFilterStatus] = useState<"all" | Quote["status"]>("all");
  const [filterReason, setFilterReason] = useState<"all" | string>("all");
  const [filterService, setFilterService] = useState("");
  const [minDiscount, setMinDiscount] = useState<string>(""); // percent
  const [dateFrom, setDateFrom] = useState<string>(""); // yyyy-mm-dd
  const [dateTo, setDateTo] = useState<string>(""); // yyyy-mm-dd

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterReason("all");
    setFilterService("");
    setMinDiscount("");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters =
    filterStatus !== "all" ||
    filterReason !== "all" ||
    !!filterService.trim() ||
    !!minDiscount.trim() ||
    !!dateFrom ||
    !!dateTo;

  // ✅ close filter dropdown when click outside
  useEffect(() => {
  const onDown = (e: MouseEvent) => {
    if (!showFilter) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    // ✅ 1) If click is inside the filter wrapper, do nothing
    const wrap = filterWrapRef.current;
    if (wrap && wrap.contains(target)) return;

    /**
     * ✅ 2) Radix Select renders dropdown in a portal (outside wrap).
     * So clicking on SelectContent triggers "outside click" unless we ignore it.
     *
     * We ignore clicks that happen inside any Radix portal content.
     * Common attributes/classes Radix uses:
     * - [data-radix-popper-content-wrapper]
     * - [data-radix-portal]
     */
    const inRadixPortal =
      !!target.closest("[data-radix-popper-content-wrapper]") ||
      !!target.closest("[data-radix-portal]");

    if (inRadixPortal) return;

    // ✅ otherwise close filter popup
    setShowFilter(false);
  };

  // mousedown works better than click for outside detect
  window.addEventListener("mousedown", onDown);
  return () => window.removeEventListener("mousedown", onDown);
}, [showFilter]);


  // ✅ form state
  const [clientName, setClientName] = useState("");
  const [service, setService] = useState("");
  const [quotedPrice, setQuotedPrice] = useState<string>("");
  const [finalPrice, setFinalPrice] = useState<string>("");
  const [discountReason, setDiscountReason] = useState<string>("");
  const [status, setStatus] = useState<Quote["status"]>("pending");
  const [notes, setNotes] = useState("");

  // ✅ token header
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const mapRowsToQuotes = (rows: JobsRecentApiRow[]) => {
    return rows.map((r) => {
      const q = Number(r.quoted || 0);
      const f = r.final === null || r.final === undefined ? 0 : Number(r.final);
      const disc = calcDiscountPct(q, f);

      const dateIso = r.date || r.createdAt || new Date().toISOString();

      const idStr = String(r.id || "");
      const quoteId = idStr ? `QT-${idStr.slice(-6).toUpperCase()}` : "QT-UNKNOWN";

      return {
        id: quoteId,
        client: r.clientName || "—",
        service: r.service || "—",
        quotedPrice: q,
        finalPrice: f,
        discount: disc,
        discountReason: r.reason || "-",
        status: mapStatus(r.status),
        leakage: r.leakage ? Number(r.leakage) : 0,
        date: toYMD(dateIso),
      };
    });
  };

  // ✅ load recent jobs
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await axios.get<JobsRecentResponse>(`${API_BASE}/api/jobs/recent?limit=50`, {
          headers: getAuthHeaders(),
        });

        if (!alive) return;

        if (!res.data?.success) {
          setErrorMsg(res.data?.message || "Failed to load quotes.");
          setQuotes([]);
          return;
        }

        const rows = res.data.rows || [];
        setQuotes(mapRowsToQuotes(rows));
      } catch (err: any) {
        const status = err?.response?.status;
        const apiMessage = err?.response?.data?.message;
        const apiCode = err?.response?.data?.code;

        if (status === 403 && apiCode === "ONBOARDING_REQUIRED") {
          setErrorMsg("Onboarding is required to manage quotes.");
        } else if (status === 401) {
          setErrorMsg("Your session expired. Please login again.");
        } else {
          setErrorMsg(apiMessage || "Server error loading quotes.");
        }
        setQuotes([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const filteredQuotes = useMemo(() => {
    const s = search.trim().toLowerCase();

    return quotes.filter((q) => {
      // search
      const matchesSearch =
        !s ||
        q.id.toLowerCase().includes(s) ||
        q.client.toLowerCase().includes(s) ||
        q.service.toLowerCase().includes(s) ||
        q.status.toLowerCase().includes(s) ||
        (q.discountReason || "").toLowerCase().includes(s);

      if (!matchesSearch) return false;

      // status
      if (filterStatus !== "all" && q.status !== filterStatus) return false;

      // reason (exact match)
      if (filterReason !== "all") {
        const r = (q.discountReason || "").toLowerCase();
        if (r !== String(filterReason).toLowerCase()) return false;
      }

      // service contains
      if (filterService.trim()) {
        if (!q.service.toLowerCase().includes(filterService.trim().toLowerCase())) return false;
      }

      // min discount
      if (minDiscount.trim() !== "") {
        const min = Number(minDiscount);
        if (Number.isFinite(min) && q.discount < min) return false;
      }

      // date range (q.date is yyyy-mm-dd)
      if (dateFrom) {
        if (q.date < dateFrom) return false;
      }
      if (dateTo) {
        if (q.date > dateTo) return false;
      }

      return true;
    });
  }, [quotes, search, filterStatus, filterReason, filterService, minDiscount, dateFrom, dateTo]);

  // ✅ summary cards (dynamic)
  const summary = useMemo(() => {
    const totalQuoted = quotes.reduce((sum, q) => sum + (q.quotedPrice || 0), 0);
    const totalWon = quotes
      .filter((q) => q.status === "won")
      .reduce((sum, q) => sum + (q.finalPrice || 0), 0);
    const totalLeakage = quotes.reduce((sum, q) => sum + (q.leakage || 0), 0);

    return { totalQuoted, totalWon, totalLeakage };
  }, [quotes]);

  const resetForm = () => {
    setClientName("");
    setService("");
    setQuotedPrice("");
    setFinalPrice("");
    setDiscountReason("");
    setStatus("pending");
    setNotes("");
  };

  const validateForm = () => {
    if (!clientName.trim()) return "Client name is required.";
    if (!service.trim()) return "Service is required.";
    if (quotedPrice.trim() === "") return "Quoted price is required.";

    const q = Number(quotedPrice);
    if (!Number.isFinite(q) || q < 0) return "Quoted price must be a valid number.";

    if (status === "won") {
      if (finalPrice.trim() === "") return "Final price is required for Won jobs.";
      const f = Number(finalPrice);
      if (!Number.isFinite(f) || f < 0) return "Final price must be a valid number.";
    }

    return null;
  };

  const handleSave = async () => {
    const v = validateForm();
    if (v) {
      setErrorMsg(v);
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);

      // backend expects Won/Lost (pending treated as Won in backend)
      const backendStatus = status === "lost" ? "Lost" : "Won";

      const payload: any = {
        clientName: clientName.trim(),
        service: service.trim(),
        quotedPrice: Number(quotedPrice),
        discountReason: discountReason ? mapReasonLabel(discountReason) : "",
        status: backendStatus,
        notes: notes.trim(),
        date: new Date().toISOString(),
      };

      if (backendStatus === "Won") {
        payload.finalPrice = Number(finalPrice || 0);
      } else {
        payload.finalPrice = null;
      }

      const res = await axios.post<CreateJobResponse>(`${API_BASE}/api/jobs`, payload, {
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      });

      if (!res.data?.success) {
        setErrorMsg(res.data?.message || "Failed to save quote.");
        return;
      }

      // refresh
      const refresh = await axios.get<JobsRecentResponse>(`${API_BASE}/api/jobs/recent?limit=50`, {
        headers: getAuthHeaders(),
      });

      if (refresh.data?.success) {
        const rows = refresh.data.rows || [];
        setQuotes(mapRowsToQuotes(rows));
      }

      setShowForm(false);
      resetForm();
    } catch (err: any) {
      const status = err?.response?.status;
      const apiMessage = err?.response?.data?.message;
      const apiCode = err?.response?.data?.code;

      if (status === 403 && apiCode === "ONBOARDING_REQUIRED") {
        setErrorMsg("Onboarding is required to save quotes.");
      } else if (status === 401) {
        setErrorMsg("Your session expired. Please login again.");
      } else {
        setErrorMsg(apiMessage || "Server error saving quote.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Quotes & Jobs" subtitle="Manage quotes and track job revenue leakage">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search quotes..."
                className="pl-9 bg-card border-border"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* ✅ Filter dropdown (works) */}
            <div className="relative" ref={filterWrapRef}>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setShowFilter((v) => !v)}
              >
                <Filter className="h-4 w-4" />
                Filter
                {hasActiveFilters && (
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-medium text-primary">
                    !
                  </span>
                )}
              </Button>

              {showFilter && (
                <div className="absolute left-0 mt-2 w-[320px] z-50 rounded-xl border border-border bg-card shadow-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold">Filters</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setShowFilter(false)}
                    >
                      Close
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">Status</div>
                      <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="won">Won</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">Discount Reason</div>
                      <Select value={filterReason} onValueChange={setFilterReason}>
                        <SelectTrigger>
                          <SelectValue placeholder="All reasons" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="Volume Discount">Volume Discount</SelectItem>
                          <SelectItem value="Competitive Pricing">Competitive Pricing</SelectItem>
                          <SelectItem value="Long-term Client">Long-term Client</SelectItem>
                          <SelectItem value="Negotiation">Negotiation</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">Service contains</div>
                      <Input
                        placeholder="e.g. Figma"
                        value={filterService}
                        onChange={(e) => setFilterService(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-muted-foreground">Min discount %</div>
                      <Input
                        type="number"
                        placeholder="e.g. 10"
                        value={minDiscount}
                        onChange={(e) => setMinDiscount(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <div className="text-xs font-medium text-muted-foreground">From</div>
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-xs font-medium text-muted-foreground">To</div>
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant="outline"
                        className="h-9"
                        onClick={clearFilters}
                        disabled={!hasActiveFilters}
                      >
                        Clear
                      </Button>

                      <Button className="h-9" onClick={() => setShowFilter(false)}>
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Quote
          </Button>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="glass-card rounded-xl p-4 border border-loss/30 bg-loss/10 text-sm text-foreground">
            {errorMsg}
          </div>
        )}

        {/* Add Quote Form */}
        {showForm && (
          <div className="glass-card rounded-xl p-6 animate-fade-up">
            <h3 className="text-lg font-semibold text-foreground mb-4">New Quote</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Client Name</label>
                <Input
                  placeholder="Enter client name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Service</label>
                <Input
                  placeholder="Service description"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Quoted Price</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={quotedPrice}
                  onChange={(e) => setQuotedPrice(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Final Price</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={finalPrice}
                  onChange={(e) => setFinalPrice(e.target.value)}
                  disabled={status !== "won"}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Discount Reason</label>
                <Select value={discountReason} onValueChange={setDiscountReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="volume">Volume Discount</SelectItem>
                    <SelectItem value="competitive">Competitive Pricing</SelectItem>
                    <SelectItem value="longterm">Long-term Client</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Status</label>
                <Select value={status} onValueChange={(v) => setStatus(v as Quote["status"])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <label className="text-sm font-medium text-foreground">Notes</label>
                <Textarea
                  placeholder="Additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Quote"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Quoted</p>
                <p className="text-xl font-bold text-foreground">
                  {loading ? "—" : money(summary.totalQuoted)}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Won</p>
                <p className="text-xl font-bold text-foreground">
                  {loading ? "—" : money(summary.totalWon)}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-loss/10">
                <TrendingDown className="h-5 w-5 text-loss" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Leakage</p>
                <p className="text-xl font-bold text-loss">
                  {loading ? "—" : money(summary.totalLeakage)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quotes Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                    Quote ID
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                    Client
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                    Service
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                    Quoted
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                    Final
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                    Discount
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                    Status
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-4">
                    Leakage
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : filteredQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-muted-foreground">
                      No quotes found.
                    </td>
                  </tr>
                ) : (
                  filteredQuotes.map((quote, index) => (
                    <tr
                      key={quote.id}
                      className="hover:bg-muted/30 transition-colors animate-slide-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-medium text-primary">{quote.id}</span>
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-foreground">{quote.client}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{quote.service}</td>

                      <td className="px-6 py-4 text-right text-sm font-medium text-foreground">
                        {money(quote.quotedPrice)}
                      </td>

                      <td className="px-6 py-4 text-right text-sm font-medium text-foreground">
                        {quote.finalPrice > 0 ? money(quote.finalPrice) : "-"}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {quote.discount > 0 ? (
                          <span className="text-sm font-medium text-warning">{quote.discount}%</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={cn(
                            "text-xs font-medium px-2.5 py-1 rounded-full capitalize",
                            statusColors[quote.status]
                          )}
                        >
                          {quote.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {quote.leakage > 0 ? (
                          <span className="text-sm font-semibold text-loss">-{money(quote.leakage)}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}


