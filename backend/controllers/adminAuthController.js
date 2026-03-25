const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const normalizeEmail = (email = "") => String(email).toLowerCase().trim();

const signAdminToken = (adminId) => {
  return jwt.sign({ id: adminId, type: "admin" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// POST /api/admin/auth/register
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const emailNorm = normalizeEmail(email);

    const exists = await Admin.findOne({ email: emailNorm });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const admin = await Admin.create({
      name: name.trim(),
      email: emailNorm,
      password: hashed,
      role: "admin",
    });

    const token = signAdminToken(admin._id);

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully.",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error during admin registration.",
      error: err.message,
    });
  }
};

// POST /api/admin/auth/login
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const emailNorm = normalizeEmail(email);

    const admin = await Admin.findOne({ email: emailNorm });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "This admin account is disabled.",
      });
    }

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = signAdminToken(admin._id);

    return res.status(200).json({
      success: true,
      message: "Logged in successfully.",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error during admin login.",
      error: err.message,
    });
  }
};
