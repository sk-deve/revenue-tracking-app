import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { FiCheckCircle, FiXCircle, FiLoader } from "react-icons/fi";
import "./AcceptInvitePage.css";

export default function AcceptInvitePage() {
  const API_BASE = "http://localhost:4000";
  const ACCEPT_URL = `${API_BASE}/api/team/accept-invite`;

  const nav = useNavigate();
  const { search } = useLocation();

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const token = params.get("token") || "";
  const owner = params.get("owner") || "";
  const emailFromUrl = params.get("email") || "";

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Validating invite...");

  useEffect(() => {
    const run = async () => {
      if (!token || !owner) {
        setStatus("error");
        setMessage("Invalid invite link.");
        return;
      }

      try {
        const res = await axios.post(
          ACCEPT_URL,
          { token, owner },
          { headers: { "Content-Type": "application/json" }, timeout: 15000 }
        );

        const data = res.data;
        const next = data?.next;
        const invitedEmail = data?.email || emailFromUrl || "";

        // ✅ USER NEEDS TO SET PASSWORD
        if (next === "SIGNUP_REQUIRED") {
          setStatus("success");
          setMessage("Invite verified. Complete account setup…");

          nav(
            `/complete-invite?token=${encodeURIComponent(token)}&owner=${encodeURIComponent(
              owner
            )}&email=${encodeURIComponent(invitedEmail)}`,
            { replace: true }
          );
          return;
        }

        // ✅ USER EXISTS → LOGIN
        if (next === "LOGIN") {
          setStatus("success");
          setMessage("Invite accepted. Redirecting to login…");

          nav(`/login?email=${encodeURIComponent(invitedEmail)}`, {
            replace: true,
          });
          return;
        }

        // fallback
        nav("/login", { replace: true });
      } catch (err) {
        setStatus("error");
        setMessage(
          err?.response?.data?.message || "Invite could not be accepted."
        );
      }
    };

    run();
  }, [token, owner, emailFromUrl, nav]);

  return (
    <div className="ai-wrap">
      <div className="ai-card">
        <div className="ai-icon">
          {status === "loading" && <FiLoader className="ai-spin" />}
          {status === "success" && <FiCheckCircle />}
          {status === "error" && <FiXCircle />}
        </div>

        <h2 className="ai-title">
          {status === "loading"
            ? "Accepting invite"
            : status === "success"
            ? "Invite verified"
            : "Invite failed"}
        </h2>

        <p className="ai-sub">{message}</p>
      </div>
    </div>
  );
}
