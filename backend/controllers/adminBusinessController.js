const User = require("../models/User");

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const normalize = (s = "") => String(s || "").trim();

function isEnterpriseUser(u) {
  const bt = normalize(u?.onboarding?.business?.businessType).toLowerCase();
  const ind = normalize(u?.settings?.business?.industry).toLowerCase();
  return bt.includes("enterprise") || ind.includes("enterprise");
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function endOfToday() {
  const s = startOfToday();
  return new Date(s.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * ✅ GET /api/admin/businesses?search=&page=&limit=
 * Returns list of businesses (users) for Business Management page
 */
exports.listBusinesses = async (req, res) => {
  try {
    const search = normalize(req.query.search || "");
    const page = Math.max(safeNum(req.query.page || 1), 1);
    const limit = Math.min(Math.max(safeNum(req.query.limit || 25), 1), 200);
    const skip = (page - 1) * limit;

    const query = {};

    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [total, rows] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select(
          "businessName fullName email createdAt updatedAt notificationsEnabled onboarding settings"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const businesses = rows.map((u) => {
      const enterprise = isEnterpriseUser(u);

      return {
        id: String(u._id),
        businessName: u.businessName || "Unassigned",
        owner: {
          name: u.fullName || "Owner",
          email: u.email || "",
        },
        plan: enterprise ? "Enterprise" : "Starter", // placeholder until subscription system
        createdAt: u.createdAt,
        lastActivityAt: u.updatedAt,
        status: u.notificationsEnabled === false ? "Disabled" : "Active",
        enterprise,
      };
    });

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      businesses,
    });
  } catch (err) {
    console.error("BUSINESS LIST ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error loading businesses.",
      error: err.message,
    });
  }
};

/**
 * ✅ GET /api/admin/businesses/stats
 * Stats for top cards
 */
exports.getBusinessStats = async (req, res) => {
  try {
    const start = startOfToday();
    const end = endOfToday();

    // total businesses
    const totalBusinessesPromise = User.countDocuments({});

    // disabled businesses = notificationsEnabled false
    const disabledPromise = User.countDocuments({ notificationsEnabled: false });

    // active today = updated today (best signal you have right now)
    const activeTodayPromise = User.countDocuments({
      updatedAt: { $gte: start, $lt: end },
    });

    const [totalBusinesses, disabled, activeToday, allUsers] = await Promise.all([
      totalBusinessesPromise,
      disabledPromise,
      activeTodayPromise,
      // Need enterprise count -> pull minimal fields and calculate
      User.find({})
        .select("onboarding settings")
        .lean(),
    ]);

    const enterprise = allUsers.reduce((acc, u) => acc + (isEnterpriseUser(u) ? 1 : 0), 0);

    return res.status(200).json({
      success: true,
      stats: {
        totalBusinesses,
        activeToday,
        enterprise,
        disabled,
      },
    });
  } catch (err) {
    console.error("BUSINESS STATS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error loading business stats.",
      error: err.message,
    });
  }
};

/**
 * ✅ PATCH /api/admin/businesses/:id/disable
 */
exports.disableBusiness = async (req, res) => {
  try {
    const id = req.params.id;

    const updated = await User.findByIdAndUpdate(
      id,
      { notificationsEnabled: false },
      { new: true }
    ).select("businessName notificationsEnabled");

    if (!updated) {
      return res.status(404).json({ success: false, message: "Business not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Business disabled.",
      business: {
        id: String(updated._id),
        businessName: updated.businessName,
        status: updated.notificationsEnabled === false ? "Disabled" : "Active",
      },
    });
  } catch (err) {
    console.error("DISABLE BUSINESS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error disabling business.",
      error: err.message,
    });
  }
};

/**
 * ✅ PATCH /api/admin/businesses/:id/enable
 */
exports.enableBusiness = async (req, res) => {
  try {
    const id = req.params.id;

    const updated = await User.findByIdAndUpdate(
      id,
      { notificationsEnabled: true },
      { new: true }
    ).select("businessName notificationsEnabled");

    if (!updated) {
      return res.status(404).json({ success: false, message: "Business not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Business enabled.",
      business: {
        id: String(updated._id),
        businessName: updated.businessName,
        status: updated.notificationsEnabled === false ? "Disabled" : "Active",
      },
    });
  } catch (err) {
    console.error("ENABLE BUSINESS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error enabling business.",
      error: err.message,
    });
  }
};
