import React, { useState } from "react";
import axios from "axios";
import "./forgotPassword.css";

export default function ForgotPassword() {
  // ✅ axios setup in same file (same pattern as Register)
  const API_BASE = import.meta.env.VITE_API_URL;
  const FORGOT_URL = `${API_BASE}/api/auth/forgot-password`;

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const emailTrimmed = email.trim().toLowerCase();

    if (!emailTrimmed) {
      setError("Please enter your email.");
      return;
    }

    try {
      setIsLoading(true);

      const res = await axios.post(
        FORGOT_URL,
        { email: emailTrimmed },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: false,
          timeout: 15000,
        }
      );

      // Your backend should return { success: true, message: "..." }
      if (res?.data?.success) {
        setSuccess(res?.data?.message || "If an account exists, a reset link has been sent.");
        setSubmitted(true);
      } else {
        setError(res?.data?.message || "Could not send reset link. Please try again.");
      }
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;

      if (status === 400) {
        setError(serverMsg || "Please check your email and try again.");
        return;
      }

      if (status === 401) {
        setError(serverMsg || "Unauthorized. Please try again.");
        return;
      }

      if (status === 404) {
        setError("Forgot password route not found. Check your backend route.");
        return;
      }

      if (status === 500) {
        setError("Server error. Please try again in a moment.");
        return;
      }

      setError(serverMsg || err?.message || "Request failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-wrapper">
      <div className="forgot-card">
        {!submitted ? (
          <>
            <h1>Forgot Password</h1>
            <p className="subtitle">
              Enter your email and we’ll send you a password reset link.
            </p>

            <form onSubmit={handleSubmit}>
              {error ? <div className="fp-alert fp-alert-error">{error}</div> : null}
              {success ? <div className="fp-alert fp-alert-success">{success}</div> : null}

              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />

              <button type="submit" disabled={isLoading}>
                {isLoading ? "Sending reset link..." : "Send Reset Link"}
              </button>
            </form>

            <a href="/login" className="back-link">
              ← Back to Login
            </a>
          </>
        ) : (
          <div className="success">
            <h2>Check your email 📬</h2>
            <p>
              If an account exists for <strong>{email.trim()}</strong>, a reset link has
              been sent.
            </p>

            <button
              type="button"
              className="fp-secondary-btn"
              disabled={isLoading}
              onClick={() => {
                // let user send again without leaving page
                setSubmitted(false);
                setError("");
                setSuccess("");
              }}
            >
              Send Again
            </button>

            <a href="/login" className="back-link">
              Back to Login
            </a>
          </div>
        )}
      </div>
    </div>
  );
}


