const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const onboardingRequired = require("../middlewares/onboardingMiddleware");
const { getOverview } = require("../controllers/dashboardController");

// GET /api/dashboard/overview
router.get("/overview", auth, onboardingRequired, getOverview);

module.exports = router;
