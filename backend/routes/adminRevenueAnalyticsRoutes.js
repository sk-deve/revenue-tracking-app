const router = require("express").Router();
const { getAdminRevenueAnalytics } = require("../controllers/adminRevenueAnalyticsController");
// const { adminAuth } = require("../middleware/adminAuth");

router.get("/analytics/revenue", /* adminAuth, */ getAdminRevenueAnalytics);

module.exports = router;

