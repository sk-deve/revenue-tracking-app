import { Users, CreditCard, TrendingUp, TrendingDown, Building2, Activity } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const revenueData = [
  { month: "Jan", revenue: 12400 },
  { month: "Feb", revenue: 14800 },
  { month: "Mar", revenue: 18200 },
  { month: "Apr", revenue: 21500 },
  { month: "May", revenue: 25800 },
  { month: "Jun", revenue: 28400 },
  { month: "Jul", revenue: 32100 },
];

const signupData = [
  { day: "Mon", signups: 42 },
  { day: "Tue", signups: 58 },
  { day: "Wed", signups: 35 },
  { day: "Thu", signups: 71 },
  { day: "Fri", signups: 49 },
  { day: "Sat", signups: 28 },
  { day: "Sun", signups: 33 },
];

export default function Dashboard() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Platform health overview — see if you're winning or bleeding."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value="12,847"
          change="+12.5% from last month"
          changeType="positive"
          icon={Users}
        />
        <StatCard
          title="Active Subscriptions"
          value="3,421"
          change="+8.2% from last month"
          changeType="positive"
          icon={CreditCard}
        />
        <StatCard
          title="Monthly Revenue (MRR)"
          value="$32,100"
          change="+15.3% from last month"
          changeType="positive"
          icon={TrendingUp}
          iconColor="text-success"
        />
        <StatCard
          title="New Signups (7 days)"
          value="316"
          change="+23 from last week"
          changeType="positive"
          icon={Users}
          iconColor="text-primary"
        />
        <StatCard
          title="Churned Users"
          value="47"
          change="-5 from last month"
          changeType="positive"
          icon={TrendingDown}
          iconColor="text-destructive"
        />
        <StatCard
          title="Active Businesses Today"
          value="892"
          change="67% of total"
          changeType="neutral"
          icon={Building2}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="stat-card">
          <h3 className="text-lg font-semibold mb-6">Revenue Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
                <XAxis dataKey="month" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222, 47%, 10%)",
                    border: "1px solid hsl(217, 33%, 17%)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "hsl(210, 40%, 98%)" }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(217, 91%, 60%)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Signups Chart */}
        <div className="stat-card">
          <h3 className="text-lg font-semibold mb-6">Weekly Signups</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={signupData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
                <XAxis dataKey="day" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222, 47%, 10%)",
                    border: "1px solid hsl(217, 33%, 17%)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "hsl(210, 40%, 98%)" }}
                />
                <Bar dataKey="signups" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 stat-card">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Live Activity</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-2xl font-bold text-success">98.7%</p>
            <p className="text-sm text-muted-foreground">Uptime (30 days)</p>
          </div>
          <div>
            <p className="text-2xl font-bold">145ms</p>
            <p className="text-sm text-muted-foreground">Avg Response Time</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-warning">3</p>
            <p className="text-sm text-muted-foreground">Failed Webhooks</p>
          </div>
          <div>
            <p className="text-2xl font-bold">2.3k</p>
            <p className="text-sm text-muted-foreground">API Calls (1h)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
