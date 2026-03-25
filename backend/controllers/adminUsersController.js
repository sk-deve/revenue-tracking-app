const User = require("../models/User");

const safeInt = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfWeek = (d = new Date()) => {
  // week starts Monday
  const day = d.getDay(); // 0 Sun..6 Sat
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
};

// GET /api/admin/users?search=&page=1&limit=20
exports.listUsers = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const page = Math.max(safeInt(req.query.page, 1), 1);
    const limit = Math.min(Math.max(safeInt(req.query.limit, 20), 1), 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { businessName: { $regex: search, $options: "i" } },
      ];
    }

    const [rows, total] = await Promise.all([
      User.find(filter)
        .select("fullName businessName email createdAt lastLoginAt isSuspended suspendedAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // map to frontend-friendly shape
    const users = rows.map((u) => ({
      id: u._id,
      name: u.fullName || "Unnamed",
      email: u.email,
      businessName: u.businessName || "",
      signupDate: u.createdAt,
      lastLoginAt: u.lastLoginAt || null,
      status: u.isSuspended ? "Suspended" : "Active",
    }));

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      users,
    });
  } catch (err) {
    console.error("ADMIN LIST USERS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error loading users.",
      error: err.message,
    });
  }
};

// GET /api/admin/users/stats
exports.getUserStats = async (req, res) => {
  try {
    const today = startOfDay(new Date());
    const week = startOfWeek(new Date());

    const [totalUsers, activeToday, suspended, newThisWeek] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ lastLoginAt: { $gte: today } }),
      User.countDocuments({ isSuspended: true }),
      User.countDocuments({ createdAt: { $gte: week } }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeToday,
        suspended,
        newThisWeek,
      },
    });
  } catch (err) {
    console.error("ADMIN USERS STATS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error loading user stats.",
      error: err.message,
    });
  }
};

// PATCH /api/admin/users/:id/suspend
exports.suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = String(req.body.reason || "").trim();

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    user.isSuspended = true;
    user.suspendedAt = new Date();
    user.suspensionReason = reason;

    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ success: true, message: "User suspended." });
  } catch (err) {
    console.error("ADMIN SUSPEND USER ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error suspending user.", error: err.message });
  }
};

// PATCH /api/admin/users/:id/unsuspend
exports.unsuspendUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    user.isSuspended = false;
    user.suspendedAt = null;
    user.suspensionReason = "";

    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ success: true, message: "User unsuspended." });
  } catch (err) {
    console.error("ADMIN UNSUSPEND USER ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error unsuspending user.", error: err.message });
  }
};

// GET /api/admin/users/export?search=
exports.exportUsersCsv = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();

    const filter = {};
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { businessName: { $regex: search, $options: "i" } },
      ];
    }

    const rows = await User.find(filter)
      .select("fullName businessName email createdAt lastLoginAt isSuspended")
      .sort({ createdAt: -1 })
      .lean();

    // ✅ No extra dependency: manual CSV
    const header = ["Name", "Business", "Email", "SignupDate", "LastLogin", "Status"];
    const lines = [header.join(",")];

    for (const u of rows) {
      const status = u.isSuspended ? "Suspended" : "Active";
      const line = [
        `"${(u.fullName || "").replace(/"/g, '""')}"`,
        `"${(u.businessName || "").replace(/"/g, '""')}"`,
        `"${(u.email || "").replace(/"/g, '""')}"`,
        `"${u.createdAt ? new Date(u.createdAt).toISOString() : ""}"`,
        `"${u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : ""}"`,
        `"${status}"`,
      ].join(",");
      lines.push(line);
    }

    const csv = lines.join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="users-export.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error("ADMIN EXPORT USERS ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error exporting users.", error: err.message });
  }
};
