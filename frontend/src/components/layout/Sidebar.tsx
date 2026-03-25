import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Percent,
  RotateCcw,
  BarChart3,
  Lightbulb,
  Users,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Quotes & Jobs", href: "/quotes", icon: FileText },
  { name: "Discount Tracking", href: "/discounts", icon: Percent },
  { name: "Rework & Mistakes", href: "/rework", icon: RotateCcw },
  { name: "Leakage Reports", href: "/reports", icon: BarChart3 },
  { name: "Insights", href: "/insights", icon: Lightbulb },
  { name: "Team", href: "/team", icon: Users },
];

const bottomNavigation = [
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen sidebar-gradient border-r border-sidebar-border transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          <div className={cn("flex items-center gap-3", collapsed && "justify-center w-full")}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <TrendingDown className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="animate-fade-in">
                <h1 className="text-lg font-semibold text-sidebar-foreground">LeakGuard</h1>
                <p className="text-xs text-sidebar-foreground/60">Revenue Protection</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-sidebar-primary")} />
                  {!collapsed && <span className="animate-fade-in">{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom Navigation */}
        <div className="border-t border-sidebar-border px-3 py-4 space-y-1">
          {bottomNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-sidebar-primary")} />
                {!collapsed && <span className="animate-fade-in">{item.name}</span>}
              </Link>
            );
          })}
        </div>

        {/* Collapse Button */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-200"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span className="animate-fade-in">Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
