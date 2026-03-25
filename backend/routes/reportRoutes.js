const router = require("express").Router();
const { getMonthlyReport, getTrendReport, downloadMonthlyReportPdf } = require("../controllers/reportController");
const auth = require("../middlewares/authMiddleware");

router.get("/monthly", auth, getMonthlyReport);
router.get("/trend", auth, getTrendReport);
router.get("/monthly/pdf", auth, downloadMonthlyReportPdf);

module.exports = router;
