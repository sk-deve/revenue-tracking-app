const router = require("express").Router();
const { getOverview, updateSettings } = require("../controllers/alertsController");
const auth = require("../middlewares/authMiddleware");


router.get("/overview", auth, getOverview);
router.put("/settings", auth, updateSettings);

module.exports = router;
