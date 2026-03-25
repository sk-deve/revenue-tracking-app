import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import {
  FiArrowLeft,
  FiArrowRight,
  FiBriefcase,
  FiDollarSign,
  FiSettings,
  FiPercent,
  FiToggleLeft,
  FiToggleRight,
  FiTool,
  FiPlus,
  FiTrash2,
  FiCheckCircle,
  FiInfo,
} from "react-icons/fi";
import "./Onboarding.css";

export default function Onboarding() {
  // ✅ axios setup in same file
  const API_BASE = "http://localhost:4000";
  const ONBOARDING_STATUS_URL = `${API_BASE}/api/onboarding/status`;
  const ONBOARDING_COMPLETE_URL = `${API_BASE}/api/onboarding/complete`;

  const [step, setStep] = useState(1);

  const [business, setBusiness] = useState({
    businessType: "Auto Repair / Shop",
    currency: "USD",
    laborCostPerHour: "65",
    targetProfitMargin: "30",
    overheadAvg: "",
  });

  const [rules, setRules] = useState({
    trackDiscountLoss: true,
    trackMarginDrop: true,
    trackReworkCost: true,
    trackLostQuotes: false,
    maxDiscountAllowed: "10",
    minimumMarginAllowed: "20",
  });

  const [services, setServices] = useState([
    {
      id: "svc-1",
      serviceName: "Wheel Repair",
      expectedPrice: "250",
      expectedMargin: "35",
      typicalUpsells: "Powder coat, caliper paint",
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("token");

  const authHeaders = useMemo(() => {
    return {
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      timeout: 15000,
      withCredentials: false,
    };
  }, [token]);

  // ✅ load existing onboarding (and redirect if already done)
  useEffect(() => {
    const run = async () => {
      setBootLoading(true);
      setError("");

      if (!token) {
        // not logged in
        window.location.href = "/login";
        return;
      }

      try {
        const res = await axios.get(ONBOARDING_STATUS_URL, authHeaders);

        const done = !!res?.data?.onboardingCompleted;
        if (done) {
          window.location.href = "/dashboard";
          return;
        }

        // hydrate existing saved onboarding (if any)
        const ob = res?.data?.onboarding || {};
        if (ob.business) {
          setBusiness((prev) => ({
            ...prev,
            businessType: ob.business.businessType ?? prev.businessType,
            currency: ob.business.currency ?? prev.currency,
            laborCostPerHour:
              ob.business.laborCostPerHour !== undefined && ob.business.laborCostPerHour !== null
                ? String(ob.business.laborCostPerHour)
                : prev.laborCostPerHour,
            targetProfitMargin:
              ob.business.targetProfitMargin !== undefined && ob.business.targetProfitMargin !== null
                ? String(ob.business.targetProfitMargin)
                : prev.targetProfitMargin,
            overheadAvg:
              ob.business.overheadAvg !== undefined && ob.business.overheadAvg !== null && ob.business.overheadAvg !== 0
                ? String(ob.business.overheadAvg)
                : prev.overheadAvg,
          }));
        }

        if (ob.rules) {
          setRules((prev) => ({
            ...prev,
            trackDiscountLoss: ob.rules.trackDiscountLoss ?? prev.trackDiscountLoss,
            trackMarginDrop: ob.rules.trackMarginDrop ?? prev.trackMarginDrop,
            trackReworkCost: ob.rules.trackReworkCost ?? prev.trackReworkCost,
            trackLostQuotes: ob.rules.trackLostQuotes ?? prev.trackLostQuotes,
            maxDiscountAllowed:
              ob.rules.maxDiscountAllowed !== undefined && ob.rules.maxDiscountAllowed !== null
                ? String(ob.rules.maxDiscountAllowed)
                : prev.maxDiscountAllowed,
            minimumMarginAllowed:
              ob.rules.minimumMarginAllowed !== undefined && ob.rules.minimumMarginAllowed !== null
                ? String(ob.rules.minimumMarginAllowed)
                : prev.minimumMarginAllowed,
          }));
        }

        if (Array.isArray(ob.services) && ob.services.length) {
          setServices(
            ob.services.map((s, idx) => ({
              id: `svc-${idx + 1}-${Math.random().toString(16).slice(2)}`,
              serviceName: s.serviceName ?? "",
              expectedPrice: s.expectedPrice !== undefined && s.expectedPrice !== null ? String(s.expectedPrice) : "",
              expectedMargin: s.expectedMargin !== undefined && s.expectedMargin !== null ? String(s.expectedMargin) : "",
              typicalUpsells: s.typicalUpsells ?? "",
            }))
          );
        }
      } catch (err) {
        const status = err?.response?.status;
        const serverMsg = err?.response?.data?.message;

        if (status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }

        setError(serverMsg || "Failed to load onboarding status.");
      } finally {
        setBootLoading(false);
      }
    };

    run();
  }, [ONBOARDING_STATUS_URL, authHeaders, token]);

  const canNext = useMemo(() => {
    if (step === 1) {
      return (
        business.businessType.trim() &&
        business.currency.trim() &&
        String(business.laborCostPerHour).trim() &&
        String(business.targetProfitMargin).trim()
      );
    }
    if (step === 2) {
      return String(rules.maxDiscountAllowed).trim() && String(rules.minimumMarginAllowed).trim();
    }
    return true; // step 3 optional
  }, [step, business, rules]);

  const nextLabel = useMemo(() => {
    if (step === 3) return "Finish onboarding";
    return "Continue";
  }, [step]);

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  // ✅ Final submit to backend
  const submitOnboarding = async ({ includeServices }) => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        business: {
          businessType: business.businessType,
          currency: business.currency,
          laborCostPerHour: Number(business.laborCostPerHour || 0),
          targetProfitMargin: Number(business.targetProfitMargin || 0),
          overheadAvg: business.overheadAvg ? Number(business.overheadAvg) : 0,
        },
        rules: {
          trackDiscountLoss: !!rules.trackDiscountLoss,
          trackMarginDrop: !!rules.trackMarginDrop,
          trackReworkCost: !!rules.trackReworkCost,
          trackLostQuotes: !!rules.trackLostQuotes,
          maxDiscountAllowed: Number(rules.maxDiscountAllowed || 0),
          minimumMarginAllowed: Number(rules.minimumMarginAllowed || 0),
        },
        services: includeServices
          ? services.map((s) => ({
              serviceName: s.serviceName,
              expectedPrice: Number(s.expectedPrice || 0),
              expectedMargin: Number(s.expectedMargin || 0),
              typicalUpsells: s.typicalUpsells,
            }))
          : [],
      };

      const res = await axios.post(ONBOARDING_COMPLETE_URL, payload, authHeaders);

      if (res?.data?.onboardingCompleted) {
        setSuccess("Onboarding complete! Redirecting to dashboard...");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 600);
        return;
      }

      // fallback
      setSuccess(res?.data?.message || "Saved.");
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;

      if (status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      setError(serverMsg || "Failed to complete onboarding.");
    } finally {
      setIsLoading(false);
    }
  };

  const goNext = async () => {
    setError("");
    setSuccess("");

    if (!canNext) return;

    if (step === 3) {
      // ✅ finish onboarding and include services
      await submitOnboarding({ includeServices: true });
      return;
    }

    setStep((s) => Math.min(3, s + 1));
  };

  const jumpTo = (s) => setStep(s);

  const addService = () => {
    const id = `svc-${Math.random().toString(16).slice(2)}`;
    setServices((prev) => [
      ...prev,
      { id, serviceName: "", expectedPrice: "", expectedMargin: "", typicalUpsells: "" },
    ]);
  };

  const removeService = (id) => setServices((prev) => prev.filter((s) => s.id !== id));

  const updateService = (id, patch) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const skipStep3 = async () => {
    // ✅ finish onboarding WITHOUT services
    await submitOnboarding({ includeServices: false });
  };

  if (bootLoading) {
    return (
      <div className="ob-page">
        <div className="ob-container ob-main" style={{ padding: 24 }}>
          <div className="ob-card" style={{ padding: 24 }}>
            Loading onboarding...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ob-page">
      {/* Top header */}
      <header className="ob-topbar">
        <div className="ob-container ob-topbar__inner">
          <div className="ob-brand">
            <div className="ob-brand__icon">
              <FiDollarSign />
            </div>
            <div className="ob-brand__text">
              <div className="ob-brand__name">LeakageTracker</div>
              <div className="ob-brand__sub">Onboarding</div>
            </div>
          </div>

          <a
            className="ob-linkBtn"
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              // logout on exit
              localStorage.removeItem("token");
              window.location.href = "/login";
            }}
          >
            Exit setup
          </a>
        </div>
      </header>

      <main className="ob-container ob-main">
        {/* Left column */}
        <aside className="ob-left">
          <div className="ob-titleBlock">
            <h1>Let’s set your baseline</h1>
            <p>This takes about 3 minutes. Your settings define how leakage is calculated.</p>
          </div>

          <Stepper active={step} onJump={jumpTo} />

          <div className="ob-infoCard">
            <div className="ob-infoCard__icon">
              <FiBriefcase />
            </div>
            <div>
              <div className="ob-infoCard__title">Why we ask for this</div>
              <div className="ob-infoCard__text">
                Leakage insights are only as accurate as your inputs and rules. We use your targets,
                thresholds, and optional service pricing to show where margin is being lost.
              </div>
            </div>
          </div>
        </aside>

        {/* Right column */}
        <section className="ob-card">
          {/* alerts */}
          {error ? <div className="lt-alert lt-alert-error" style={{ marginBottom: 12 }}>{error}</div> : null}
          {success ? <div className="lt-alert lt-alert-success" style={{ marginBottom: 12 }}>{success}</div> : null}

          {step === 1 && (
            <div className="ob-step">
              <div className="ob-stepHead">
                <div>
                  <div className="ob-stepKicker">Step 1</div>
                  <h2>Business Setup</h2>
                  <p>Set baseline rules for calculations.</p>
                </div>
                <div className="ob-stepHead__icon">
                  <FiSettings />
                </div>
              </div>

              <div className="ob-grid2">
                <Select
                  label="Business type"
                  icon={<FiBriefcase />}
                  value={business.businessType}
                  onChange={(v) => setBusiness((p) => ({ ...p, businessType: v }))}
                  options={["Auto Repair / Shop", "Construction", "Cleaning Service", "Agency / Services", "Other"]}
                />

                <Select
                  label="Currency"
                  icon={<FiDollarSign />}
                  value={business.currency}
                  onChange={(v) => setBusiness((p) => ({ ...p, currency: v }))}
                  options={["USD", "PKR", "GBP", "EUR", "AED"]}
                />

                <Input
                  label="Default labor cost (per hour)"
                  icon={<FiTool />}
                  value={business.laborCostPerHour}
                  onChange={(v) => setBusiness((p) => ({ ...p, laborCostPerHour: v }))}
                  placeholder="e.g., 65"
                  type="number"
                  suffix={business.currency}
                />

                <Input
                  label="Target profit margin (%)"
                  icon={<FiPercent />}
                  value={business.targetProfitMargin}
                  onChange={(v) => setBusiness((p) => ({ ...p, targetProfitMargin: v }))}
                  placeholder="e.g., 30"
                  type="number"
                  suffix="%"
                />

                <div className="ob-span2">
                  <Input
                    label="Average overhead (optional)"
                    icon={<FiSettings />}
                    value={business.overheadAvg}
                    onChange={(v) => setBusiness((p) => ({ ...p, overheadAvg: v }))}
                    placeholder="e.g., 12"
                    type="number"
                    suffix="%"
                  />
                  <div className="ob-helpText">Optional: used for deeper reporting, not required.</div>
                </div>
              </div>

              <ActionBar
                step={step}
                canNext={canNext && !isLoading}
                nextLabel={isLoading ? "Saving..." : nextLabel}
                onBack={goBack}
                onNext={goNext}
              />
            </div>
          )}

          {step === 2 && (
            <div className="ob-step">
              <div className="ob-stepHead">
                <div>
                  <div className="ob-stepKicker">Step 2</div>
                  <h2>Revenue Leakage Rules Setup</h2>
                  <p>Define what counts as “leakage”.</p>
                </div>
                <div className="ob-stepHead__icon">
                  <FiToggleRight />
                </div>
              </div>

              <div className="ob-stack">
                <ToggleRow
                  title="Track discount loss"
                  desc="Measure lost profit when discounts reduce your expected margin."
                  enabled={rules.trackDiscountLoss}
                  onToggle={() => setRules((p) => ({ ...p, trackDiscountLoss: !p.trackDiscountLoss }))}
                />
                <ToggleRow
                  title="Track margin drop"
                  desc="Flag jobs where actual margin falls below your minimum threshold."
                  enabled={rules.trackMarginDrop}
                  onToggle={() => setRules((p) => ({ ...p, trackMarginDrop: !p.trackMarginDrop }))}
                />
                <ToggleRow
                  title="Track rework cost"
                  desc="Track time/cost spent fixing mistakes or redoing work."
                  enabled={rules.trackReworkCost}
                  onToggle={() => setRules((p) => ({ ...p, trackReworkCost: !p.trackReworkCost }))}
                />
                <ToggleRow
                  title="Track lost quotes (optional)"
                  desc="Optionally estimate leakage from quotes you didn’t win."
                  enabled={rules.trackLostQuotes}
                  onToggle={() => setRules((p) => ({ ...p, trackLostQuotes: !p.trackLostQuotes }))}
                />
              </div>

              <div className="ob-panel">
                <div className="ob-panel__head">
                  <div>
                    <div className="ob-panel__title">Threshold settings</div>
                    <div className="ob-panel__sub">These thresholds help LeakageTracker flag patterns automatically.</div>
                  </div>
                  <div className="ob-panel__icon">
                    <FiSettings />
                  </div>
                </div>

                <div className="ob-grid2">
                  <Input
                    label="Max discount allowed (%)"
                    icon={<FiPercent />}
                    value={rules.maxDiscountAllowed}
                    onChange={(v) => setRules((p) => ({ ...p, maxDiscountAllowed: v }))}
                    placeholder="e.g., 10"
                    type="number"
                    suffix="%"
                  />

                  <Input
                    label="Minimum margin allowed (%)"
                    icon={<FiPercent />}
                    value={rules.minimumMarginAllowed}
                    onChange={(v) => setRules((p) => ({ ...p, minimumMarginAllowed: v }))}
                    placeholder="e.g., 20"
                    type="number"
                    suffix="%"
                  />
                </div>

                <div className="ob-note">
                  <FiInfo />
                  <span>
                    Example: if discount exceeds max OR margin drops below minimum, it will be flagged as leakage.
                  </span>
                </div>
              </div>

              <ActionBar
                step={step}
                canNext={canNext && !isLoading}
                nextLabel={isLoading ? "Saving..." : nextLabel}
                onBack={goBack}
                onNext={goNext}
              />
            </div>
          )}

          {step === 3 && (
            <div className="ob-step">
              <div className="ob-stepHead">
                <div>
                  <div className="ob-stepKicker">Step 3 (Optional)</div>
                  <h2>Service & Pricing Setup</h2>
                  <p>Create reference pricing for deeper insights.</p>
                </div>
                <div className="ob-stepHead__icon">
                  <FiTool />
                </div>
              </div>

              <div className="ob-rowBetween">
                <div className="ob-mutedText">Add your common services and expected targets.</div>
                <button className="ob-ghostBtn" type="button" onClick={addService}>
                  <FiPlus /> Add service
                </button>
              </div>

              <div className="ob-services">
                {services.map((svc) => (
                  <div className="ob-serviceCard" key={svc.id}>
                    <div className="ob-rowBetween">
                      <div className="ob-sectionTitle">Service</div>
                      <button
                        className="ob-ghostBtn ob-ghostBtn--danger"
                        type="button"
                        onClick={() => removeService(svc.id)}
                      >
                        <FiTrash2 /> Remove
                      </button>
                    </div>

                    <div className="ob-grid2 ob-mt16">
                      <Input
                        label="Service name"
                        icon={<FiTool />}
                        value={svc.serviceName}
                        onChange={(v) => updateService(svc.id, { serviceName: v })}
                        placeholder="e.g., Wheel Repair"
                      />

                      <Input
                        label="Expected price"
                        icon={<FiDollarSign />}
                        value={svc.expectedPrice}
                        onChange={(v) => updateService(svc.id, { expectedPrice: v })}
                        placeholder="e.g., 250"
                        type="number"
                        suffix={business.currency}
                      />

                      <Input
                        label="Expected margin"
                        icon={<FiPercent />}
                        value={svc.expectedMargin}
                        onChange={(v) => updateService(svc.id, { expectedMargin: v })}
                        placeholder="e.g., 35"
                        type="number"
                        suffix="%"
                      />

                      <Input
                        label="Typical upsells (optional)"
                        icon={<FiPlus />}
                        value={svc.typicalUpsells}
                        onChange={(v) => updateService(svc.id, { typicalUpsells: v })}
                        placeholder="e.g., Powder coat, caliper paint"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="ob-panel ob-panel--soft">
                <div className="ob-note">
                  <FiInfo />
                  <span>
                    Optional but powerful: If you skip this step, you can still track leakage from discounts, margin
                    drops, and rework. Add services later for expected vs actual comparisons.
                  </span>
                </div>
              </div>

              <ActionBar
                step={step}
                canNext={!isLoading}
                nextLabel={isLoading ? "Finishing..." : nextLabel}
                onBack={goBack}
                onNext={goNext}
                onSkip={isLoading ? undefined : skipStep3}
              />
            </div>
          )}
        </section>
      </main>

      <footer className="ob-footer">
        <div className="ob-container ob-footer__inner">
          <span>© {new Date().getFullYear()} LeakageTracker. All rights reserved.</span>
          <div className="ob-footer__links">
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
            <a href="#">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Small UI components (same file) ---------- */

function Stepper({ active, onJump }) {
  const steps = [
    { key: 1, title: "Business Setup", subtitle: "Baseline rules" },
    { key: 2, title: "Leakage Rules", subtitle: "Define leakage" },
    { key: 3, title: "Service & Pricing", subtitle: "Optional" },
  ];

  return (
    <div className="ob-stepper">
      <div className="ob-stepper__grid">
        {steps.map((s) => {
          const isActive = s.key === active;
          const isDone = s.key < active;

          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onJump(s.key)}
              className={"ob-stepperItem " + (isActive ? "is-active" : "")}
            >
              <div className={"ob-stepBadge " + (isDone || isActive ? "is-filled" : "")}>
                {isDone ? <FiCheckCircle /> : s.key}
              </div>
              <div>
                <div className="ob-stepperItem__title">{s.title}</div>
                <div className="ob-stepperItem__sub">{s.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="ob-tip">
        <FiInfo />
        <span>
          <b>Tip:</b> You can skip step 3 and still get leakage insights.
        </span>
      </div>
    </div>
  );
}

function ActionBar({ step, canNext, nextLabel, onBack, onNext, onSkip }) {
  return (
    <div className="ob-actions">
      <button className="ob-btn ob-btn--ghost" type="button" onClick={onBack} disabled={step === 1}>
        <FiArrowLeft /> Back
      </button>

      <div className="ob-actions__right">
        {onSkip ? (
          <button className="ob-btn ob-btn--ghost" type="button" onClick={onSkip}>
            Skip for now
          </button>
        ) : null}

        <button className="ob-btn ob-btn--primary" type="button" onClick={onNext} disabled={!canNext}>
          {nextLabel} <FiArrowRight />
        </button>
      </div>
    </div>
  );
}

function Input({ label, icon, value, onChange, placeholder, type = "text", suffix }) {
  return (
    <div className="ob-field">
      <label className="ob-label">{label}</label>
      <div className="ob-inputWrap">
        <span className="ob-inputIcon">{icon}</span>
        <input
          className="ob-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
        />
        {suffix ? <span className="ob-suffix">{suffix}</span> : null}
      </div>
    </div>
  );
}

function Select({ label, icon, value, onChange, options }) {
  return (
    <div className="ob-field">
      <label className="ob-label">{label}</label>
      <div className="ob-inputWrap">
        <span className="ob-inputIcon">{icon}</span>
        <select className="ob-input ob-select" value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ToggleRow({ title, desc, enabled, onToggle }) {
  return (
    <button type="button" className="ob-toggleRow" onClick={onToggle}>
      <div>
        <div className="ob-toggleRow__title">{title}</div>
        <div className="ob-toggleRow__desc">{desc}</div>
      </div>
      <div className={"ob-toggleRow__icon " + (enabled ? "is-on" : "is-off")}>
        {enabled ? <FiToggleRight /> : <FiToggleLeft />}
      </div>
    </button>
  );
}

