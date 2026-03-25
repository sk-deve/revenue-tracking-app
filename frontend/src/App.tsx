import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

// App pages
import Index from "./pages/Index";
import Quotes from "./pages/Quotes";
import Discounts from "./pages/Discounts";
import Rework from "./pages/Rework";
import Reports from "./pages/Reports";
import Team from "./pages/Team";
import Insights from "./pages/Insights";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Public pages
import Home from "./pages/Home/Home";
import How from "./pages/HowItWork/How";
import Contact from "./pages/Home/Contact.jsx"
import Register from "./pages/Auth/Register/Register";
import Login from "./pages/Auth/Login/Login";
import Onboarding from "./pages/Auth/OnBoarding/OnBoarding";
import AcceptInvitePage from "./pages/AcceptInvitePage/AcceptInvitePage";
import CompleteInvitePage from "./pages/AcceptInvitePage/CompleteInvitePage";
import ForgotPassword from "./pages/Auth/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/Auth/ForgotPassword/ResetPassword";

const queryClient = new QueryClient();

/* ===========================
   🔐 AUTH GUARDS
=========================== */

// Protected pages: must be logged in
const RequireAuth = () => {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
};

// Guest-only pages (login/register): if logged in, go dashboard
const GuestOnly = () => {
  const token = localStorage.getItem("token");
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
              PUBLIC ROUTES
          ====================== */}
          <Route path="/" element={<Home />} />
          <Route path="/how" element={<How />} />
          <Route path="/contact" element={<Contact />}/>

          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/complete-invite" element={<CompleteInvitePage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* =====================
              👤 GUEST ONLY ROUTES
              (if logged in -> /dashboard)
          ====================== */}
          <Route element={<GuestOnly />}>
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
          </Route>

          
          <Route path="/onboarding" element={<Onboarding />} />

          {/* =====================
              🔐 PROTECTED ROUTES
          ====================== */}
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<Index />} />
            <Route path="/quotes" element={<Quotes />} />
            <Route path="/discounts" element={<Discounts />} />
            <Route path="/rework" element={<Rework />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/team" element={<Team />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* =====================
              FALLBACK
          ====================== */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;


