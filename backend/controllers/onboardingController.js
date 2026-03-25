const User = require("../models/User");

// POST /api/onboarding/complete
exports.completeOnboarding = async (req, res) => {
  try {
    const { business, rules, services } = req.body;

    // ✅ validate step 1 required fields
    if (
      !business ||
      !business.businessType ||
      !business.currency ||
      business.laborCostPerHour === undefined ||
      business.targetProfitMargin === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Business setup fields are required.",
      });
    }

    // ✅ validate step 2 required fields
    if (!rules || rules.maxDiscountAllowed === undefined || rules.minimumMarginAllowed === undefined) {
      return res.status(400).json({
        success: false,
        message: "Rules setup fields are required.",
      });
    }

    // services optional
    const normalizedServices = Array.isArray(services)
      ? services
          .filter((s) => s && (s.serviceName || s.expectedPrice || s.expectedMargin || s.typicalUpsells))
          .map((s) => ({
            serviceName: (s.serviceName || "").trim(),
            expectedPrice: Number(s.expectedPrice || 0),
            expectedMargin: Number(s.expectedMargin || 0),
            typicalUpsells: (s.typicalUpsells || "").trim(),
          }))
      : [];

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      {
        onboarding: {
          business: {
            businessType: business.businessType,
            currency: business.currency,
            laborCostPerHour: Number(business.laborCostPerHour || 0),
            targetProfitMargin: Number(business.targetProfitMargin || 0),
            overheadAvg: Number(business.overheadAvg || 0),
          },
          rules: {
            trackDiscountLoss: !!rules.trackDiscountLoss,
            trackMarginDrop: !!rules.trackMarginDrop,
            trackReworkCost: !!rules.trackReworkCost,
            trackLostQuotes: !!rules.trackLostQuotes,
            maxDiscountAllowed: Number(rules.maxDiscountAllowed || 0),
            minimumMarginAllowed: Number(rules.minimumMarginAllowed || 0),
          },
          services: normalizedServices,
        },
        onboardingCompleted: true,
      },
      { new: true }
    ).select("onboardingCompleted onboarding");

    return res.status(200).json({
      success: true,
      message: "Onboarding completed.",
      onboardingCompleted: updated.onboardingCompleted,
      onboarding: updated.onboarding,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error completing onboarding.",
      error: err.message,
    });
  }
};

// GET /api/onboarding/status
exports.getOnboardingStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("onboardingCompleted onboarding");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    return res.status(200).json({
      success: true,
      onboardingCompleted: user.onboardingCompleted,
      onboarding: user.onboarding,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error.", error: err.message });
  }
};
