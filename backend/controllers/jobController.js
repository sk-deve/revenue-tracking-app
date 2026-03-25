const Job = require("../models/Job");
const User = require("../models/User");
const Notification = require("../models/Notification");


const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Compute leakage using onboarding rules (v1)
const computeLeakage = ({ quotedPrice, finalPrice, status }) => {
  // v1 leakage: discount loss only
  if (status !== "Won") return 0;

  const q = safeNum(quotedPrice);
  const f = safeNum(finalPrice);

  if (q > 0 && f >= 0 && q > f) return q - f;
  return 0;
};

// POST /api/jobs
exports.createJob = async (req, res) => {
  try {
    /**
     * ✅ IMPORTANT
     * workspaceOwnerId is set by auth middleware for team members
     * fallback keeps owner flow working even if middleware missing
     */
    const workspaceOwnerId = req.workspaceOwnerId || req.user.id;

    const {
      // ✅ NEW fields (Quotes & Jobs form)
      clientName,
      service,

      // ✅ Existing
      quotedPrice,
      finalPrice,
      discountReason,
      status,
      notes,
      date,
    } = req.body;

    // ✅ NEW validations (based on your new form fields)
    if (!clientName || String(clientName).trim() === "") {
      return res.status(400).json({ success: false, message: "Client name is required." });
    }
    if (!service || String(service).trim() === "") {
      return res.status(400).json({ success: false, message: "Service is required." });
    }

    if (quotedPrice === undefined || quotedPrice === null || String(quotedPrice).trim() === "") {
      return res.status(400).json({ success: false, message: "Quoted price is required." });
    }

    const st = status === "Lost" ? "Lost" : "Won";

    if (
      st === "Won" &&
      (finalPrice === undefined || finalPrice === null || String(finalPrice).trim() === "")
    ) {
      return res.status(400).json({
        success: false,
        message: "Final price is required for Won jobs.",
      });
    }

    // ✅ onboarding check MUST be against WORKSPACE OWNER (not the invited member)
    const owner = await User.findById(workspaceOwnerId).select("onboardingCompleted onboarding");
    if (!owner) return res.status(404).json({ success: false, message: "Workspace owner not found." });

    if (!owner.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: "Onboarding not completed.",
        code: "ONBOARDING_REQUIRED",
      });
    }

    // ✅ pull rules safely for notifications
    const rules = owner.onboarding?.rules || {};
    const trackDiscountLoss = !!rules.trackDiscountLoss;
    const maxDiscountAllowed = safeNum(rules.maxDiscountAllowed);

    const jobData = {
      // ✅ store job under workspace owner so ALL team sees same jobs
      user: workspaceOwnerId,

      // ✅ NEW saved fields
      clientName: String(clientName).trim(),
      service: String(service).trim(),

      // ✅ Existing
      quotedPrice: safeNum(quotedPrice),
      status: st,
      discountReason: (discountReason || "").trim(),
      notes: (notes || "").trim(),

      // ✅ controller already uses date sort, so keep it
      date: date ? new Date(date) : new Date(),
    };

    // ✅ Store finalPrice cleanly
    // (Lost = null so UI can display "—" and logic stays consistent)
    jobData.finalPrice = st === "Lost" ? null : safeNum(finalPrice);

    // ✅ Compute leakage and save it to DB (schema must have leakageAmount)
    jobData.leakageAmount = computeLeakage({
      quotedPrice: jobData.quotedPrice,
      finalPrice: jobData.finalPrice,
      status: jobData.status,
    });

    const job = await Job.create(jobData);

    /**
     * ✅ Notifications (do NOT block job save)
     * Create notifications only when:
     * - Won job has discount
     * - discount reason missing
     * - OR discount exceeds maxDiscountAllowed rule
     */
    try {
      if (trackDiscountLoss && job.status === "Won") {
        const q = safeNum(job.quotedPrice);
        const f = safeNum(job.finalPrice);

        if (q > 0 && f >= 0 && q > f) {
          const discountAmount = q - f;
          const discountPct = (discountAmount / q) * 100;

          const reasonMissing = !String(job.discountReason || "").trim();

          // 1) Missing discount reason
          if (reasonMissing) {
            await Notification.create({
              userId: workspaceOwnerId,
              createdBy: req.user?.id || null,
              type: "discount",
              title: "Discount reason missing",
              message: `A ${discountPct.toFixed(1)}% discount was applied without a reason on "${job.service}".`,
              link: "/quotes",
              meta: {
                jobId: job._id,
                service: job.service,
                quotedPrice: q,
                finalPrice: f,
                discountAmount,
                discountPct: Number(discountPct.toFixed(1)),
              },
            });
          }

          // 2) Above max discount rule
          if (maxDiscountAllowed > 0 && discountPct > maxDiscountAllowed) {
            await Notification.create({
              userId: workspaceOwnerId,
              createdBy: req.user?.id || null,
              type: "discount",
              title: "High discount applied",
              message: `Discount ${discountPct.toFixed(
                1
              )}% exceeded your ${maxDiscountAllowed}% rule on "${job.service}".`,
              link: "/discount-tracking",
              meta: {
                jobId: job._id,
                service: job.service,
                discountPct: Number(discountPct.toFixed(1)),
                maxDiscountAllowed,
              },
            });
          }
        }
      }
    } catch (notifyErr) {
      // ✅ never fail the job save because notifications failed
      console.error("NOTIFICATION CREATE ERROR (job):", notifyErr?.message || notifyErr);
    }

    return res.status(201).json({
      success: true,
      message: "Job saved.",
      job,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error saving job.",
      error: err.message,
    });
  }
};




// GET /api/jobs/recent?limit=10
exports.getRecentJobs = async (req, res) => {
  try {
    const workspaceOwnerId = req.workspaceOwnerId || req.user.id;
    const limit = Math.min(Number(req.query.limit || 10), 50);

    const jobs = await Job.find({ user: workspaceOwnerId })
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    const rows = jobs.map((j) => ({
      id: j._id,

      // ✅ NEW fields returned for Quotes & Jobs page
      clientName: j.clientName || "",
      service: j.service || "",

      // ✅ existing fields (keep old names too so nothing breaks)
      status: j.status,
      quoted: safeNum(j.quotedPrice),
      final: j.status === "Lost" ? null : safeNum(j.finalPrice),
      leakage: j.status === "Lost" ? null : safeNum(j.leakageAmount),
      reason: j.discountReason || null,

      // ✅ extra helpful fields (won’t break old frontend)
      quotedPrice: safeNum(j.quotedPrice),
      finalPrice: j.status === "Lost" ? null : safeNum(j.finalPrice),
      leakageAmount: safeNum(j.leakageAmount),
      discountReason: j.discountReason || null,
      notes: j.notes || null,
      date: j.date || j.createdAt,
      createdAt: j.createdAt,
    }));

    return res.status(200).json({
      success: true,
      rows,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error loading jobs.",
      error: err.message,
    });
  }
};
