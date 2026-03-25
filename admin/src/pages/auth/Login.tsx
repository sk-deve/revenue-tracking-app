import { useState } from "react";
import axios from "axios";

export default function Login() {
  // ✅ axios setup in same file
  const API_BASE = "http://localhost:4000";
  const LOGIN_URL = `${API_BASE}/api/admin/login`;

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // ✅ Frontend validation
    if (!form.email.trim() || !form.password) {
      setError("Email and password are required.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      setIsLoading(true);

      const res = await axios.post(
        LOGIN_URL,
        {
          email: form.email.trim(),
          password: form.password,
        },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: false,
          timeout: 15000,
        }
      );

      // ✅ store admin token (separate key from user app)
      const token = res?.data?.token;
      if (token) localStorage.setItem("adminToken", token);

      setSuccess(res?.data?.message || "Logged in successfully!");

      // Optional: clear password
      setForm((prev) => ({ ...prev, password: "" }));

      // ✅ redirect to admin dashboard
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 600);
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;

      if (status === 400) {
        setError(serverMsg || "Please check your inputs.");
        return;
      }

      if (status === 401) {
        setError(serverMsg || "Invalid email or password.");
        return;
      }

      if (status === 403) {
        setError(serverMsg || "This admin account is disabled.");
        return;
      }

      if (status === 500) {
        setError("Server error. Please try again in a moment.");
        return;
      }

      setError(serverMsg || err?.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold">
            LT
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Admin Login</h1>
            <p className="text-sm text-white/60">Sign in with email and password</p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Email</label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@platform.com"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-blue-500/40"
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Password</label>
            <input
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-blue-500/40"
              type="password"
              autoComplete="current-password"
              required
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-white/50">Use at least 8 characters.</p>
              <a
                href="/forgot-password"
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Forgot password?
              </a>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 transition text-white font-semibold py-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>

          <p className="text-center text-sm text-white/60">
            Don&apos;t have an account?{" "}
            <a href="/" className="text-blue-400 hover:text-blue-300 underline">
              Register
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

