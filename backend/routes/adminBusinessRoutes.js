const express = require("express");
const router = express.Router();

const {
  listBusinesses,
  getBusinessStats,
  disableBusiness,
  enableBusiness,
} = require("../controllers/adminBusinessController");

// ✅ routes
router.get("/", listBusinesses);
router.get("/stats", getBusinessStats);
router.patch("/:id/disable", disableBusiness);
router.patch("/:id/enable", enableBusiness);

module.exports = router;
