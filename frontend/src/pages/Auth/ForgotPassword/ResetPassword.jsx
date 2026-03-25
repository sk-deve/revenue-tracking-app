import React, { useMemo, useState } from "react";
import axios from "axios";
import "./ResetPassword.css";

export default function ResetPassword() {
  // ✅ axios setup in same file (same pattern as Register)
  const API_BASE = "http://localhost:4000";
  const RESET_URL = `${API_BASE}/api/auth/reset-password`;

  const params = new URLSearchParams(window.location.search);
  const token = useMemo(() => params.get("token") || "", [params]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Invalid reset link (missing token).");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsLoading(true);

      const res = await axios.post(
        RESET_URL,
        { token, password },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: false,
          timeout: 15000,
        }
      );

      if (res?.data?.success) {
        setSuccess(res?.data?.message || "Password reset successfully.");
        setDone(true);

        // optional: clear inputs
        setPassword("");
        setConfirm("");
      } else {
        setError(res?.data?.message || "Reset failed. Please try again.");
      }
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;

      if (status === 400) {
        // invalid/expired token, weak password, etc.
        setError(serverMsg || "Reset link is invalid or has expired.");
        return;
      }

      if (status === 401) {
        setError(serverMsg || "Unauthorized. Please try again.");
        return;
      }

      if (status === 404) {
        setError("Reset password route not found. Check your backend route.");
        return;
      }

      if (status === 500) {
        setError("Server error. Please try again in a moment.");
        return;
      }

      setError(serverMsg || err?.message || "Reset failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="reset-wrapper">
        <div className="reset-card">
          <h1>Invalid Reset Link</h1>
          <p className="subtitle">This reset link is missing a token.</p>
          <a className="back-link" href="/forgot-password">
            Try again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-wrapper">
      <div className="reset-card">
        {!done ? (
          <>
            <h1>Reset Password</h1>
            <p className="subtitle">Choose a new password for your account.</p>

            <form onSubmit={onSubmit}>
              {error ? <div className="rp-alert rp-alert-error">{error}</div> : null}
              {success ? <div className="rp-alert rp-alert-success">{success}</div> : null}

              <label>New Password</label>
              <input
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />

              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="Re-enter password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={isLoading}
              />

              <button type="submit" disabled={isLoading}>
                {isLoading ? "Updating password..." : "Update Password"}
              </button>
            </form>

            <a href="/login" className="back-link">
              ← Back to Login
            </a>
          </>
        ) : (
          <div className="success">
            <h2>Password updated ✅</h2>
            <p>You can now log in with your new password.</p>

            <a href="/login" className="back-link">
              Go to Login
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
