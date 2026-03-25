import React, { useState } from "react";
import axios from "axios";
import { FiArrowRight, FiCheckCircle, FiMail, FiLock, FiInfo } from "react-icons/fi";
import "./login.css";
import Header from "../../../components/Header/Header";
import Footer from "../../../components/Footer/Footer";
import logoImg from "../../../assets/logoImg.png"; // ✅ use same logo as header (adjust path if needed)

const Login = () => {
  // ✅ axios setup in same file
  const API_BASE = import.meta.env.VITE_API_URL;
  const LOGIN_URL = `${API_BASE}/api/auth/login`;

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.email || !form.password) {
      setError("Email and password are required.");
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

      // backend returns { token, user, message }
      const token = res?.data?.token;
      if (token) localStorage.setItem("token", token);

      setSuccess(res?.data?.message || "Login successful!");

      // ✅ redirect to dashboard
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 600);
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;

      if (status === 401) {
        setError(serverMsg || "Invalid email or password.");
        return;
      }

      if (status === 400) {
        setError(serverMsg || "Please check your credentials.");
        return;
      }

      if (status === 500) {
        setError("Server error. Please try again later.");
        return;
      }

      setError(serverMsg || err?.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />

      <main className="rs-login">
        <div className="rs-login__wrap">
          {/* Left Side */}
          <section className="rs-login__left" aria-label="Login overview">
            <div className="rs-loginBrand">
              <div className="rs-loginMark" aria-hidden="true">
                <img src={logoImg} alt="" />
              </div>
              <div className="rs-loginBrandText">
                <div className="rs-loginName">RevenueShield</div>
                <div className="rs-loginTagline">Prevent revenue leakage</div>
              </div>
            </div>

            <h1 className="rs-loginTitle">Welcome back</h1>
            <p className="rs-loginSub">
              Sign in to access your leakage dashboard, reports, and profit rules.
            </p>

            <ul className="rs-loginList">
              <li><FiCheckCircle className="rs-check" /> View leakage insights</li>
              <li><FiCheckCircle className="rs-check" /> Track discounts & rework</li>
              <li><FiCheckCircle className="rs-check" /> Make better pricing decisions</li>
            </ul>

            <div className="rs-loginTip">
              <div className="rs-tipHead">
                <FiInfo size={18} />
                <strong>Tip</strong>
              </div>
              <p>
                Use the same email you registered with. If you forgot your password,
                reset it using the link on the right.
              </p>
            </div>
          </section>

          {/* Right Side Form */}
          <section className="rs-login__right" aria-label="Sign in form">
            <div className="rs-loginCard">
              <div className="rs-loginCardHead">
                <h2>Email + password</h2>
                <p>Enter your credentials to access the app</p>
              </div>

              <form className="rs-loginForm" onSubmit={handleSubmit}>
                {/* feedback */}
                {error && <div className="rs-alert rs-alert--error">{error}</div>}
                {success && <div className="rs-alert rs-alert--success">{success}</div>}

                <div className="rs-field">
                  <label htmlFor="email">Email</label>
                  <div className="rs-inputWrap">
                    <FiMail className="rs-inputIcon" />
                    <input
                      id="email"
                      type="email"
                      name="email"
                      placeholder="you@company.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="rs-field">
                  <div className="rs-labelRow">
                    <label htmlFor="password">Password</label>
                    <a className="rs-forgot" href="/forgot-password">Forgot password?</a>
                  </div>

                  <div className="rs-inputWrap">
                    <FiLock className="rs-inputIcon" />
                    <input
                      id="password"
                      type="password"
                      name="password"
                      placeholder="Your password"
                      value={form.password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="rs-loginBtn" disabled={isLoading}>
                  {isLoading ? (
                    "Signing in..."
                  ) : (
                    <>
                      Login <FiArrowRight />
                    </>
                  )}
                </button>

                <div className="rs-loginFoot">
                  Don&apos;t have an account? <a href="/register">Create one</a>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default Login;
