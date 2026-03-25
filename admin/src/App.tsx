import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";

import { AdminLayout } from "@/components/admin/AdminLayout";

import Dashboard from "./pages/Dashboard";
import UserManagement from "./pages/UserManagement";
import BusinessManagement from "./pages/BusinessManagement";
import Subscriptions from "./pages/Subscriptions";
import RevenueAnalytics from "./pages/RevenueAnalytics";
import FeatureFlags from "./pages/FeatureFlags";
import PlansManagement from "./pages/PlansManagement";
import SystemLogs from "./pages/SystemLogs";
import ContentMessaging from "./pages/ContentMessaging";
import SecurityAbuse from "./pages/SecurityAbuse";
import DataManagement from "./pages/DataManagement";
import NotFound from "./pages/NotFound";
import Register from "./pages/auth/Register";
import Login from "./pages/auth/Login";

const queryClient = new QueryClient();

/**
 * ✅ SAME FILE layout wrapper
 * IMPORTANT: This works ONLY if AdminLayout can render children OR you can place <Outlet /> inside it.
 */

// ✅ Version A (if AdminLayout supports children: ({ children }) => ...)
const AdminShell = () => (
  <AdminLayout>
    <Outlet />
  </AdminLayout>
);

/* ===========================
   🔐 AUTH GUARDS (ADMIN)
=========================== */

// 🔐 Protect admin pages: must have adminToken
const RequireAdminAuth = () => {
  const token = localStorage.getItem("adminToken");
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
};

// 👤 Guest-only pages: if logged in, don't show / or /login
const GuestOnly = () => {
  const token = localStorage.getItem("adminToken");
  if (token) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

      <BrowserRouter>
        <Routes>
          {/* =====================
              👤 GUEST ONLY ROUTES
              if logged-in -> /dashboard
          ====================== */}
          <Route element={<GuestOnly />}>
            <Route path="/" element={<Register />} />
            <Route path="/login" element={<Login />} />
          </Route>

          {/* =====================
              🔐 PROTECTED ADMIN ROUTES
          ====================== */}
          <Route element={<RequireAdminAuth />}>
            <Route element={<AdminShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/businesses" element={<BusinessManagement />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/analytics" element={<RevenueAnalytics />} />
              <Route path="/features" element={<FeatureFlags />} />
              <Route path="/plans" element={<PlansManagement />} />
              <Route path="/logs" element={<SystemLogs />} />
              <Route path="/content" element={<ContentMessaging />} />
              <Route path="/security" element={<SecurityAbuse />} />
              <Route path="/data" element={<DataManagement />} />
            </Route>
          </Route>

          {/* ✅ NOT FOUND */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;


