const express = require("express");
const router = express.Router();

const requireAdminAuth = require("../middlewares/requireAdminAuth");
const {
  listUsers,
  getUserStats,
  exportUsersCsv,
  suspendUser,
  unsuspendUser,
} = require("../controllers/adminUsersController");

// ✅ Protect everything
router.use(requireAdminAuth);

router.get("/", listUsers);
router.get("/stats", getUserStats);
router.get("/export", exportUsersCsv);

router.patch("/:id/suspend", suspendUser);
router.patch("/:id/unsuspend", unsuspendUser);

module.exports = router;
