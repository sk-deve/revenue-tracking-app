const router = require("express").Router();
const discountController = require("../controllers/discountController");
const auth = require("../middlewares/authMiddleware");

router.get("/", auth, discountController.getDiscountTracking);

module.exports = router;
