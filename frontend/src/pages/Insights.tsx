import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Target,
  Users,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

type InsightType = "pattern" | "suggestion" | "alert";
type Impact = "high" | "medium" | "low";
type Priority = "high" | "medium" | "low";

interface Insight {
  id: string;
  title: string;
  description: string;
  type: InsightType;
  impact: Impact;
  action: string;
  metric?: string;
}

interface SuggestedAction {
  id: string;
  title: string;
  description: string;
  priority: Priority;
}

interface CommonCause {
  cause: string;
  percent: number;
}

interface InsightsResponse {
  success: boolean;
  message?: string;
  currency?: string;

  highlights?: {
    topLeakageSource?: string;
    mostAffectedService?: string;
    potentialSavings?: number;
  };

  insights?: Insight[];
  suggestedActions?: SuggestedAction[];
  commonCauses?: CommonCause[];
}

const typeStyles: Record<
  InsightType,
  { bg: string; border: string; icon: any; iconColor: string }
> = {
  pattern: {
    bg: "bg-primary/10",
    border: "border-primary/30",
    icon: TrendingUp,
    iconColor: "text-primary",
  },
  suggestion: {
    bg: "bg-success/10",
    border: "border-success/30",
    icon: Lightbulb,
    iconColor: "text-success",
  },
  alert: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    icon: AlertTriangle,
    iconColor: "text-warning",
  },
};

const impactColors: Record<Impact, string> = {
  high: "bg-loss text-loss-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-muted text-muted-foreground",
};

const priorityColors: Record<Priority, string> = {
  high: "text-loss",
  medium: "text-warning",
  low: "text-muted-foreground",
};

const iconByActionId = (id: string) => {
  const key = (id || "").toLowerCase();
  if (key.includes("pricing")) return Target;
  if (key.includes("train")) return Users;
  if (key.includes("sop")) return FileText;
  return Target;
};

export default function Insights() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currency, setCurrency] = useState("USD");
  const [topLeakageSource, setTopLeakageSource] = useState("—");
  const [mostAffectedService, setMostAffectedService] = useState("—");
  const [potentialSavings, setPotentialSavings] = useState(0);

  const [insights, setInsights] = useState<Insight[]>([]);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [commonCauses, setCommonCauses] = useState<CommonCause[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const baseURL = import.meta.env.VITE_API_URL;
        const token = localStorage.getItem("token"); // adjust if your app stores it differently

        const res = await axios.get<InsightsResponse>(`${baseURL}/api/insights/overview`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = res.data;

        if (!data?.success) {
          throw new Error(data?.message || "Failed to load insights");
        }

        setCurrency(data.currency || "USD");

        setTopLeakageSource(data.highlights?.topLeakageSource || "—");
        setMostAffectedService(data.highlights?.mostAffectedService || "—");
        setPotentialSavings(Number(data.highlights?.potentialSavings || 0));

        setInsights(Array.isArray(data.insights) ? data.insights : []);
        setSuggestedActions(Array.isArray(data.suggestedActions) ? data.suggestedActions : []);
        setCommonCauses(Array.isArray(data.commonCauses) ? data.commonCauses : []);
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const savingsText = useMemo(() => {
    return `${currency} ${Number(potentialSavings || 0).toLocaleString()}/month`;
  }, [currency, potentialSavings]);

  return (
    <DashboardLayout title="Insights & Patterns" subtitle="AI-powered analysis to help you fix revenue leakage">
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-xl p-5 animate-fade-up">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-loss/10">
                <TrendingUp className="h-6 w-6 text-loss" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Top Leakage Source</p>
                <p className="text-lg font-semibold text-foreground">
                  {loading ? "Loading..." : topLeakageSource}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 animate-fade-up" style={{ animationDelay: "50ms" }}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-warning/10">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Most Affected Service</p>
                <p className="text-lg font-semibold text-foreground">
                  {loading ? "Loading..." : mostAffectedService}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 animate-fade-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Lightbulb className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Potential Savings</p>
                <p className="text-lg font-semibold text-success">
                  {loading ? "Loading..." : savingsText}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="glass-card rounded-xl p-4 border border-loss/30 bg-loss/10 text-loss">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Insights List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Key Insights</h3>

            {!loading && insights.length === 0 ? (
              <div className="glass-card rounded-xl p-6 text-sm text-muted-foreground">
                No insights found for this month yet.
              </div>
            ) : (
              insights.map((insight, index) => {
                const styles = typeStyles[insight.type];
                const Icon = styles.icon;

                return (
                  <div
                    key={insight.id}
                    className={cn(
                      "glass-card rounded-xl p-5 border transition-all duration-200 hover:shadow-lg animate-fade-up",
                      styles.bg,
                      styles.border
                    )}
                    style={{ animationDelay: `${150 + index * 80}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn("p-2 rounded-lg", styles.bg)}>
                        <Icon className={cn("h-5 w-5", styles.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h4 className="text-base font-semibold text-foreground">{insight.title}</h4>
                          {insight.metric && (
                            <span className="text-sm font-bold text-foreground shrink-0">
                              {insight.metric}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "text-xs font-medium px-2 py-1 rounded-full capitalize",
                              impactColors[insight.impact]
                            )}
                          >
                            {insight.impact} impact
                          </span>
                          <Button variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary/80">
                            {insight.action}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Suggested Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Suggested Actions</h3>

            <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "300ms" }}>
              <div className="space-y-4">
                {suggestedActions.map((action, index) => {
                  const Icon = iconByActionId(action.id);
                  return (
                    <div
                      key={action.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors animate-slide-in"
                      style={{ animationDelay: `${400 + index * 80}ms` }}
                    >
                      <div className="p-2 rounded-lg bg-card">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-foreground">{action.title}</h4>
                          <span className={cn("text-[10px] font-bold uppercase", priorityColors[action.priority])}>
                            {action.priority}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-muted-foreground/30 hover:text-success transition-colors cursor-pointer" />
                    </div>
                  );
                })}
              </div>

              <Button className="w-full mt-4">Generate Action Plan</Button>
            </div>

            {/* Common Causes */}
            <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "400ms" }}>
              <h4 className="text-sm font-semibold text-foreground mb-4">Most Common Leakage Causes</h4>

              {commonCauses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No causes to show yet.</p>
              ) : (
                <div className="space-y-3">
                  {commonCauses.map((item, index) => (
                    <div key={item.cause} className="animate-slide-in" style={{ animationDelay: `${500 + index * 50}ms` }}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-foreground">{item.cause}</span>
                        <span className="font-medium text-muted-foreground">{item.percent}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-700"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
