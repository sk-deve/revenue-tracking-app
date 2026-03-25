const User = require("../models/User");
const Job = require("../models/Job");
const ReworkIncident = require("../models/ReworkIncident");

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function parseMonthRange(monthStr) {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();

  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    year = Number(monthStr.slice(0, 4));
    month = Number(monthStr.slice(5, 7)) - 1;
  }

  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 1);

  // previous month
  const prevFrom = new Date(year, month - 1, 1);
  const prevTo = new Date(year, month, 1);

  return {
    key: `${year}-${String(month + 1).padStart(2, "0")}`,
    from,
    to,
    prevFrom,
    prevTo,
  };
}

async function computeLeakageForUsers(users, range) {
  const userIds = users.map((u) => u._id);

  // If no users, quick return
  if (!userIds.length) {
    return {
      totals: { discount: 0, rework: 0, marginLoss: 0, totalLeakage: 0 },
      byBusiness: [],
    };
  }

  const jobMatch = {
    user: { $in: userIds },
  };
  const reworkMatch = {
    userId: { $in: userIds },
  };

  if (range?.from && range?.to) {
    jobMatch.createdAt = { $gte: range.from, $lt: range.to };
    reworkMatch.date = { $gte: range.from, $lt: range.to };
  }

  const [jobs, incidents] = await Promise.all([
    Job.find(jobMatch).lean(),
    ReworkIncident.find(reworkMatch).lean(),
  ]);

  // Index users for rule access + name
  const userIndex = new Map();
  for (const u of users) userIndex.set(String(u._id), u);

  let discountTotal = 0;
  let reworkTotal = 0;
  let marginTotal = 0;

  // per business leakage map
  const businessLeakMap = {}; // { userId: amount }

  const addBiz = (userId, amount) => {
    const id = String(userId);
    businessLeakMap[id] = (businessLeakMap[id] || 0) + safeNum(amount);
  };

  // JOBS => discount + margin
  for (const j of jobs) {
    const u = userIndex.get(String(j.user));
    if (!u) continue;

    const rules = u.onboarding?.rules || {};
    const business = u.onboarding?.business || {};

    // Only count analytics for onboarded businesses
    if (!u.onboardingCompleted) continue;

    const trackDiscountLoss = !!rules.trackDiscountLoss;
    const trackMarginDrop = !!rules.trackMarginDrop;

    const targetProfitMargin = safeNum(business.targetProfitMargin);
    const minimumMarginAllowed = safeNum(rules.minimumMarginAllowed);

    const quoted = safeNum(j.quotedPrice);
    const final = safeNum(j.finalPrice);

    let d = 0;
    if (trackDiscountLoss && j.status === "Won" && quoted > final) {
      d = quoted - final;
      discountTotal += d;
      addBiz(j.user, d);
    }

    let m = 0;
    if (trackMarginDrop && j.status === "Won") {
      if (safeNum(j.marginLossAmount) > 0) {
        m = safeNum(j.marginLossAmount);
      } else if (quoted > 0 && final > 0 && targetProfitMargin > 0 && minimumMarginAllowed > 0) {
        const assumedCost = quoted * (1 - targetProfitMargin / 100);
        const profitActual = final - assumedCost;
        const profitRequired = final * (minimumMarginAllowed / 100);
        if (profitActual < profitRequired) m = Math.max(0, profitRequired - profitActual);
      }

      if (m > 0) {
        marginTotal += m;
        addBiz(j.user, m);
      }
    }
  }

  // REWORK
  for (const x of incidents) {
    const u = userIndex.get(String(x.userId));
    if (!u) continue;

    if (!u.onboardingCompleted) continue;

    const rules = u.onboarding?.rules || {};
    const trackReworkCost = !!rules.trackReworkCost;

    if (!trackReworkCost) continue;

    const loss = safeNum(x.loss);
    if (loss > 0) {
      reworkTotal += loss;
      addBiz(x.userId, loss);
    }
  }

  const total = discountTotal + reworkTotal + marginTotal;

  // Build business rows
  const byBusiness = Object.entries(businessLeakMap)
    .map(([userId, leakage]) => {
      const u = userIndex.get(String(userId));
      return {
        userId,
        businessName: u?.businessName || u?.settings?.business?.companyName || "Unassigned",
        ownerName: u?.fullName || "Unknown",
        ownerEmail: u?.email || "",
        leakage: Math.round(leakage),
        createdAt: u?.createdAt,
      };
    })
    .sort((a, b) => b.leakage - a.leakage);

  return {
    totals: {
      discount: Math.round(discountTotal),
      rework: Math.round(reworkTotal),
      marginLoss: Math.round(marginTotal),
      totalLeakage: Math.round(total),
    },
    byBusiness,
  };
}

/**
 * ✅ GET /api/admin/analytics/revenue?month=YYYY-MM
 * If month not provided => uses current month (for change calc + range).
 * You can change to "all-time" by removing date filtering below.
 */
exports.getAdminRevenueAnalytics = async (req, res) => {
  try {
    // ✅ (Optional) protect this route with your admin auth middleware
    // Example: if (!req.admin) return res.status(401).json({ success:false, message:"Unauthorized" });

    const range = parseMonthRange(req.query.month);

    // ✅ FIXED SELECT (NO PATH COLLISION)
    // We select ONLY the exact nested fields we need — not onboarding.rules as a whole.
    const users = await User.find({ onboardingCompleted: true })
      .select([
        "fullName",
        "businessName",
        "email",
        "createdAt",
        "onboardingCompleted",
        "onboarding.business.currency",
        "onboarding.business.targetProfitMargin",
        "onboarding.rules.trackDiscountLoss",
        "onboarding.rules.trackMarginDrop",
        "onboarding.rules.trackReworkCost",
        "onboarding.rules.minimumMarginAllowed",
        "settings.business.companyName",
      ].join(" "))
      .lean();

    // Current month metrics
    const current = await computeLeakageForUsers(users, { from: range.from, to: range.to });

    // Previous month metrics (for % change)
    const prev = await computeLeakageForUsers(users, { from: range.prevFrom, to: range.prevTo });

    const total = current.totals.totalLeakage;
    const prevTotal = prev.totals.totalLeakage;

    const changePct =
      prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 1000) / 10 : 0; // 1 decimal

    const totalBusinesses = users.length || 1;
    const avgLeakagePerBusiness = Math.round(total / totalBusinesses);

    // Breakdown for pie
    const breakdown = [
      { name: "Discounts", value: current.totals.discount },
      { name: "Rework", value: current.totals.rework },
      { name: "Margin Loss", value: current.totals.marginLoss },
    ];

    // Top leakage type
    const topType = breakdown.slice().sort((a, b) => b.value - a.value)[0] || { name: "None", value: 0 };
    const topTypePercent = total > 0 ? Math.round((topType.value / total) * 100) : 0;

    // Top leaking businesses (bar chart) - take top 5
    const topBusinesses = current.byBusiness.slice(0, 5).map((b) => ({
      business: b.businessName,
      leakage: b.leakage,
    }));

    // ✅ Feature adoption (placeholder until you add real tracking)
    // Later: store usage events and compute from DB.
    const featureUsage = [
      { feature: "Rules Engine", usage: 89 },
      { feature: "PDF Reports", usage: 72 },
      { feature: "Drill-down Analytics", usage: 58 },
      { feature: "Team Access", usage: 45 },
      { feature: "API Integration", usage: 32 },
    ];

    return res.status(200).json({
      success: true,
      month: { key: range.key, from: range.from.toISOString(), to: range.to.toISOString() },

      totals: {
        totalLeakageTracked: total,
        avgLeakagePerBusiness,
        changePctFromLastMonth: changePct, // +5.2% etc
      },

      topLeakageType: {
        name: topType.name,
        percent: topTypePercent,
      },

      leakageByType: breakdown, // pie data
      topLeakingBusinesses: topBusinesses, // bar data
      featureUsage,
    });
  } catch (err) {
    console.error("ADMIN REVENUE ANALYTICS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error loading admin revenue analytics.",
      error: err.message,
    });
  }
};

