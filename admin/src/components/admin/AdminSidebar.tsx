import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
  TrendingDown,
  ToggleLeft,
  Package,
  Activity,
  MessageSquare,
  Shield,
  Database,
  Crown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "User Management", path: "/users", icon: Users },
  { title: "Business Management", path: "/businesses", icon: Building2 },
  { title: "Subscriptions & Billing", path: "/subscriptions", icon: CreditCard },
  { title: "Revenue Leakage", path: "/analytics", icon: TrendingDown },
  { title: "Feature Flags", path: "/features", icon: ToggleLeft },
  { title: "Plans & Limits", path: "/plans", icon: Package },
  { title: "System Logs", path: "/logs", icon: Activity },
  { title: "Content & Messaging", path: "/content", icon: MessageSquare },
  { title: "Security & Abuse", path: "/security", icon: Shield },
  { title: "Data Management", path: "/data", icon: Database },
];

export function AdminSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Crown className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">Super Admin</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <Crown className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground transition-colors",
            collapsed && "absolute left-12 top-4 bg-sidebar border border-sidebar-border"
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-primary")} />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-medium text-primary">SA</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Super Admin</p>
              <p className="text-xs text-muted-foreground truncate">admin@platform.com</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
