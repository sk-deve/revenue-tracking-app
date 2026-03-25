const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("onboardingCompleted");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (!user.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: "Onboarding not completed.",
        code: "ONBOARDING_REQUIRED",
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: "Onboarding check failed.", error: err.message });
  }
};
