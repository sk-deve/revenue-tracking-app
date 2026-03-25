const Job = require("../models/Job");
const ReworkIncident = require("../models/ReworkIncident");
const User = require("../models/User");

// helpers
const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfNextMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1);

// nice id to show in UI (until you store real jobRef in Job model)
const shortJobId = (job) => {
  // if your Job schema has jobRef/jobNumber, use it here:
  if (job.jobRef) return job.jobRef;
  if (job.jobNumber) return job.jobNumber;
  return "J-" + String(job._id).slice(-4).toUpperCase();
};

// GET /api/alerts/overview?limit=25
exports.getOverview = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(Number(req.query.limit || 25), 100);

    const user = await User.findById(userId).select(
      "onboardingCompleted onboarding.rules onboarding.business notificationsEnabled email"
    );
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    if (!user.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: "Onboarding not completed.",
        code: "ONBOARDING_REQUIRED",
      });
    }

    const rules = user.onboarding?.rules || {};
    const maxDiscountAllowed = safeNum(rules.maxDiscountAllowed);
    const minimumMarginAllowed = safeNum(rules.minimumMarginAllowed);

    const trackDiscountLoss = !!rules.trackDiscountLoss;
    const trackReworkCost = !!rules.trackReworkCost;
    const trackMarginDrop = !!rules.trackMarginDrop;

    const now = new Date();
    const from = startOfMonth(now);
    const to = startOfNextMonth(now);

    // load this month data
    const [jobs, incidents] = await Promise.all([
      Job.find({ user: userId, createdAt: { $gte: from, $lt: to } })
        .select("_id status quotedPrice finalPrice createdAt jobRef jobNumber")
        .lean(),
      ReworkIncident.find({ userId, date: { $gte: from, $lt: to } })
        .select("_id jobRef loss date reason")
        .lean(),
    ]);

    const alerts = [];

    // 1) High discount alerts
    let highDiscountCount = 0;
    if (trackDiscountLoss && maxDiscountAllowed > 0) {
      for (const j of jobs) {
        if (j.status !== "Won") continue;

        const quoted = safeNum(j.quotedPrice);
        const final = safeNum(j.finalPrice);
        if (!(quoted > 0 && final >= 0 && quoted > final)) continue;

        const discountLoss = quoted - final;
        const pct = (discountLoss / quoted) * 100;

        if (pct > maxDiscountAllowed) {
          highDiscountCount += 1;
          alerts.push({
            type: "discount",
            severity: "high",
            title: "High discount",
            message: `Discount exceeded threshold on ${shortJobId(j)} (${Math.round(pct)}%).`,
            date: j.createdAt,
          });
        }
      }
    }

    // 2) Repeated rework alerts (group by jobRef)
    let repeatedReworkCount = 0;
    if (trackReworkCost) {
      const byJob = new Map();
      for (const x of incidents) {
        const key = (x.jobRef || "").trim();
        if (!key) continue;
        const cur = byJob.get(key) || { count: 0, latest: null };
        cur.count += 1;
        cur.latest = cur.latest ? (new Date(cur.latest) > new Date(x.date) ? cur.latest : x.date) : x.date;
        byJob.set(key, cur);
      }

      for (const [jobRef, info] of byJob.entries()) {
        if (info.count >= 2) {
          repeatedReworkCount += 1;
          alerts.push({
            type: "rework",
            severity: "high",
            title: "Repeated rework",
            message: `Rework repeated on ${jobRef} (${info.count} incidents).`,
            date: info.latest || now,
          });
        }
      }
    }

    // 3) Margin drop alerts (proxy: final/quoted < minimumMarginAllowed)
    // NOTE: This is your same “proxy” logic you used earlier. If later you add real cost/margin, replace this.
    let marginDropCount = 0;
    if (trackMarginDrop && minimumMarginAllowed > 0) {
      for (const j of jobs) {
        if (j.status !== "Won") continue;

        const quoted = safeNum(j.quotedPrice);
        const final = safeNum(j.finalPrice);
        if (!(quoted > 0 && final > 0)) continue;

        const achievedProxy = (final / quoted) * 100;
        if (achievedProxy < minimumMarginAllowed) {
          marginDropCount += 1;
          alerts.push({
            type: "margin",
            severity: "high",
            title: "Margin dropped",
            message: `Margin dropped below minimum on ${shortJobId(j)}.`,
            date: j.createdAt,
          });
        }
      }
    }

    // sort newest first + limit
    alerts.sort((a, b) => new Date(b.date) - new Date(a.date));
    const feed = alerts.slice(0, limit);

    return res.status(200).json({
      success: true,
      range: { from: from.toISOString(), to: to.toISOString() },
      kpis: {
        highDiscountAlerts: highDiscountCount,
        repeatedReworkAlerts: repeatedReworkCount,
        marginDropAlerts: marginDropCount,
      },
      channels: {
        primary: "Email",
        enabled: !!user.notificationsEnabled,
        email: user.email,
        smsWhatsApp: "later",
      },
      feed: feed.map((a) => ({
        type: a.type,
        severity: a.severity,
        title: a.title,
        message: a.message,
        date: a.date,
      })),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error loading alerts.",
      error: err.message,
    });
  }
};

// PUT /api/alerts/settings
exports.updateSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const enabled = !!req.body.notificationsEnabled;

    const user = await User.findByIdAndUpdate(
      userId,
      { notificationsEnabled: enabled },
      { new: true }
    ).select("notificationsEnabled");

    return res.status(200).json({ success: true, notificationsEnabled: !!user.notificationsEnabled });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error saving notification settings.",
      error: err.message,
    });
  }
};
