const router = require("express").Router();
const { getInsightsOverview } = require("../controllers/insightsController");
const auth = require("../middlewares/authMiddleware");


router.get("/overview", auth, getInsightsOverview);

module.exports = router;
