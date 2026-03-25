import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { User, Building, Bell, Shield, Percent } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL;

type ProfilePayload = {
  fullName: string;
  email: string;
  phone: string;
  role: string;

  businessSettings: {
    companyName: string;
    industry: string;
    defaultHourlyRate: number;
    currency: string;
  };

  leakageRules: {
    discountAlertThreshold: number;
    reworkAlertThreshold: number;
    marginDropAlert: number;
  };

  notificationPrefs: {
    highDiscountAlerts: boolean;
    reworkIncidentAlerts: boolean;
    weeklyLeakageSummary: boolean;
    monthlyReports: boolean;
    teamActivity: boolean;
  };
};

export default function Settings() {
  const token = useMemo(() => localStorage.getItem("token"), []);
  const api = useMemo(() => {
    return axios.create({
      baseURL: `${API_BASE}/api/profile`,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  }, [token]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Business Owner");

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [defaultHourlyRate, setDefaultHourlyRate] = useState<string>("0");
  const [currency, setCurrency] = useState("USD ($)");

  const [discountAlertThreshold, setDiscountAlertThreshold] = useState<string>("15");
  const [reworkAlertThreshold, setReworkAlertThreshold] = useState<string>("3");
  const [marginDropAlert, setMarginDropAlert] = useState<string>("5");

  const [prefs, setPrefs] = useState({
    highDiscountAlerts: true,
    reworkIncidentAlerts: true,
    weeklyLeakageSummary: true,
    monthlyReports: false,
    teamActivity: false,
  });

  const loadMe = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/me");
      const u: ProfilePayload = data.user;

      setFullName(u.fullName || "");
      setEmail(u.email || "");
      setPhone(u.phone || "");
      setRole(u.role || "Business Owner");

      setCompanyName(u.businessSettings?.companyName || "");
      setIndustry(u.businessSettings?.industry || "");
      setDefaultHourlyRate(String(u.businessSettings?.defaultHourlyRate ?? 0));
      setCurrency(u.businessSettings?.currency || "USD ($)");

      setDiscountAlertThreshold(String(u.leakageRules?.discountAlertThreshold ?? 15));
      setReworkAlertThreshold(String(u.leakageRules?.reworkAlertThreshold ?? 3));
      setMarginDropAlert(String(u.leakageRules?.marginDropAlert ?? 5));

      setPrefs({
        highDiscountAlerts: !!u.notificationPrefs?.highDiscountAlerts,
        reworkIncidentAlerts: !!u.notificationPrefs?.reworkIncidentAlerts,
        weeklyLeakageSummary: !!u.notificationPrefs?.weeklyLeakageSummary,
        monthlyReports: !!u.notificationPrefs?.monthlyReports,
        teamActivity: !!u.notificationPrefs?.teamActivity,
      });
    } catch (e: any) {
      console.error("LOAD PROFILE ERROR:", e?.response?.data || e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveUserInfo = async () => {
    setSaving(true);
    try {
      await api.put("/me", {
        fullName,
        phone,
      });
      await loadMe();
    } finally {
      setSaving(false);
    }
  };

  const saveBusiness = async () => {
    setSaving(true);
    try {
      await api.put("/me", {
        businessSettings: {
          companyName,
          industry,
          defaultHourlyRate,
        },
      });
      await loadMe();
    } finally {
      setSaving(false);
    }
  };

  const saveRules = async () => {
    setSaving(true);
    try {
      await api.put("/me", {
        leakageRules: {
          discountAlertThreshold,
          reworkAlertThreshold,
          marginDropAlert,
        },
      });
      await loadMe();
    } finally {
      setSaving(false);
    }
  };

  const savePrefs = async (nextPrefs: typeof prefs) => {
    setPrefs(nextPrefs);
    try {
      await api.put("/me", { notificationPrefs: nextPrefs });
    } catch (e) {
      console.error("SAVE PREFS ERROR:", e);
    }
  };

  return (
    <DashboardLayout title="Profile & Settings" subtitle="Manage your account and preferences">
      <div className="max-w-4xl space-y-6">
        {/* User Info */}
        <div className="glass-card rounded-xl p-6 animate-fade-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">User Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input value={email} type="email" disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" disabled={loading} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Role</label>
              <Input value={role} disabled className="bg-muted" />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={saveUserInfo} disabled={loading || saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Business Settings */}
        <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Business Settings</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Company Name</label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Industry</label>
              <Input value={industry} onChange={(e) => setIndustry(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Default Hourly Rate</label>
              <Input
                value={defaultHourlyRate}
                onChange={(e) => setDefaultHourlyRate(e.target.value)}
                type="text"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Currency</label>
              <Input value={currency} disabled className="bg-muted" />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={saveBusiness} disabled={loading || saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Leakage Rules */}
        <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "150ms" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-warning/10">
              <Percent className="h-5 w-5 text-warning" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Leakage Rules</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Discount Alert Threshold</p>
                <p className="text-xs text-muted-foreground">Alert when discounts exceed this percentage</p>
              </div>
              <div className="flex items-center gap-2">
                <Input value={discountAlertThreshold} onChange={(e) => setDiscountAlertThreshold(e.target.value)} className="w-20 text-center" type="number" disabled={loading} />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Rework Alert Threshold</p>
                <p className="text-xs text-muted-foreground">Alert after this many rework incidents per service</p>
              </div>
              <div className="flex items-center gap-2">
                <Input value={reworkAlertThreshold} onChange={(e) => setReworkAlertThreshold(e.target.value)} className="w-20 text-center" type="number" disabled={loading} />
                <span className="text-sm text-muted-foreground">per month</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Margin Drop Alert</p>
                <p className="text-xs text-muted-foreground">Alert when average margin drops by this percentage</p>
              </div>
              <div className="flex items-center gap-2">
                <Input value={marginDropAlert} onChange={(e) => setMarginDropAlert(e.target.value)} className="w-20 text-center" type="number" disabled={loading} />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={saveRules} disabled={loading || saving}>
              {saving ? "Saving..." : "Save Rules"}
            </Button>
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Notification Preferences</h3>
          </div>

          <div className="space-y-4">
            {[
              { key: "highDiscountAlerts", title: "High discount alerts", description: "Get notified when discounts exceed threshold" },
              { key: "reworkIncidentAlerts", title: "Rework incident alerts", description: "Get notified of repeated rework issues" },
              { key: "weeklyLeakageSummary", title: "Weekly leakage summary", description: "Receive a weekly email summary" },
              { key: "monthlyReports", title: "Monthly reports", description: "Automated monthly PDF reports" },
              { key: "teamActivity", title: "Team activity", description: "Get notified of team member actions" },
            ].map((item, index) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border animate-slide-in"
                style={{ animationDelay: `${250 + index * 50}ms` }}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Switch
                  checked={(prefs as any)[item.key]}
                  onCheckedChange={(checked) => {
                    const next = { ...prefs, [item.key]: checked } as any;
                    savePrefs(next);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Security (UI only for now) */}
        <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "250ms" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Security</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Password</p>
                <p className="text-xs text-muted-foreground">Last changed 30 days ago</p>
              </div>
              <Button variant="outline" size="sm">Change Password</Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
              </div>
              <Button variant="outline" size="sm">Enable</Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

