const express = require("express");
const router = express.Router();
const { register, login, forgotPassword, resetPassword } = require("../controllers/authController");

// routes
router.post("/register", register);
router.post("/login", login);
// ✅ new reset routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
