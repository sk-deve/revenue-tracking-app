const ReworkIncident = require("../models/ReworkIncident");
const User = require("../models/User");
const Notification = require("../models/Notification");


// helpers
const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfNextMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1);

const REASONS = ["Quality", "Error", "Misquote", "Customer", "Other"];

// POST /api/rework
exports.createIncident = async (req, res) => {
  try {
    // ✅ IMPORTANT: everything belongs to workspace owner
    const workspaceOwnerId = req.workspaceOwnerId || req.user.id;

    const { jobRef, hours, costPerHour, reason, description, notes, date } = req.body;

    if (!jobRef || !String(jobRef).trim()) {
      return res.status(400).json({ success: false, message: "Job reference is required." });
    }

    const h = safeNum(hours);
    if (h <= 0) {
      return res.status(400).json({ success: false, message: "Hours must be greater than 0." });
    }

    // ✅ onboarding check must be against OWNER
    const owner = await User.findById(workspaceOwnerId).select(
      "onboardingCompleted onboarding.business.laborCostPerHour onboarding.business.currency onboarding.rules"
    );
    if (!owner) return res.status(404).json({ success: false, message: "Workspace owner not found." });

    if (!owner.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: "Onboarding not completed.",
        code: "ONBOARDING_REQUIRED",
      });
    }

    // ✅ optional toggle (if you want to respect trackReworkCost)
    const rules = owner.onboarding?.rules || {};
    const trackReworkCost = !!rules.trackReworkCost;

    const defaultCost = safeNum(owner.onboarding?.business?.laborCostPerHour);
    const cph = safeNum(costPerHour) > 0 ? safeNum(costPerHour) : defaultCost;

    if (cph <= 0) {
      return res.status(400).json({
        success: false,
        message: "Cost per hour is required (or set labor cost in onboarding).",
      });
    }

    const r = REASONS.includes(reason) ? reason : "Quality";
    const loss = Number((h * cph).toFixed(2));

    const incidentData = {
      userId: workspaceOwnerId,
      createdBy: req.user?.id || null,

      jobRef: String(jobRef).trim(),
      hours: h,
      costPerHour: cph,
      loss,
      reason: r,

      // ✅ prefer description (new UI), fallback to notes if provided
      description: (description || notes || "").trim(),
      notes: (notes || "").trim(),

      date: date ? new Date(date) : new Date(),
    };

    const incident = await ReworkIncident.create(incidentData);

    /**
     * ✅ Notification (do NOT block incident save)
     * Only create if feature toggle enabled (optional)
     */
    try {
      if (trackReworkCost) {
        const currency = owner.onboarding?.business?.currency || "USD";

        await Notification.create({
          userId: workspaceOwnerId,
          createdBy: req.user?.id || null,
          type: "rework",
          title: "New rework incident logged",
          message: `${incident.jobRef}: ${incident.reason} — ${incident.hours}h (${currency} ${Math.round(
            incident.loss
          ).toLocaleString()})`,
          link: "/rework", // ✅ change if your route is different
          meta: {
            incidentId: incident._id,
            jobRef: incident.jobRef,
            reason: incident.reason,
            hours: incident.hours,
            costPerHour: incident.costPerHour,
            loss: incident.loss,
            date: incident.date,
          },
        });
      }
    } catch (notifyErr) {
      console.error("NOTIFICATION CREATE ERROR (rework):", notifyErr?.message || notifyErr);
    }

    return res.status(201).json({ success: true, message: "Incident saved.", incident });
  } catch (err) {
    console.error("REWORK CREATE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error saving rework.",
      error: err.message,
    });
  }
};





// GET /api/rework/overview?limit=25
exports.getOverview = async (req, res) => {
  try {
    const workspaceOwnerId = req.workspaceOwnerId || req.user.id;
    const limit = Math.min(Number(req.query.limit || 25), 100);

    // ✅ onboarding check must be against OWNER
    const owner = await User.findById(workspaceOwnerId).select(
      "onboardingCompleted onboarding.business.currency"
    );
    if (!owner) return res.status(404).json({ success: false, message: "Workspace owner not found." });

    if (!owner.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: "Onboarding not completed.",
        code: "ONBOARDING_REQUIRED",
      });
    }

    const currency = owner.onboarding?.business?.currency || "USD";

    const now = new Date();
    const from = startOfMonth(now);
    const to = startOfNextMonth(now);

    const incidents = await ReworkIncident.find({
      userId: workspaceOwnerId,
      date: { $gte: from, $lt: to },
    })
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    const totalReworkLoss = incidents.reduce((s, x) => s + safeNum(x.loss), 0);
    const totalHours = incidents.reduce((s, x) => s + safeNum(x.hours), 0);
    const count = incidents.length;

    const avgHours = count ? Number((totalHours / count).toFixed(1)) : 0;

    // top reason
    const freq = {};
    for (const x of incidents) {
      const key = x.reason || "Other";
      freq[key] = (freq[key] || 0) + 1;
    }
    const topReason = Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0] || "—";

    const rows = incidents.map((x) => ({
      id: x._id,
      jobRef: x.jobRef,
      hours: safeNum(x.hours),
      costPerHour: safeNum(x.costPerHour),
      loss: safeNum(x.loss),
      reason: x.reason,
      description: x.description || "",
      date: x.date,
      createdBy: x.createdBy || null,
    }));

    return res.status(200).json({
      success: true,
      currency,
      range: { from: from.toISOString(), to: to.toISOString() },
      kpis: {
        totalReworkLoss: Math.round(totalReworkLoss),
        hoursLost: Number(totalHours.toFixed(1)), // ✅ matches your UI card
        incidents: count,
        avgHours,
        topReason,
      },
      rows,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error loading rework overview.",
      error: err.message,
    });
  }
};
