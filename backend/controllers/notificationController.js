const Notification = require("../models/Notification");

const safeLimit = (v, max = 50, fallback = 20) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
};

// GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    const workspaceOwnerId = req.workspaceOwnerId || req.user.id;

    const count = await Notification.countDocuments({
      userId: workspaceOwnerId,
      isRead: false,
    });

    return res.status(200).json({ success: true, count });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error loading unread notifications count.",
      error: err.message,
    });
  }
};

// GET /api/notifications?limit=20
exports.getNotifications = async (req, res) => {
  try {
    const workspaceOwnerId = req.workspaceOwnerId || req.user.id;
    const limit = safeLimit(req.query.limit, 100, 20);

    const rows = await Notification.find({ userId: workspaceOwnerId })
      .sort({ isRead: 1, createdAt: -1 }) // unread first, newest first
      .limit(limit)
      .lean();

    return res.status(200).json({ success: true, rows });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error loading notifications.",
      error: err.message,
    });
  }
};

// PATCH /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    const workspaceOwnerId = req.workspaceOwnerId || req.user.id;
    const { id } = req.params;

    const updated = await Notification.findOneAndUpdate(
      { _id: id, userId: workspaceOwnerId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    return res.status(200).json({ success: true, notification: updated });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error updating notification.",
      error: err.message,
    });
  }
};

// PATCH /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    const workspaceOwnerId = req.workspaceOwnerId || req.user.id;

    await Notification.updateMany(
      { userId: workspaceOwnerId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error marking all notifications read.",
      error: err.message,
    });
  }
};
