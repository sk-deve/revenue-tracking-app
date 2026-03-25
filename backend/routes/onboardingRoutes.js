const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const { completeOnboarding, getOnboardingStatus } = require("../controllers/onboardingController");


router.get("/status", auth, getOnboardingStatus);
router.post("/complete", auth, completeOnboarding);

module.exports = router;
