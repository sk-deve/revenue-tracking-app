import { useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Cog, FileText, BarChart3, Users, Zap, Shield, Bell } from "lucide-react";

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  plans: string[];
}

const initialFlags: FeatureFlag[] = [
  {
    id: "rules-engine",
    name: "Rules Engine",
    description: "Advanced business rules and automation",
    icon: Cog,
    enabled: true,
    plans: ["Pro", "Business", "Enterprise"],
  },
  {
    id: "pdf-reports",
    name: "PDF Reports",
    description: "Generate downloadable PDF reports",
    icon: FileText,
    enabled: true,
    plans: ["Business", "Enterprise"],
  },
  {
    id: "drill-down",
    name: "Drill-down Analytics",
    description: "Deep dive into metrics and data",
    icon: BarChart3,
    enabled: true,
    plans: ["Pro", "Business", "Enterprise"],
  },
  {
    id: "team-access",
    name: "Team Access",
    description: "Multi-user team collaboration",
    icon: Users,
    enabled: false,
    plans: ["Business", "Enterprise"],
  },
  {
    id: "api-access",
    name: "API Access",
    description: "REST API for integrations",
    icon: Zap,
    enabled: true,
    plans: ["Enterprise"],
  },
  {
    id: "sso",
    name: "Single Sign-On (SSO)",
    description: "Enterprise SSO authentication",
    icon: Shield,
    enabled: false,
    plans: ["Enterprise"],
  },
  {
    id: "webhooks",
    name: "Webhooks",
    description: "Real-time event notifications",
    icon: Bell,
    enabled: true,
    plans: ["Pro", "Business", "Enterprise"],
  },
];

export default function FeatureFlags() {
  const [flags, setFlags] = useState(initialFlags);

  const toggleFlag = (id: string) => {
    setFlags(flags.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)));
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Feature Flags & Toggles"
        description="Roll out features safely — avoid breaking production."
      />

      <div className="grid gap-4">
        {flags.map((flag) => {
          const Icon = flag.icon;
          return (
            <div
              key={flag.id}
              className="stat-card flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{flag.name}</h3>
                    <div className="flex gap-1">
                      {flag.plans.map((plan) => (
                        <Badge key={plan} variant="outline" className="text-xs">
                          {plan}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{flag.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-sm font-medium ${flag.enabled ? "text-success" : "text-muted-foreground"}`}>
                  {flag.enabled ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={flag.enabled}
                  onCheckedChange={() => toggleFlag(flag.id)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
