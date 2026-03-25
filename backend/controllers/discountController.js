const Job = require("../models/Job");
const User = require("../models/User");

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfNextMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1);

exports.getDiscountTracking = async (req, res) => {
  try {
    // ✅ IMPORTANT: scope everything to workspace owner
    const workspaceOwnerId = req.workspaceOwnerId || req.user.id;

    // ✅ onboarding must be checked for OWNER (not the invited member)
    const owner = await User.findById(workspaceOwnerId).select(
      "onboardingCompleted onboarding.business onboarding.rules"
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
    const maxDiscountAllowed = safeNum(owner.onboarding?.rules?.maxDiscountAllowed);

    // range (this month)
    const now = new Date();
    const from = startOfMonth(now);
    const to = startOfNextMonth(now);

    // ✅ jobs this month (owner workspace)
    const jobs = await Job.find({
      user: workspaceOwnerId,
      createdAt: { $gte: from, $lt: to },
      status: "Won",
    })
      .sort({ createdAt: -1 })
      .lean();

    let totalDiscountLoss = 0;
    let alerts = 0;

    let discountedCount = 0;
    let sumDiscountPct = 0;

    const history = [];

    for (const j of jobs) {
      const quoted = safeNum(j.quotedPrice);
      const final = safeNum(j.finalPrice);

      // only discounted jobs
      if (!(quoted > 0 && final >= 0 && quoted > final)) continue;

      const discountLoss = quoted - final;
      const discountPct = quoted > 0 ? (discountLoss / quoted) * 100 : 0;

      const exceeded = maxDiscountAllowed > 0 && discountPct > maxDiscountAllowed;

      totalDiscountLoss += discountLoss;

      discountedCount += 1;
      sumDiscountPct += discountPct;

      if (exceeded) alerts += 1;

      history.push({
        id: j._id,
        service: j.serviceName || "—", // optional future field
        discountPercent: Number(discountPct.toFixed(1)),
        discountLoss: Math.round(discountLoss),
        reason: j.discountReason || "—",
        alert: exceeded ? "Exceeded" : "OK",
      });
    }

    const avgDiscountPercent =
      discountedCount > 0 ? Number((sumDiscountPct / discountedCount).toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      range: { from: from.toISOString(), to: to.toISOString() },
      currency,
      kpis: {
        totalDiscountLoss: Math.round(totalDiscountLoss),
        maxDiscountAllowed,
        alerts,
        avgDiscountPercent,
      },
      history,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error loading discount tracking.",
      error: err.message,
    });
  }
};
