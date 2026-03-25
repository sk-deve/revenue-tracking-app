const Job = require("../models/Job");
const ReworkIncident = require("../models/ReworkIncident");
const User = require("../models/User");

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfNextMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1);

const pickTopKey = (obj) => {
  const entries = Object.entries(obj || {});
  if (!entries.length) return null;
  entries.sort((a, b) => safeNum(b[1]) - safeNum(a[1]));
  return { key: entries[0][0], value: safeNum(entries[0][1]) };
};

const pct = (part, total) => (total > 0 ? Math.round((safeNum(part) / total) * 100) : 0);

// Optional: standardize "impact" based on percentage contribution
const impactFromPct = (p) => {
  if (p >= 35) return "high";
  if (p >= 20) return "medium";
  return "low";
};

// Optional: standardize "priority" based on impact + dollars
const priorityFrom = ({ impact, amount }) => {
  if (impact === "high" && amount >= 200) return "high";
  if (impact === "high") return "high";
  if (impact === "medium") return "medium";
  return "low";
};

exports.getInsightsOverview = async (req, res) => {
  try {
    // ✅ ALWAYS USE WORKSPACE OWNER
    const workspaceOwnerId = req.workspaceOwnerId || req.user.id;

    const user = await User.findById(workspaceOwnerId).select(
      "onboardingCompleted onboarding.business.currency onboarding.rules"
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "Workspace owner not found." });
    }

    if (!user.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: "Onboarding not completed.",
        code: "ONBOARDING_REQUIRED",
      });
    }

    const currency = user.onboarding?.business?.currency || "USD";
    const rules = user.onboarding?.rules || {};

    const trackDiscountLoss = !!rules.trackDiscountLoss;
    const trackReworkCost = !!rules.trackReworkCost;

    // range (this month)
    const now = new Date();
    const from = startOfMonth(now);
    const to = startOfNextMonth(now);

    // ✅ LOAD WORKSPACE DATA
    const [jobs, reworks] = await Promise.all([
      Job.find({
        user: workspaceOwnerId,
        createdAt: { $gte: from, $lt: to },
      })
        .select("_id status quotedPrice finalPrice discountReason service createdAt")
        .lean(),

      ReworkIncident.find({
        userId: workspaceOwnerId,
        date: { $gte: from, $lt: to },
      })
        .select("_id jobRef hours costPerHour loss reason date")
        .lean(),
    ]);

    let discountTotal = 0;
    let reworkTotal = 0;
    let marginTotal = 0; // (future-ready)

    // rollups
    const serviceLeakage = {};     // { serviceName: amount } (discount + rework)
    const discountReasonLoss = {}; // { reason: amount }
    const reworkReasonLoss = {};   // { reason: amount }

    const leakageCause = {
      "Volume discounts": 0,
      "Competitive pricing": 0,
      "Long-term client": 0,
      Negotiation: 0,
      Other: 0,
      "Quality rework": 0,
      Misquote: 0,
      Error: 0,
      Customer: 0,
    };

    // ---- JOBS (discount leakage) ----
    for (const j of jobs) {
      const quoted = safeNum(j.quotedPrice);
      const final = safeNum(j.finalPrice);

      let discountLeak = 0;
      if (
        trackDiscountLoss &&
        j.status === "Won" &&
        quoted > 0 &&
        final >= 0 &&
        quoted > final
      ) {
        discountLeak = quoted - final;
      }

      if (discountLeak <= 0) continue;

      discountTotal += discountLeak;

      const svc = (j.service || "Unassigned").trim();
      serviceLeakage[svc] = (serviceLeakage[svc] || 0) + discountLeak;

      const reasonRaw = (j.discountReason || "Other").trim() || "Other";
      discountReasonLoss[reasonRaw] = (discountReasonLoss[reasonRaw] || 0) + discountLeak;

      // normalize into "common causes" buckets (best-effort)
      const r = reasonRaw.toLowerCase();
      if (r.includes("volume")) leakageCause["Volume discounts"] += discountLeak;
      else if (r.includes("competitive")) leakageCause["Competitive pricing"] += discountLeak;
      else if (r.includes("long")) leakageCause["Long-term client"] += discountLeak;
      else if (r.includes("negotiation") || r.includes("negotiat"))
        leakageCause["Negotiation"] += discountLeak;
      else leakageCause["Other"] += discountLeak;
    }

    // ---- REWORK ----
    if (trackReworkCost) {
      for (const r of reworks) {
        const loss = safeNum(r.loss);
        if (loss <= 0) continue;

        reworkTotal += loss;

        // Rework does not have service in schema, so bucket into Unassigned
        const svc = "Unassigned";
        serviceLeakage[svc] = (serviceLeakage[svc] || 0) + loss;

        const reason = (r.reason || "Other").trim() || "Other";
        reworkReasonLoss[reason] = (reworkReasonLoss[reason] || 0) + loss;

        // normalize cause buckets
        if (reason === "Quality") leakageCause["Quality rework"] += loss;
        else if (reason === "Misquote") leakageCause["Misquote"] += loss;
        else if (reason === "Error") leakageCause["Error"] += loss;
        else if (reason === "Customer") leakageCause["Customer"] += loss;
        else leakageCause["Other"] += loss;
      }
    }

    const totalLeakage = discountTotal + reworkTotal + marginTotal;

    // tops
    const topCauseKey =
      pickTopKey({
        Discounting: discountTotal,
        Rework: reworkTotal,
        "Margin loss": marginTotal,
      })?.key || "—";

    const topServiceKey = pickTopKey(serviceLeakage)?.key || "—";
    const topDiscountReasonKey = pickTopKey(discountReasonLoss)?.key || "—";

    // ---- Suggested Actions (right column) ----
    const suggestedActions = [];
    if (discountTotal > 0) {
      suggestedActions.push(
        {
          id: "adjust-pricing",
          title: "Adjust Pricing Tiers",
          description: "Review discount thresholds and tighten approvals for frequent discount services.",
          priority: "high",
        },
        {
          id: "train-sales",
          title: "Train Sales Team",
          description: "Improve value-based selling to reduce discount dependency.",
          priority: "high",
        }
      );
    }
    if (reworkTotal > 0) {
      suggestedActions.push({
        id: "update-sops",
        title: "Update SOPs",
        description: "Standardize delivery/QC steps to reduce repeat mistakes.",
        priority: "medium",
      });
    }
    if (!suggestedActions.length) {
      suggestedActions.push({
        id: "keep-it-up",
        title: "Keep it up",
        description: "No strong leakage patterns detected this month.",
        priority: "low",
      });
    }

    // ---- Insight cards (main list) ----
    const insights = [];

    const topDiscountReason = pickTopKey(discountReasonLoss);
    if (topDiscountReason?.value > 0) {
      const percentOfDiscount = pct(topDiscountReason.value, discountTotal);
      const impact = impactFromPct(percentOfDiscount);

      insights.push({
        id: "discount-top-reason",
        title: `${topDiscountReason.key} discounts causing major leakage`,
        description: `${percentOfDiscount}% of discount-related losses come from "${topDiscountReason.key}". Consider revising pricing/approval rules.`,
        type: "pattern",
        impact,
        action: "Review pricing structure",
        metric: `${currency} ${Math.round(topDiscountReason.value).toLocaleString()}/month`,
      });
    }

    const topReworkReason = pickTopKey(reworkReasonLoss);
    if (topReworkReason?.value > 0) {
      const percentOfRework = pct(topReworkReason.value, reworkTotal);
      const impact = impactFromPct(percentOfRework);

      insights.push({
        id: "rework-top-reason",
        title: `${topReworkReason.key} is driving rework costs`,
        description: `${percentOfRework}% of rework costs come from "${topReworkReason.key}". Add checklists / QA checkpoints for this area.`,
        type: "pattern",
        impact,
        action: "Implement QA process",
        metric: `${percentOfRework}% of rework`,
      });
    }

    if (discountTotal > 0 && safeNum(rules.maxDiscountAllowed) > 0) {
      insights.push({
        id: "threshold-alert",
        title: "Discount behavior needs control",
        description: `You have discount leakage this month while your max discount rule is set to ${safeNum(
          rules.maxDiscountAllowed
        )}%. Consider enforcing approvals above the threshold.`,
        type: "alert",
        impact: "medium",
        action: "Set discount limits",
        metric: `${safeNum(rules.maxDiscountAllowed)}% threshold`,
      });
    }

    if (insights.length === 0) {
      insights.push({
        id: "no-patterns",
        title: "No major leakage patterns detected",
        description: "Nice — your discounting and rework are under control this month.",
        type: "suggestion",
        impact: "low",
        action: "Keep monitoring",
        metric: "",
      });
    }

    // ---- Common causes (right side bars) ----
    const causeEntries = Object.entries(leakageCause)
      .map(([cause, amount]) => ({ cause, amount: safeNum(amount) }))
      .filter((x) => x.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const topCauses = causeEntries.slice(0, 5);
    const causesTotal = topCauses.reduce((s, x) => s + x.amount, 0) || 0;

    const commonCauses = topCauses.map((x) => ({
      cause: x.cause,
      percent: pct(x.amount, causesTotal),
    }));

    // ---- Potential savings (conservative) ----
    const potentialSavings = Math.round(discountTotal * 0.15 + reworkTotal * 0.1);

    // keep your old "actions" too (compat)
    const actions = suggestedActions.map((a) => ({
      id: a.id,
      title: a.title,
      desc: a.description,
    }));

    /**
     * ✅ NEW: Fix Suggestions (template-ish, still dynamic)
     * This is what you asked for:
     * - "Discounts high on Service X → raise base price 8%"
     * - "Rework reason repeats → add QC checklist"
     * - "Threshold mismatch → enforce approval/reason"
     *
     * We return these in a dedicated array so the UI can render it cleanly.
     * DOES NOT BREAK existing UI.
     */
    const fixSuggestions = [];

    // 1) discounts high on most affected service
    if (discountTotal > 0 && topServiceKey && topServiceKey !== "—") {
      const svcAmount = safeNum(serviceLeakage[topServiceKey]);
      if (svcAmount > 0) {
        const impact = svcAmount >= 500 ? "high" : svcAmount >= 200 ? "medium" : "low";
        fixSuggestions.push({
          id: "fix-discount-service",
          category: "Pricing",
          severity: priorityFrom({ impact, amount: svcAmount }),
          title: `Discounts are high on "${topServiceKey}"`,
          message: `Your biggest leakage is coming from discounts on "${topServiceKey}". Consider raising your base price 5–10% or tightening approvals.`,
          metric: `${currency} ${Math.round(svcAmount).toLocaleString()}/month`,
          actions: [
            { label: "Raise base price 8%", actionId: "pricing.raise_8" },
            { label: "Set max discount rule", actionId: "rules.max_discount" },
          ],
        });
      }
    }

    // 2) rework repeating reason
    if (reworkTotal > 0) {
      const tr = pickTopKey(reworkReasonLoss);
      if (tr?.value > 0) {
        const impact = tr.value >= 500 ? "high" : tr.value >= 200 ? "medium" : "low";
        fixSuggestions.push({
          id: "fix-rework-reason",
          category: "Quality",
          severity: priorityFrom({ impact, amount: tr.value }),
          title: `Rework reason "${tr.key}" is repeating`,
          message: `Most rework loss comes from "${tr.key}". Add a QC checklist + checkpoint to reduce repeat mistakes.`,
          metric: `${currency} ${Math.round(tr.value).toLocaleString()}/month`,
          actions: [
            { label: "Add QC checklist", actionId: "qc.add_checklist" },
            { label: "Update SOP", actionId: "ops.update_sop" },
          ],
        });
      }
    }

    // 3) discount rule exists but leakage still happening
    if (discountTotal > 0 && safeNum(rules.maxDiscountAllowed) > 0) {
      fixSuggestions.push({
        id: "fix-discount-approvals",
        category: "Controls",
        severity: "medium",
        title: "Enforce discount approvals",
        message: `You’re leaking from discounts while your max discount rule is set to ${safeNum(
          rules.maxDiscountAllowed
        )}%. Require a reason or approval when discounts exceed the threshold.`,
        metric: `${safeNum(rules.maxDiscountAllowed)}% threshold`,
        actions: [
          { label: "Require reason above threshold", actionId: "rules.require_reason" },
          { label: "Add approval step", actionId: "rules.approvals" },
        ],
      });
    }

    // If nothing, provide a friendly default suggestion
    if (!fixSuggestions.length) {
      fixSuggestions.push({
        id: "fix-none",
        category: "General",
        severity: "low",
        title: "No urgent fixes needed",
        message: "Nice — no strong leakage patterns detected. Keep monitoring weekly.",
        metric: "",
        actions: [{ label: "View reports", actionId: "nav.reports" }],
      });
    }

    return res.status(200).json({
      success: true,
      currency,
      range: { from: from.toISOString(), to: to.toISOString() },

      // original-ish fields (kept)
      kpis: {
        topCause: topCauseKey,
        topService: topServiceKey,
        topDiscountReason: topDiscountReasonKey,
        suggestedActionsCount: suggestedActions.length,
      },

      totals: {
        totalLeakage: Math.round(totalLeakage),
        discountLeakage: Math.round(discountTotal),
        reworkLeakage: Math.round(reworkTotal),
        marginLossLeakage: Math.round(marginTotal),
      },

      top: {
        service: {
          name: topServiceKey,
          amount: Math.round(serviceLeakage[topServiceKey] || 0),
        },
        discountReason: {
          name: topDiscountReasonKey,
          count: pickTopKey(discountReasonLoss)?.value || 0, // note: value is money (kept as-is)
        },
      },

      actions, // backward compatible

      // ✅ Fields used by your Insights UI
      highlights: {
        topLeakageSource: topCauseKey,
        mostAffectedService: topServiceKey,
        potentialSavings,
      },
      insights,
      suggestedActions,
      commonCauses,

      // ✅ NEW
      fixSuggestions,
    });
  } catch (err) {
    console.error("INSIGHTS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error loading insights.",
      error: err.message,
    });
  }
};



