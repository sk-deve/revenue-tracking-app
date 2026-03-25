const Job = require("../models/Job");
const ReworkIncident = require("../models/ReworkIncident");
const User = require("../models/User");
const PDFDocument = require("pdfkit");

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
  return { from, to, key: `${year}-${String(month + 1).padStart(2, "0")}` };
}

function addMap(map, key, amount) {
  const k = key && String(key).trim() ? String(key).trim() : "Unassigned";
  map[k] = (map[k] || 0) + safeNum(amount);
}

// ✅ helper: avoid repeating onboarding logic
async function getOwnerOrFail(workspaceOwnerId) {
  const user = await User.findById(workspaceOwnerId).select(
    "onboardingCompleted onboarding.business onboarding.rules"
  );
  return user;
}

// ✅ helper: month label for charts
function monthLabel(fromDate) {
  return fromDate.toLocaleString("en", { month: "short" });
}

/**
 * GET /api/reports/monthly?month=YYYY-MM
 */
exports.getMonthlyReport = async (req, res) => {
  try {
    const workspaceOwnerId = req.workspaceOwnerId || req.user.id;

    const user = await getOwnerOrFail(workspaceOwnerId);
    if (!user) return res.status(404).json({ success: false, message: "Workspace owner not found." });

    if (!user.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: "Onboarding not completed.",
        code: "ONBOARDING_REQUIRED",
      });
    }

    const business = user.onboarding?.business || {};
    const rules = user.onboarding?.rules || {};
    const currency = business.currency || "USD";

    const targetProfitMargin = safeNum(business.targetProfitMargin);
    const minimumMarginAllowed = safeNum(rules.minimumMarginAllowed);

    const trackDiscountLoss = !!rules.trackDiscountLoss;
    const trackReworkCost = !!rules.trackReworkCost;
    const trackMarginDrop = !!rules.trackMarginDrop;

    const { from, to, key } = parseMonthRange(req.query.month);

    const [jobs, incidents] = await Promise.all([
      Job.find({
        user: workspaceOwnerId,
        createdAt: { $gte: from, $lt: to },
      }).lean(),

      ReworkIncident.find({
        userId: workspaceOwnerId,
        date: { $gte: from, $lt: to },
      }).lean(),
    ]);

    let discountTotal = 0;
    let reworkTotal = 0;
    let marginTotal = 0;

    const byService = {};
    const byEmployee = {};

    // JOBS: Discount + Margin
    for (const j of jobs) {
      const quoted = safeNum(j.quotedPrice);
      const final = safeNum(j.finalPrice);

      let d = 0;
      if (trackDiscountLoss && j.status === "Won" && quoted > final) {
        d = quoted - final;
      }

      let m = 0;
      if (trackMarginDrop && j.status === "Won") {
        if (safeNum(j.marginLossAmount) > 0) {
          m = safeNum(j.marginLossAmount);
        } else if (
          quoted > 0 &&
          final > 0 &&
          targetProfitMargin > 0 &&
          minimumMarginAllowed > 0
        ) {
          const assumedCost = quoted * (1 - targetProfitMargin / 100);
          const profitActual = final - assumedCost;
          const profitRequired = final * (minimumMarginAllowed / 100);
          if (profitActual < profitRequired) {
            m = Math.max(0, profitRequired - profitActual);
          }
        }
      }

      discountTotal += d;
      marginTotal += m;

      const leak = d + m;

      // ✅ FIX: pass amount + better fallback keys
      if (leak > 0) {
        const serviceKey = j.serviceName || j.service || "Unassigned";
        const employeeKey = j.employeeName || j.employee || "Unassigned";
        addMap(byService, serviceKey, leak);
        addMap(byEmployee, employeeKey, leak);
      }
    }

    // REWORK
    if (trackReworkCost) {
      for (const x of incidents) {
        const loss = safeNum(x.loss);
        reworkTotal += loss;

        if (loss > 0) {
          const serviceKey = x.serviceName || x.service || "Unassigned";
          const employeeKey = x.employeeName || x.employee || "Unassigned";
          addMap(byService, serviceKey, loss);     // ✅ FIX
          addMap(byEmployee, employeeKey, loss);   // ✅ FIX
        }
      }
    }

    const total = discountTotal + reworkTotal + marginTotal;

    const typeBreakdown = [
      { key: "discount", label: "Discounts", amount: Math.round(discountTotal) },
      { key: "rework", label: "Rework", amount: Math.round(reworkTotal) },
      { key: "marginLoss", label: "Margin loss", amount: Math.round(marginTotal) },
    ].map((t) => ({
      ...t,
      percent: total > 0 ? Math.round((t.amount / total) * 100) : 0,
    }));

    const sortDesc = (a, b) => b.amount - a.amount;

    const byServiceRows = Object.entries(byService)
      .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
      .sort(sortDesc)
      .slice(0, 10);

    const byEmployeeRows = Object.entries(byEmployee)
      .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
      .sort(sortDesc)
      .slice(0, 10);

    const biggest = typeBreakdown.slice().sort((a, b) => b.amount - a.amount)[0];

    const insights = [
      {
        title: biggest?.label || "No data",
        message: biggest?.amount > 0 ? "are the biggest leakage source this month." : "No leakage logged this month.",
      },
      {
        title: "Rework",
        message: reworkTotal > 0 ? "is trending up in logged incidents." : "is not logged this month.",
      },
      {
        title: "Margin loss",
        message: marginTotal > 0 ? "spikes when pricing is undercut." : "is not detected this month.",
      },
    ];

    return res.status(200).json({
      success: true,
      currency,
      month: { key, from: from.toISOString(), to: to.toISOString() },
      totals: {
        totalLeakage: Math.round(total),
        discount: Math.round(discountTotal),
        rework: Math.round(reworkTotal),
        marginLoss: Math.round(marginTotal),
      },
      typeBreakdown,
      byService: byServiceRows,
      byEmployee: byEmployeeRows,
      insights,
    });
  } catch (err) {
    console.error("LEAKAGE REPORT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error loading monthly report.",
      error: err.message,
    });
  }
};

/**
 * ✅ NEW: GET /api/reports/trend?months=6
 * Returns data in your frontend shape:
 * [{ month: "Jul", discounts, rework, margin }]
 */
exports.getTrendReport = async (req, res) => {
  try {
    const workspaceOwnerId = req.workspaceOwnerId || req.user.id;

    const user = await getOwnerOrFail(workspaceOwnerId);
    if (!user) return res.status(404).json({ success: false, message: "Workspace owner not found." });

    if (!user.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: "Onboarding not completed.",
        code: "ONBOARDING_REQUIRED",
      });
    }

    const business = user.onboarding?.business || {};
    const rules = user.onboarding?.rules || {};
    const currency = business.currency || "USD";

    const targetProfitMargin = safeNum(business.targetProfitMargin);
    const minimumMarginAllowed = safeNum(rules.minimumMarginAllowed);

    const trackDiscountLoss = !!rules.trackDiscountLoss;
    const trackReworkCost = !!rules.trackReworkCost;
    const trackMarginDrop = !!rules.trackMarginDrop;

    const months = Math.min(Math.max(Number(req.query.months || 6), 1), 24);

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    const points = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(start.getFullYear(), start.getMonth() - i, 1);
      const from = new Date(d.getFullYear(), d.getMonth(), 1);
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      const [jobs, incidents] = await Promise.all([
        Job.find({ user: workspaceOwnerId, createdAt: { $gte: from, $lt: to } }).lean(),
        ReworkIncident.find({ userId: workspaceOwnerId, date: { $gte: from, $lt: to } }).lean(),
      ]);

      let discountTotal = 0;
      let reworkTotal = 0;
      let marginTotal = 0;

      for (const j of jobs) {
        const quoted = safeNum(j.quotedPrice);
        const final = safeNum(j.finalPrice);

        if (trackDiscountLoss && j.status === "Won" && quoted > final) {
          discountTotal += quoted - final;
        }

        if (trackMarginDrop && j.status === "Won") {
          if (safeNum(j.marginLossAmount) > 0) {
            marginTotal += safeNum(j.marginLossAmount);
          } else if (
            quoted > 0 &&
            final > 0 &&
            targetProfitMargin > 0 &&
            minimumMarginAllowed > 0
          ) {
            const assumedCost = quoted * (1 - targetProfitMargin / 100);
            const profitActual = final - assumedCost;
            const profitRequired = final * (minimumMarginAllowed / 100);
            if (profitActual < profitRequired) {
              marginTotal += Math.max(0, profitRequired - profitActual);
            }
          }
        }
      }

      if (trackReworkCost) {
        for (const x of incidents) reworkTotal += safeNum(x.loss);
      }

      points.push({
        month: monthLabel(from),
        discounts: Math.round(discountTotal),
        rework: Math.round(reworkTotal),
        margin: Math.round(marginTotal),
        key: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`,
      });
    }

    return res.status(200).json({
      success: true,
      currency,
      months,
      points,
    });
  } catch (err) {
    console.error("LEAKAGE TREND ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error loading trend report.",
      error: err.message,
    });
  }
};


//  * Returns a downloadable PDF of the monthly report
 
exports.downloadMonthlyReportPdf = async (req, res) => {
  try {
    const workspaceOwnerId = req.workspaceOwnerId || req.user.id;

    const user = await getOwnerOrFail(workspaceOwnerId);
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

    const business = user.onboarding?.business || {};
    const rules = user.onboarding?.rules || {};
    const currency = business.currency || "USD";

    const targetProfitMargin = safeNum(business.targetProfitMargin);
    const minimumMarginAllowed = safeNum(rules.minimumMarginAllowed);

    const trackDiscountLoss = !!rules.trackDiscountLoss;
    const trackReworkCost = !!rules.trackReworkCost;
    const trackMarginDrop = !!rules.trackMarginDrop;

    const { from, to, key } = parseMonthRange(req.query.month);

    const [jobs, incidents] = await Promise.all([
      Job.find({
        user: workspaceOwnerId,
        createdAt: { $gte: from, $lt: to },
      }).lean(),

      ReworkIncident.find({
        userId: workspaceOwnerId,
        date: { $gte: from, $lt: to },
      }).lean(),
    ]);

    // ---- SAME calculation logic as getMonthlyReport ----
    let discountTotal = 0;
    let reworkTotal = 0;
    let marginTotal = 0;

    const byService = {};
    const byEmployee = {};

    for (const j of jobs) {
      const quoted = safeNum(j.quotedPrice);
      const final = safeNum(j.finalPrice);

      let d = 0;
      if (trackDiscountLoss && j.status === "Won" && quoted > final) {
        d = quoted - final;
      }

      let m = 0;
      if (trackMarginDrop && j.status === "Won") {
        if (safeNum(j.marginLossAmount) > 0) {
          m = safeNum(j.marginLossAmount);
        } else if (
          quoted > 0 &&
          final > 0 &&
          targetProfitMargin > 0 &&
          minimumMarginAllowed > 0
        ) {
          const assumedCost = quoted * (1 - targetProfitMargin / 100);
          const profitActual = final - assumedCost;
          const profitRequired = final * (minimumMarginAllowed / 100);
          if (profitActual < profitRequired) {
            m = Math.max(0, profitRequired - profitActual);
          }
        }
      }

      discountTotal += d;
      marginTotal += m;

      const leak = d + m;
      if (leak > 0) {
        const serviceKey = j.serviceName || j.service || "Unassigned";
        const employeeKey = j.employeeName || j.employee || "Unassigned";
        addMap(byService, serviceKey, leak);
        addMap(byEmployee, employeeKey, leak);
      }
    }

    if (trackReworkCost) {
      for (const x of incidents) {
        const loss = safeNum(x.loss);
        reworkTotal += loss;

        if (loss > 0) {
          const serviceKey = x.serviceName || x.service || "Unassigned";
          const employeeKey = x.employeeName || x.employee || "Unassigned";
          addMap(byService, serviceKey, loss);
          addMap(byEmployee, employeeKey, loss);
        }
      }
    }

    const total = discountTotal + reworkTotal + marginTotal;

    const typeBreakdown = [
      { key: "discount", label: "Discounts", amount: Math.round(discountTotal) },
      { key: "rework", label: "Rework", amount: Math.round(reworkTotal) },
      { key: "marginLoss", label: "Margin loss", amount: Math.round(marginTotal) },
    ].map((t) => ({
      ...t,
      percent: total > 0 ? Math.round((t.amount / total) * 100) : 0,
    }));

    const sortDesc = (a, b) => b.amount - a.amount;

    const byServiceRows = Object.entries(byService)
      .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
      .sort(sortDesc)
      .slice(0, 10);

    const byEmployeeRows = Object.entries(byEmployee)
      .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
      .sort(sortDesc)
      .slice(0, 10);

    // ---------------- PDF START ----------------
    const filename = `Leakage-Report-${key}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    // Title
    doc.fontSize(20).text("Revenue Leakage Report", { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor("#444").text(`Month: ${key}`);
    doc.text(`Currency: ${currency}`);
    doc.moveDown();

    // Total Leakage
    doc.fillColor("#000").fontSize(16).text(`Total Leakage: ${currency} ${Math.round(total).toLocaleString()}`);
    doc.moveDown();

    // Breakdown cards (simple)
    doc.fontSize(13).text("Monthly Breakdown", { underline: true });
    doc.moveDown(0.5);

    typeBreakdown.forEach((t) => {
      doc.fontSize(12).fillColor("#000").text(
        `${t.label}: ${currency} ${t.amount.toLocaleString()} (${t.percent}%)`
      );
    });

    doc.moveDown();

    // Top leakage by service
    doc.fontSize(13).fillColor("#000").text("Top Leakage by Service", { underline: true });
    doc.moveDown(0.5);

    if (byServiceRows.length === 0) {
      doc.fontSize(12).fillColor("#444").text("No leakage entries for this month.");
    } else {
      byServiceRows.forEach((row, idx) => {
        doc.fontSize(12).fillColor("#000").text(
          `${idx + 1}. ${row.name} — ${currency} ${row.amount.toLocaleString()}`
        );
      });
    }

    doc.moveDown();

    // Top leakage by employee
    doc.fontSize(13).fillColor("#000").text("Top Leakage by Employee", { underline: true });
    doc.moveDown(0.5);

    if (byEmployeeRows.length === 0) {
      doc.fontSize(12).fillColor("#444").text("No leakage entries for this month.");
    } else {
      byEmployeeRows.forEach((row, idx) => {
        doc.fontSize(12).fillColor("#000").text(
          `${idx + 1}. ${row.name} — ${currency} ${row.amount.toLocaleString()}`
        );
      });
    }

    doc.moveDown();
    doc.fontSize(10).fillColor("#777").text(
      "Generated by LeakGuard — Revenue Protection",
      { align: "left" }
    );

    doc.end();
    // ---------------- PDF END ----------------
  } catch (err) {
    console.error("MONTHLY PDF ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error generating PDF report.",
      error: err.message,
    });
  }
};

