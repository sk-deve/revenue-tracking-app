// controllers/dashboardController.js

const Job = require("../models/Job");
const User = require("../models/User");
const ReworkIncident = require("../models/ReworkIncident");
const mongoose = require("mongoose"); // ✅ IMPORTANT for aggregation ObjectId casting

// helpers
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfNextMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1);

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const percent = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

// ✅ NEW helper: build table rows for Jobs Affected section (discount + rework)
const buildAffectedJobsRows = ({ jobs = [], reworkIncidents = [] }) => {
  const rows = [];

  // --- Discount affected jobs (Won jobs where quoted > final)
  for (const j of jobs) {
    const quoted = safeNum(j.quotedPrice);
    const final = safeNum(j.finalPrice);

    if (j.status === "Won" && quoted > 0 && final >= 0 && quoted > final) {
      const loss = quoted - final;

      rows.push({
        id: String(j._id),
        jobRef: `JOB-${String(j._id).slice(-6).toUpperCase()}`,
        details: (j.service || j.clientName || "Discount applied").trim(),
        type: "Discount",
        leakage: Math.round(loss),
        status: j.status,
        createdAt: j.createdAt || j.date || new Date().toISOString(),
      });
    }
  }

  // --- Rework affected jobs (from incidents)
  for (const r of reworkIncidents) {
    const loss = safeNum(r.loss);
    if (loss > 0) {
      rows.push({
        id: `rework:${String(r._id)}`,
        jobRef: (r.jobRef || "—").trim(),
        details: (r.reason || "Rework").trim(),
        type: "Rework",
        leakage: Math.round(loss),
        status: "Rework",
        createdAt: r.date || r.createdAt || new Date().toISOString(),
      });
    }
  }

  // newest first + keep top 6 (dashboard table size)
  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return rows.slice(0, 6);
};

exports.getOverview = async (req, res) => {
  try {
    /**
     * ✅ IMPORTANT
     * - req.user.id = logged in user (owner OR team member)
     * - req.workspaceOwnerId = workspace owner (must be added in auth middleware)
     *
     * Fallback safe: if middleware not updated yet, it becomes owner flow
     */
    const workspaceOwnerId = req.workspaceOwnerId || req.user.id;

    // ✅ Aggregation does NOT auto-cast types → force ObjectId for $match
    const ownerObjectId = mongoose.Types.ObjectId.isValid(workspaceOwnerId)
      ? new mongoose.Types.ObjectId(workspaceOwnerId)
      : workspaceOwnerId;

    // ✅ Always load onboarding from the WORKSPACE OWNER (not the team member)
    const ownerUser = await User.findById(workspaceOwnerId).select(
      "onboardingCompleted onboarding.business onboarding.rules"
    );

    if (!ownerUser) {
      return res.status(404).json({ success: false, message: "Workspace owner not found." });
    }

    if (!ownerUser.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: "Onboarding not completed.",
        code: "ONBOARDING_REQUIRED",
      });
    }

    const business = ownerUser.onboarding?.business || {};
    const rules = ownerUser.onboarding?.rules || {};

    const currency = business.currency || "USD";
    const laborCostPerHour = safeNum(business.laborCostPerHour);
    const targetProfitMargin = safeNum(business.targetProfitMargin);
    const maxDiscountAllowed = safeNum(rules.maxDiscountAllowed);
    const minimumMarginAllowed = safeNum(rules.minimumMarginAllowed);

    // toggles (still used for warnings + optional leakage logic)
    const trackDiscountLoss = !!rules.trackDiscountLoss;
    const trackMarginDrop = !!rules.trackMarginDrop;
    const trackReworkCost = !!rules.trackReworkCost;
    const trackLostQuotes = !!rules.trackLostQuotes;

    // range (default this month)
    const now = new Date();
    const thisFrom = startOfMonth(now);
    const thisTo = startOfNextMonth(now);

    // last month range
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    const lastFrom = startOfMonth(lastMonthDate);
    const lastTo = startOfNextMonth(lastMonthDate);

    /**
     * ✅ Jobs belong to the WORKSPACE (owner user id stored in Job.user)
     * So team members should query using workspaceOwnerId
     */
    const [thisJobs, lastJobs] = await Promise.all([
      Job.find({ user: workspaceOwnerId, createdAt: { $gte: thisFrom, $lt: thisTo } }).lean(),
      Job.find({ user: workspaceOwnerId, createdAt: { $gte: lastFrom, $lt: lastTo } }).lean(),
    ]);

    // ✅ recent jobs (last 5) for dashboard "Recent activity"
    const recentJobs = await Job.find({ user: workspaceOwnerId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("_id status quotedPrice finalPrice leakageAmount discountReason createdAt")
      .lean();

    /**
     * ✅ ALWAYS compute rework totals from ReworkIncident
     * Fixes:
     * 1) Previously gated by trackReworkCost → returned 0
     * 2) Aggregation needs ObjectId casting → returned 0
     */
    const [thisReworkAgg, lastReworkAgg] = await Promise.all([
      ReworkIncident.aggregate([
        { $match: { userId: ownerObjectId, date: { $gte: thisFrom, $lt: thisTo } } },
        { $group: { _id: null, totalLoss: { $sum: "$loss" }, count: { $sum: 1 } } },
      ]),
      ReworkIncident.aggregate([
        { $match: { userId: ownerObjectId, date: { $gte: lastFrom, $lt: lastTo } } },
        { $group: { _id: null, totalLoss: { $sum: "$loss" }, count: { $sum: 1 } } },
      ]),
    ]);

    const thisReworkLoss = safeNum(thisReworkAgg?.[0]?.totalLoss);
    const thisReworkCount = safeNum(thisReworkAgg?.[0]?.count);

    const lastReworkLoss = safeNum(lastReworkAgg?.[0]?.totalLoss);
    const lastReworkCount = safeNum(lastReworkAgg?.[0]?.count);

    // ✅ NEW: load a few incidents for the Jobs Affected table (light query)
    const thisMonthReworks = await ReworkIncident.find({
      userId: ownerObjectId,
      date: { $gte: thisFrom, $lt: thisTo },
    })
      .select("_id jobRef loss reason date createdAt")
      .sort({ date: -1, createdAt: -1 })
      .limit(20)
      .lean();

    // compute leakage for a list of jobs (rework injected from incidents)
    const compute = (jobs, reworkLossFromIncidents = 0, reworkCountFromIncidents = 0) => {
      let discountLeakage = 0;
      let reworkLeakage = 0;
      let marginLossLeakage = 0;
      let lostQuotesLeakage = 0;

      const jobsAffectedSet = new Set();

      // warnings counters
      let highDiscountCount = 0;
      let repeatedReworkCount = 0;

      for (const j of jobs) {
        const expectedPrice = safeNum(j.quotedPrice);
        const finalPrice = safeNum(j.finalPrice);

        // DISCOUNT leakage
        let dLeak = 0;
        if (trackDiscountLoss && j.status === "Won") {
          if (expectedPrice > 0 && finalPrice >= 0 && expectedPrice > finalPrice) {
            dLeak = expectedPrice - finalPrice;
          }
          discountLeakage += dLeak;

          const discPct = expectedPrice > 0 ? (dLeak / expectedPrice) * 100 : 0;
          if (maxDiscountAllowed > 0 && discPct > maxDiscountAllowed) {
            highDiscountCount += 1;
          }
        }

        // MARGIN LOSS leakage (proxy)
        let mLeak = 0;
        if (trackMarginDrop && j.status === "Won") {
          if (minimumMarginAllowed > 0 && expectedPrice > 0 && finalPrice > 0) {
            const achievedMarginProxy = (finalPrice / expectedPrice) * 100;

            if (achievedMarginProxy < minimumMarginAllowed) {
              const targetProfit = expectedPrice * (targetProfitMargin / 100);
              const minProfitGoal = finalPrice * (minimumMarginAllowed / 100);

              mLeak = Math.max(0, targetProfit - minProfitGoal);
              marginLossLeakage += mLeak;
            }
          }
        }

        // LOST QUOTES leakage
        let lqLeak = 0;
        if (trackLostQuotes && j.status === "Lost" && expectedPrice > 0) {
          lqLeak = expectedPrice * (targetProfitMargin / 100);
          lostQuotesLeakage += lqLeak;
        }

        const anyLeak = dLeak > 0 || mLeak > 0 || lqLeak > 0;
        if (anyLeak) jobsAffectedSet.add(String(j._id));
      }

      // ✅ ALWAYS apply rework totals from incidents
      reworkLeakage = safeNum(reworkLossFromIncidents);
      repeatedReworkCount = safeNum(reworkCountFromIncidents);

      const totalLeakage = discountLeakage + reworkLeakage + marginLossLeakage + lostQuotesLeakage;

      return {
        totalLeakage,
        discountLeakage,
        reworkLeakage,
        marginLossLeakage,
        lostQuotesLeakage,
        // ✅ jobsAffected includes rework incidents too
        jobsAffected: jobsAffectedSet.size + repeatedReworkCount,
        warningCounts: {
          highDiscountCount,
          repeatedReworkCount,
        },
      };
    };

    const thisComputed = compute(thisJobs, thisReworkLoss, thisReworkCount);
    const lastComputed = compute(lastJobs, lastReworkLoss, lastReworkCount);

    // KPI delta
    const deltaAmount = thisComputed.totalLeakage - lastComputed.totalLeakage;
    const deltaPercent =
      lastComputed.totalLeakage > 0 ? (deltaAmount / lastComputed.totalLeakage) * 100 : 0;

    const direction = deltaAmount <= 0 ? "down" : "up";

    // Breakdown
    const total = thisComputed.totalLeakage;
    const breakdown = [
      { key: "discount", label: "Discounts", amount: Math.round(thisComputed.discountLeakage) },
      { key: "rework", label: "Rework", amount: Math.round(thisComputed.reworkLeakage) },
      { key: "marginLoss", label: "Margin loss", amount: Math.round(thisComputed.marginLossLeakage) },
    ].map((b) => ({ ...b, percent: percent(b.amount, total) }));

    // Warnings array (respect toggle for warnings only)
    const warnings = [];
    if (trackDiscountLoss && thisComputed.warningCounts.highDiscountCount >= 2) {
      warnings.push({
        id: "high-discount-usage",
        severity: "high",
        title: "High discount usage",
        message: "Discounts exceeded your max threshold multiple times.",
        count: thisComputed.warningCounts.highDiscountCount,
      });
    }
    if (trackReworkCost && thisComputed.warningCounts.repeatedReworkCount >= 2) {
      warnings.push({
        id: "repeated-rework",
        severity: "high",
        title: "Repeated rework",
        message: "Multiple jobs show rework incidents this month.",
        count: thisComputed.warningCounts.repeatedReworkCount,
      });
    }

    // Counts
    const counts = {
      totalThisMonth: thisJobs.length,
      wonThisMonth: thisJobs.filter((j) => j.status === "Won").length,
      lostThisMonth: thisJobs.filter((j) => j.status === "Lost").length,
      discountedWonThisMonth: thisJobs.filter((j) => {
        if (j.status !== "Won") return false;
        const q = safeNum(j.quotedPrice);
        const f = safeNum(j.finalPrice);
        return q > 0 && f >= 0 && q > f;
      }).length,
    };

    // ✅ NEW: rows for JobsAffected table (does NOT break old UI)
    const affectedJobs = buildAffectedJobsRows({
      jobs: thisJobs,
      reworkIncidents: thisMonthReworks,
    });

    return res.status(200).json({
      success: true,
      range: { key: "thisMonth", from: thisFrom.toISOString(), to: thisTo.toISOString() },
      currency,

      scope: {
        workspaceOwnerId,
        viewerUserId: req.user.id,
      },

      kpis: {
        totalLeakage: {
          amount: Math.round(thisComputed.totalLeakage),
          deltaVsLastMonth: {
            amount: Math.round(deltaAmount),
            direction,
            percent: Number(deltaPercent.toFixed(1)),
          },
        },
        jobsAffected: { count: thisComputed.jobsAffected, note: "Won + Lost + Rework incidents included" },
        discountLeakage: { amount: Math.round(thisComputed.discountLeakage), note: "From discount loss" },
        reworkLeakage: { amount: Math.round(thisComputed.reworkLeakage), note: "From rework incidents" },
        marginLossLeakage: { amount: Math.round(thisComputed.marginLossLeakage), note: "From low profit margin" },
      },

      breakdown,
      warnings,

      trend: {
        thisMonth: { amount: Math.round(thisComputed.totalLeakage) },
        lastMonth: { amount: Math.round(lastComputed.totalLeakage) },
        delta: { amount: Math.round(deltaAmount), percent: Number(deltaPercent.toFixed(1)) },
      },

      counts,

      // ✅ keep your existing recent activity output (unchanged)
      recent: {
        jobs: recentJobs.map((j) => ({
          id: j._id,
          status: j.status,
          quoted: safeNum(j.quotedPrice),
          final: j.status === "Lost" ? null : safeNum(j.finalPrice),
          leakage: j.status === "Lost" ? null : safeNum(j.leakageAmount),
          reason: j.discountReason || null,
          createdAt: j.createdAt,
        })),
      },

      // ✅ NEW field (safe): Dashboard can use this to render the Jobs Affected table
      affectedJobs,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error loading dashboard overview.",
      error: err.message,
    });
  }
};



