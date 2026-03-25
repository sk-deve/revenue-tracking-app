const express = require("express");
const { registerAdmin, loginAdmin } = require("../controllers/adminAuthController");
const router = express.Router();


// ✅ /api/admin/auth/register
router.post("/register", registerAdmin);

// ✅ /api/admin/auth/login
router.post("/login", loginAdmin);

module.exports = router;
