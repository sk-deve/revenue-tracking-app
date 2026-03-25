import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Bell, Search, User, Settings, LogOut, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const API_BASE = "http://localhost:4000";

// ✅ match your backend response shape
type NotificationRow = {
  id: string;
  title: string;
  message: string;
  type?: string; // "discount" | "rework" etc
  link?: string; // "/rework" | "/quotes-jobs"
  isRead: boolean;
  createdAt: string; // ISO
};

type UnreadCountResponse = { success: boolean; count: number };
type NotificationsListResponse = { success: boolean; rows: NotificationRow[] };

export function Header({ title, subtitle }: HeaderProps) {
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loadingNoti, setLoadingNoti] = useState(false);

  // ✅ token header (same style as your other pages)
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get<UnreadCountResponse>(`${API_BASE}/api/notifications/unread-count`, {
        headers: getAuthHeaders(),
      });
      if (res.data?.success) setUnreadCount(Number(res.data.count || 0));
    } catch {
      // silent (don’t break header)
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoadingNoti(true);
      const res = await axios.get<NotificationsListResponse>(`${API_BASE}/api/notifications?limit=10`, {
        headers: getAuthHeaders(),
      });
      if (res.data?.success) setItems(res.data.rows || []);
    } catch {
      setItems([]);
    } finally {
      setLoadingNoti(false);
    }
  };

  // ✅ load count on mount + refresh every 20s (cheap)
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!alive) return;
      await fetchUnreadCount();
    })();

    const t = setInterval(() => {
      if (!alive) return;
      fetchUnreadCount();
    }, 20000);

    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markRead = async (id: string) => {
    try {
      await axios.patch(
        `${API_BASE}/api/notifications/${id}/read`,
        {},
        { headers: getAuthHeaders() }
      );
      // update local state immediately
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, isRead: true } : x)));
      // refresh count
      fetchUnreadCount();
    } catch {
      // silent
    }
  };

  const markAllRead = async () => {
    try {
      await axios.patch(`${API_BASE}/api/notifications/read-all`, {}, { headers: getAuthHeaders() });
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const prettyTime = (iso: string) => {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return "";
    const diff = Date.now() - t;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const hasItems = items.length > 0;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." className="w-64 pl-9 bg-secondary/50 border-border/50 focus:bg-card" />
        </div>

        {/* ✅ Notifications Dropdown */}
        <DropdownMenu
          onOpenChange={(open) => {
            if (open) {
              // load list when opening dropdown (best UX + low requests)
              fetchNotifications();
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-loss text-[10px] font-medium text-loss-foreground flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-96 p-0">
            <div className="px-3 py-2 flex items-center justify-between">
              <DropdownMenuLabel className="p-0 text-sm">Notifications</DropdownMenuLabel>
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  markAllRead();
                }}
                disabled={unreadCount === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            </div>

            <DropdownMenuSeparator />

            {loadingNoti ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">Loading...</div>
            ) : !hasItems ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">No notifications yet.</div>
            ) : (
              <div className="max-h-96 overflow-auto">
                {items.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className="cursor-pointer px-3 py-3 focus:bg-muted/40"
                    onClick={async () => {
                      if (!n.isRead) await markRead(n.id);
                      if (n.link) navigate(n.link);
                    }}
                  >
                    <div className="w-full">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary" />}
                            <div className="font-medium text-sm text-foreground truncate">{n.title}</div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</div>
                        </div>
                        <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {prettyTime(n.createdAt)}
                        </div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Account</DropdownMenuLabel>

            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/profile")}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>

            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer text-red-600 focus:text-red-600"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}


