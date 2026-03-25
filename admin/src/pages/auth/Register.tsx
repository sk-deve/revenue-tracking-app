import { useState } from "react";
import axios from "axios";

export default function AdminRegister() {
  // ✅ axios setup in same file
  const API_BASE = "http://localhost:4000";
  const REGISTER_URL = `${API_BASE}/api/admin/register`;

  const [form, setForm] = useState({
    name: "",
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
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("All fields are required.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      setIsLoading(true);

      const res = await axios.post(
        REGISTER_URL,
        {
          name: form.name.trim(),
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

      setSuccess(res?.data?.message || "Admin created successfully!");

      // ✅ clear form
      setForm({ name: "", email: "", password: "" });

      // ✅ redirect (change if you want)
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 700);
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;

      if (status === 409) {
        setError(serverMsg || "Email is already registered.");
        return;
      }

      if (status === 400) {
        setError(serverMsg || "Please check your inputs.");
        return;
      }

      if (status === 403) {
        setError(serverMsg || "You are not allowed to create an admin.");
        return;
      }

      if (status === 500) {
        setError("Server error. Please try again in a moment.");
        return;
      }

      setError(serverMsg || err?.message || "Registration failed. Please try again.");
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
            <h1 className="text-xl font-semibold text-white">Admin Registration</h1>
            <p className="text-sm text-white/60">Create a new admin account</p>
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
            <label className="block text-sm text-white/70 mb-1">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Admin name"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-blue-500/40"
              type="text"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Email</label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@company.com"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-blue-500/40"
              type="email"
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
              required
            />
            <p className="text-xs text-white/50 mt-2">Use at least 8 characters.</p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 transition text-white font-semibold py-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating..." : "Create Admin"}
          </button>

          <p className="text-center text-sm text-white/60">
            Back to{" "}
            <a href="/dashboard" className="text-blue-400 hover:text-blue-300 underline">
              Dashboard
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

