// controllers/profileController.js
const User = require("../models/User");

const safeStr = (v) => String(v ?? "").trim();

const toNum = (v) => {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

// GET /api/profile/me
exports.getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select(
      [
        "fullName",
        "email",
        "phone",
        "accountRole",
        "businessName",
        "businessSettings",
        "leakageRules",
        "notificationPrefs",
        "notificationsEnabled",
        "onboardingCompleted",
      ].join(" ")
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // ✅ Ensure businessSettings.companyName has a value (fallback from businessName)
    const companyName =
      user.businessSettings?.companyName ||
      user.businessName ||
      "";

    return res.status(200).json({
      success: true,
      user: {
        // User Information (UI card 1)
        fullName: user.fullName || "",
        email: user.email,
        phone: user.phone || "",
        role: user.accountRole || "Business Owner",

        // Business Settings (UI card 2)
        businessSettings: {
          companyName,
          industry: user.businessSettings?.industry || "",
          defaultHourlyRate: user.businessSettings?.defaultHourlyRate ?? 0,
          currency: user.businessSettings?.currency || "USD ($)",
        },

        // Leakage Rules (UI card 3)
        leakageRules: {
          discountAlertThreshold: user.leakageRules?.discountAlertThreshold ?? 15,
          reworkAlertThreshold: user.leakageRules?.reworkAlertThreshold ?? 3,
          marginDropAlert: user.leakageRules?.marginDropAlert ?? 5,
        },

        // Notification Preferences (UI card 4)
        notificationsEnabled: !!user.notificationsEnabled,
        notificationPrefs: {
          highDiscountAlerts: !!user.notificationPrefs?.highDiscountAlerts,
          reworkIncidentAlerts: !!user.notificationPrefs?.reworkIncidentAlerts,
          weeklyLeakageSummary: !!user.notificationPrefs?.weeklyLeakageSummary,
          monthlyReports: !!user.notificationPrefs?.monthlyReports,
          teamActivity: !!user.notificationPrefs?.teamActivity,
        },

        onboardingCompleted: !!user.onboardingCompleted,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error loading profile.",
      error: err.message,
    });
  }
};

// PUT /api/profile/me
exports.updateMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      // User Info
      fullName,
      phone,

      // Business Settings
      businessSettings,

      // Leakage Rules
      leakageRules,

      // Notification Preferences
      notificationsEnabled,
      notificationPrefs,

      // (optional) legacy support: allow businessName directly
      businessName,
    } = req.body;

    const update = {};

    // ✅ User Information
    if (typeof fullName === "string") update.fullName = safeStr(fullName);
    if (typeof phone === "string") update.phone = safeStr(phone);

    // ✅ Keep backward compatibility
    if (typeof businessName === "string") update.businessName = safeStr(businessName);

    // ✅ Business Settings
    if (businessSettings && typeof businessSettings === "object") {
      if (typeof businessSettings.companyName === "string") {
        update["businessSettings.companyName"] = safeStr(businessSettings.companyName);
        // keep businessName in sync if you want:
        update.businessName = safeStr(businessSettings.companyName);
      }
      if (typeof businessSettings.industry === "string") {
        update["businessSettings.industry"] = safeStr(businessSettings.industry);
      }
      if (businessSettings.defaultHourlyRate !== undefined) {
        const n = toNum(businessSettings.defaultHourlyRate);
        if (n !== undefined) update["businessSettings.defaultHourlyRate"] = Math.max(0, n);
      }
      if (typeof businessSettings.currency === "string") {
        update["businessSettings.currency"] = safeStr(businessSettings.currency);
      }
    }

    // ✅ Leakage Rules
    if (leakageRules && typeof leakageRules === "object") {
      if (leakageRules.discountAlertThreshold !== undefined) {
        const n = toNum(leakageRules.discountAlertThreshold);
        if (n !== undefined) update["leakageRules.discountAlertThreshold"] = clamp(n, 0, 100);
      }
      if (leakageRules.reworkAlertThreshold !== undefined) {
        const n = toNum(leakageRules.reworkAlertThreshold);
        if (n !== undefined) update["leakageRules.reworkAlertThreshold"] = clamp(n, 0, 999);
      }
      if (leakageRules.marginDropAlert !== undefined) {
        const n = toNum(leakageRules.marginDropAlert);
        if (n !== undefined) update["leakageRules.marginDropAlert"] = clamp(n, 0, 100);
      }
    }

    // ✅ Notification Preferences
    if (typeof notificationsEnabled === "boolean") {
      update.notificationsEnabled = notificationsEnabled;
    }

    if (notificationPrefs && typeof notificationPrefs === "object") {
      const keys = [
        "highDiscountAlerts",
        "reworkIncidentAlerts",
        "weeklyLeakageSummary",
        "monthlyReports",
        "teamActivity",
      ];

      for (const k of keys) {
        if (typeof notificationPrefs[k] === "boolean") {
          update[`notificationPrefs.${k}`] = notificationPrefs[k];
        }
      }
    }

    const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true }).select(
      [
        "fullName",
        "email",
        "phone",
        "accountRole",
        "businessName",
        "businessSettings",
        "leakageRules",
        "notificationPrefs",
        "notificationsEnabled",
        "onboardingCompleted",
      ].join(" ")
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const companyName =
      user.businessSettings?.companyName ||
      user.businessName ||
      "";

    return res.status(200).json({
      success: true,
      message: "Settings updated.",
      user: {
        fullName: user.fullName || "",
        email: user.email,
        phone: user.phone || "",
        role: user.accountRole || "Business Owner",

        businessSettings: {
          companyName,
          industry: user.businessSettings?.industry || "",
          defaultHourlyRate: user.businessSettings?.defaultHourlyRate ?? 0,
          currency: user.businessSettings?.currency || "USD ($)",
        },

        leakageRules: {
          discountAlertThreshold: user.leakageRules?.discountAlertThreshold ?? 15,
          reworkAlertThreshold: user.leakageRules?.reworkAlertThreshold ?? 3,
          marginDropAlert: user.leakageRules?.marginDropAlert ?? 5,
        },

        notificationsEnabled: !!user.notificationsEnabled,
        notificationPrefs: {
          highDiscountAlerts: !!user.notificationPrefs?.highDiscountAlerts,
          reworkIncidentAlerts: !!user.notificationPrefs?.reworkIncidentAlerts,
          weeklyLeakageSummary: !!user.notificationPrefs?.weeklyLeakageSummary,
          monthlyReports: !!user.notificationPrefs?.monthlyReports,
          teamActivity: !!user.notificationPrefs?.teamActivity,
        },

        onboardingCompleted: !!user.onboardingCompleted,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error saving settings.",
      error: err.message,
    });
  }
};


