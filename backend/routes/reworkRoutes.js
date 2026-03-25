const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const rework = require("../controllers/reworkController");

router.post("/", auth, rework.createIncident);
router.get("/overview", auth, rework.getOverview);

module.exports = router;
