const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const onboardingRequired = require("../middlewares/onboardingMiddleware");

const jobController = require("../controllers/jobController");
const { createJob, getRecentJobs } = jobController;


// ✅ now register routes
router.post("/", auth, onboardingRequired, createJob);
router.get("/recent", auth, onboardingRequired, getRecentJobs);

module.exports = router;

