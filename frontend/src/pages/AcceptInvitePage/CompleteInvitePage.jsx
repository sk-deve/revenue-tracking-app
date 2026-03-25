import React, { useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { FiLock, FiCheckCircle, FiXCircle, FiUser } from "react-icons/fi";
import "./CompleteInvitePage.css";

export default function CompleteInvitePage() {
  const API_BASE = "http://localhost:4000";
  const COMPLETE_URL = `${API_BASE}/api/team/complete-invite`;

  const nav = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const token = params.get("token") || "";
  const owner = params.get("owner") || "";
  const email = params.get("email") || "";

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState({ status: "idle", msg: "" });

  const submit = async (e) => {
    e.preventDefault();
    if (!token || !owner) {
      setState({ status: "err", msg: "Invalid invite link." });
      return;
    }
    if (password.length < 6) {
      setState({ status: "err", msg: "Password must be at least 6 characters." });
      return;
    }

    setLoading(true);
    setState({ status: "idle", msg: "" });

    try {
      const res = await axios.post(COMPLETE_URL, { token, owner, password, fullName });
      const data = res?.data || {};

      if (data?.token) {
        localStorage.setItem("token", data.token);
        setState({ status: "ok", msg: "Success! Redirecting..." });
        setTimeout(() => nav("/dashboard"), 1200);
      } else {
        setState({ status: "ok", msg: "Account ready. Please login." });
        setTimeout(() => nav(`/login?email=${encodeURIComponent(email)}`), 1200);
      }
    } catch (err) {
      setState({ status: "err", msg: err?.response?.data?.message || "Error joining team." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ci-page-container">
      <div className="ci-card">
        {/* Branding */}
        <div className="ci-logo-section">
          <div className="ci-logo-icon">LT</div>
          <span className="ci-logo-text">LeakageTracker</span>
        </div>

        <div className="ci-header">
          <h2 className="ci-title">Finish joining</h2>
          <p className="ci-sub">
            Complete your profile to join the workspace.
          </p>
          <div className="ci-email-badge">{email || "your-email@company.com"}</div>
        </div>

        <form onSubmit={submit} className="ci-form">
          <div className="ci-input-group">
            <label>Full name</label>
            <div className="ci-input-wrapper">
              <FiUser className="ci-field-icon" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
              />
            </div>
          </div>

          <div className="ci-input-group">
            <label>Set password</label>
            <div className="ci-input-wrapper">
              <FiLock className="ci-field-icon" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
              />
            </div>
          </div>

          {state.status !== "idle" && (
            <div className={`ci-alert ${state.status}`}>
              {state.status === "ok" ? <FiCheckCircle /> : <FiXCircle />}
              {state.msg}
            </div>
          )}

          <button type="submit" className="ci-primary-btn" disabled={loading}>
            {loading ? "Joining..." : "Create account & join"}
          </button>

          <div className="ci-divider">
            <span>OR</span>
          </div>

          <button
            type="button"
            className="ci-ghost-btn"
            onClick={() => nav(`/login?email=${encodeURIComponent(email)}`)}
          >
            I already have an account
          </button>
        </form>
      </div>
    </div>
  );
}