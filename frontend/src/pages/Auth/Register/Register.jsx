import React, { useState } from "react";
import axios from "axios";
import { FiArrowRight, FiCheck, FiUser, FiMail, FiLock, FiBriefcase } from "react-icons/fi";
import "./register.css";
import Header from "../../../components/Header/Header";
import Footer from "../../../components/Footer/Footer";
import logoImg from "../../../assets/logoImg.png"; // ✅ use same logo as header (adjust path if needed)

const Register = () => {
  // ✅ axios setup in same file
  const API_BASE = "http://localhost:4000";
  const REGISTER_URL = `${API_BASE}/api/auth/register`;

  const [form, setForm] = useState({
    fullName: "",
    businessName: "",
    email: "",
    password: "",
    acceptTerms: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // quick frontend checks
    if (!form.fullName || !form.businessName || !form.email || !form.password) {
      setError("Please fill all fields.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!form.acceptTerms) {
      setError("Please accept terms to continue.");
      return;
    }

    try {
      setIsLoading(true);

      const res = await axios.post(
        REGISTER_URL,
        {
          fullName: form.fullName.trim(),
          businessName: form.businessName.trim(),
          email: form.email.trim(),
          password: form.password,
          acceptTerms: form.acceptTerms,
        },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: false,
          timeout: 15000,
        }
      );

      const token = res?.data?.token;
      if (token) localStorage.setItem("token", token);

      setSuccess(res?.data?.message || "Registered successfully!");

      // reset form
      setForm({
        fullName: "",
        businessName: "",
        email: "",
        password: "",
        acceptTerms: false,
      });

      // redirect to onboarding
      window.location.href = "/onboarding";
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;

      // ✅ handle 409 conflict cleanly (email already exists)
      if (status === 409) {
        setError(serverMsg || "This email is already registered. Redirecting to login...");
        setTimeout(() => (window.location.href = "/login"), 1200);
        return;
      }

      if (status === 400) {
        setError(serverMsg || "Please check your inputs.");
        return;
      }

      if (status === 401) {
        setError(serverMsg || "Unauthorized. Please try again.");
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
    <>
      <Header />

      <main className="rs-auth">
        <div className="rs-auth__wrap">
          {/* Left: Brand + Onboarding context */}
          <section className="rs-auth__left" aria-label="Onboarding overview">
            <div className="rs-brandLockup">
              <div className="rs-brandMark" aria-hidden="true">
                <img src={logoImg} alt="" />
              </div>

              <div className="rs-brandText">
                <div className="rs-brandName">RevenueShield</div>
                <div className="rs-brandTagline">Prevent revenue leakage</div>
              </div>
            </div>

            <h1 className="rs-auth__title">
              Start tracking hidden <br />
              <span className="rs-gradient">profit leakage</span>
            </h1>

            <p className="rs-auth__sub">
              Create your account to continue onboarding. You’ll set profit rules and start
              logging quotes, discounts, and rework in one place.
            </p>

            <div className="rs-pills" role="list">
              <span className="rs-pill" role="listitem">
                <FiCheck /> Setup in minutes
              </span>
              <span className="rs-pill" role="listitem">
                <FiCheck /> Clear leakage insights
              </span>
              <span className="rs-pill" role="listitem">
                <FiCheck /> No credit card required
              </span>
            </div>

            <div className="rs-steps">
              <div className="rs-steps__label">What happens next</div>

              <div className="rs-step is-active">
                <div className="rs-step__num">01</div>
                <div className="rs-step__text">
                  <div className="rs-step__kicker">Onboarding</div>
                  <div className="rs-step__title">Profit rules</div>
                </div>
              </div>

              <div className="rs-step">
                <div className="rs-step__num">02</div>
                <div className="rs-step__text">
                  <div className="rs-step__kicker">Input</div>
                  <div className="rs-step__title">Quotes & jobs</div>
                </div>
              </div>

              <div className="rs-step">
                <div className="rs-step__num">03</div>
                <div className="rs-step__text">
                  <div className="rs-step__kicker">Output</div>
                  <div className="rs-step__title">Leakage report</div>
                </div>
              </div>
            </div>
          </section>

          {/* Right: Form */}
          <section className="rs-auth__right" aria-label="Create account form">
            <div className="rs-card">
              <div className="rs-card__head">
                <h2>Create account</h2>
                <p>Enter your details to continue to onboarding.</p>
              </div>

              <form className="rs-form" onSubmit={handleSubmit}>
                {error ? <div className="rs-alert rs-alert--error">{error}</div> : null}
                {success ? <div className="rs-alert rs-alert--success">{success}</div> : null}

                <div className="rs-field">
                  <label htmlFor="fullName">Name</label>
                  <div className="rs-inputWrap">
                    <FiUser className="rs-inputIcon" />
                    <input
                      id="fullName"
                      type="text"
                      name="fullName"
                      placeholder="Your full name"
                      value={form.fullName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="rs-field">
                  <label htmlFor="businessName">Business name</label>
                  <div className="rs-inputWrap">
                    <FiBriefcase className="rs-inputIcon" />
                    <input
                      id="businessName"
                      type="text"
                      name="businessName"
                      placeholder="Your business or shop name"
                      value={form.businessName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

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
                  <label htmlFor="password">Password</label>
                  <div className="rs-inputWrap">
                    <FiLock className="rs-inputIcon" />
                    <input
                      id="password"
                      type="password"
                      name="password"
                      placeholder="Min 8 characters"
                      value={form.password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="rs-helper">Use 8+ characters. Avoid common words.</div>
                </div>

                <div className="rs-terms">
                  <input
                    type="checkbox"
                    id="terms"
                    name="acceptTerms"
                    checked={form.acceptTerms}
                    onChange={handleChange}
                    required
                  />
                  <label htmlFor="terms">
                    <div className="rs-terms__title">Accept terms</div>
                    <div className="rs-terms__text">
                      I agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
                    </div>
                  </label>
                </div>

                <button type="submit" className="rs-submit" disabled={isLoading}>
                  {isLoading ? (
                    "Creating account..."
                  ) : (
                    <>
                      Continue to onboarding <FiArrowRight />
                    </>
                  )}
                </button>

                <div className="rs-footnote">
                  Already have an account? <a href="/login">Sign in</a>
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

export default Register;


