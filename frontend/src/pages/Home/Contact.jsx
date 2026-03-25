import React, { useMemo, useState } from "react";
import {
  Mail,
  User,
  Building2,
  MessageSquareText,
  Tag,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  LifeBuoy,
  Calendar,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import "./contact.css";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";

const TOPICS = [
  "Request a Demo",
  "Pricing & Plans",
  "Technical Support",
  "Integration Help",
  "Partnerships",
  "Billing",
  "Other",
];

function Field({ label, icon: Icon, error, hint, children }) {
  return (
    <div className="ct-field">
      <div className="ct-labelRow">
        <label className="ct-label">{label}</label>
        {hint ? <div className="ct-hint">{hint}</div> : null}
      </div>

      <div className={`ct-control ${error ? "is-error" : ""}`}>
        {Icon ? <Icon className="ct-icon" size={18} aria-hidden="true" /> : null}
        {children}
      </div>

      {error ? (
        <p className="ct-error">
          <AlertTriangle size={14} />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function RevenueLeakageContactForm({
  brandName = "RevenueShield",
  onSubmit,
}) {
  const [values, setValues] = useState({
    name: "",
    email: "",
    company: "",
    topic: TOPICS[0],
    message: "",
    wantDemo: false,
  });

  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState("idle");
  const [serverError, setServerError] = useState("");

  const errors = useMemo(() => {
    const e = {};
    if (!values.name.trim()) e.name = "Please enter your name.";
    if (!values.email.trim()) e.email = "Please enter your email.";
    else if (!/^\S+@\S+\.\S+$/.test(values.email.trim()))
      e.email = "Please enter a valid email address.";
    if (!values.company.trim()) e.company = "Please enter your company name.";
    if (!values.message.trim()) e.message = "Please write a short message.";
    else if (values.message.trim().length < 10)
      e.message = "Please add a bit more detail (10+ characters).";
    return e;
  }, [values]);

  const hasErrors = Object.keys(errors).length > 0;

  const setField = (field, val) => setValues((p) => ({ ...p, [field]: val }));
  const markTouched = (field) => setTouched((p) => ({ ...p, [field]: true }));

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");
    setTouched({
      name: true,
      email: true,
      company: true,
      topic: true,
      message: true,
      wantDemo: true,
    });

    if (hasErrors) return;

    setStatus("submitting");

    const payload = {
      ...values,
      product: brandName,
      submittedAt: new Date().toISOString(),
      source: "contact_form",
    };

    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Request failed");
      }

      setStatus("success");
      setValues({
        name: "",
        email: "",
        company: "",
        topic: TOPICS[0],
        message: "",
        wantDemo: false,
      });
      setTouched({});
    } catch {
      setStatus("error");
      setServerError("Couldn’t send your message. Please try again.");
    }
  }

  return (
    <>
      <Header />

      <section className="ct-page">
        {/* Banner */}
        <div className="ct-banner">
          <div className="ct-bannerInner">
            <div className="ct-pill">
              <span className="ct-pillDot" />
              Support • Demos • Integrations
            </div>

            <h1 className="ct-bannerTitle">
              Contact <span className="ct-accent">{brandName}</span>
            </h1>

            <p className="ct-bannerSub">
              Tell us what you’re trying to fix — we’ll reply within 24 hours (often faster).
            </p>

            <div className="ct-bannerMeta">
              <div className="ct-metaItem">
                <Clock size={16} />
                Typical response: 2–24 hours
              </div>
              <div className="ct-metaItem">
                <ShieldCheck size={16} />
                Your info stays private
              </div>
            </div>
          </div>
        </div>

        {/* Two-column */}
        <div className="ct-shell">
          <div className="ct-grid">
            {/* Left: Form Card */}
            <div className="ct-card">
              <div className="ct-cardHead">
                <h2 className="ct-cardTitle">Send us a message</h2>
                <p className="ct-cardDesc">
                  The more detail you share, the faster we can help.
                </p>
              </div>

              <div className="ct-cardBody">
                {status === "success" ? (
                  <div className="ct-success">
                    <div className="ct-successIcon">
                      <CheckCircle2 size={20} />
                    </div>

                    <div>
                      <h3 className="ct-successTitle">Message sent!</h3>
                      <p className="ct-successText">
                        Thanks — we’ll get back to you shortly.
                      </p>

                      <button
                        type="button"
                        className="ct-btn ct-btnPrimary"
                        onClick={() => setStatus("idle")}
                      >
                        Send another message <Send size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="ct-form">
                    <div className="ct-grid2">
                      <Field
                        label="Full Name"
                        icon={User}
                        error={touched.name ? errors.name : ""}
                      >
                        <input
                          className="ct-input"
                          value={values.name}
                          onChange={(e) => setField("name", e.target.value)}
                          onBlur={() => markTouched("name")}
                          placeholder="Your name"
                          autoComplete="name"
                        />
                      </Field>

                      <Field
                        label="Email"
                        icon={Mail}
                        error={touched.email ? errors.email : ""}
                        hint="We’ll only use this to reply."
                      >
                        <input
                          className="ct-input"
                          value={values.email}
                          onChange={(e) => setField("email", e.target.value)}
                          onBlur={() => markTouched("email")}
                          placeholder="you@company.com"
                          autoComplete="email"
                        />
                      </Field>
                    </div>

                    <div className="ct-grid2">
                      <Field
                        label="Company"
                        icon={Building2}
                        error={touched.company ? errors.company : ""}
                      >
                        <input
                          className="ct-input"
                          value={values.company}
                          onChange={(e) => setField("company", e.target.value)}
                          onBlur={() => markTouched("company")}
                          placeholder="Company name"
                          autoComplete="organization"
                        />
                      </Field>

                      <Field
                        label="Topic"
                        icon={Tag}
                        error={touched.topic ? errors.topic : ""}
                      >
                        <select
                          className="ct-input"
                          value={values.topic}
                          onChange={(e) => setField("topic", e.target.value)}
                          onBlur={() => markTouched("topic")}
                        >
                          {TOPICS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <div className="ct-field">
                      <div className="ct-labelRow">
                        <label className="ct-label">Message</label>
                        <div className="ct-hint">
                          What are you trying to track? (discount leakage, rework, margin loss, etc.)
                        </div>
                      </div>

                      <div
                        className={`ct-control ct-controlTextarea ${
                          touched.message && errors.message ? "is-error" : ""
                        }`}
                      >
                        <MessageSquareText
                          className="ct-icon ct-iconTop"
                          size={18}
                          aria-hidden="true"
                        />
                        <textarea
                          className="ct-textarea"
                          value={values.message}
                          onChange={(e) => setField("message", e.target.value)}
                          onBlur={() => markTouched("message")}
                          placeholder="Write your message..."
                        />
                      </div>

                      {touched.message && errors.message ? (
                        <p className="ct-error">
                          <AlertTriangle size={14} />
                          {errors.message}
                        </p>
                      ) : null}
                    </div>

                    <div className="ct-checkRow">
                      <input
                        id="wantDemo"
                        type="checkbox"
                        className="ct-checkbox"
                        checked={values.wantDemo}
                        onChange={(e) => setField("wantDemo", e.target.checked)}
                      />
                      <label htmlFor="wantDemo" className="ct-checkLabel">
                        Yes — I want a quick demo / walkthrough.
                      </label>
                    </div>

                    {status === "error" && serverError ? (
                      <div className="ct-serverError">{serverError}</div>
                    ) : null}

                    <div className="ct-footerRow">
                      <p className="ct-consent">
                        By submitting, you agree to be contacted about your request.
                      </p>

                      <button
                        type="submit"
                        disabled={status === "submitting"}
                        className="ct-btn ct-btnDark"
                      >
                        {status === "submitting" ? "Sending..." : "Send Message"}
                        <Send size={16} />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Right: Support panel */}
            <aside className="ct-side">
              <div className="ct-sideCard">
                <div className="ct-sideTop">
                  <div className="ct-sideIcon">
                    <LifeBuoy size={18} />
                  </div>
                  <div>
                    <h3 className="ct-sideTitle">Support & Help</h3>
                    <p className="ct-sideText">
                      We’ll route your message to the right person.
                    </p>
                  </div>
                </div>

                <div className="ct-sideList">
                  <div className="ct-sideRow">
                    <span className="ct-k">Email</span>
                    <span className="ct-v">support@yourdomain.com</span>
                  </div>
                  <div className="ct-sideRow">
                    <span className="ct-k">Sales</span>
                    <span className="ct-v">sales@yourdomain.com</span>
                  </div>
                  <div className="ct-sideRow">
                    <span className="ct-k">Response time</span>
                    <span className="ct-v">2–24 hours</span>
                  </div>
                </div>
              </div>

              <div className="ct-sideCard ct-sideCTA">
                <div className="ct-sideTop">
                  <div className="ct-sideIcon blue">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h3 className="ct-sideTitle">Prefer a demo?</h3>
                    <p className="ct-sideText">
                      Choose “Request a Demo” and we’ll schedule a quick walkthrough.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="ct-btn ct-btnOutline"
                  onClick={() => window.location.assign("/pricing")}
                >
                  View pricing <ArrowRight size={16} />
                </button>
              </div>

              <div className="ct-miniNote">
                Tip: Include your average monthly jobs + your quoting workflow for faster advice.
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}



