const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // ✅ REQUIRED for reset tokens
const User = require("../models/User");
const { sendEmail } = require("../utils/sendEmail");

// helper: sign token (unchanged)
const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const normalizeEmail = (email = "") => String(email).toLowerCase().trim();

// ✅ helper: hash reset token for DB storage
const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

// ------------------------------
// POST /api/auth/register (UNCHANGED LOGIC)
// ------------------------------
exports.register = async (req, res) => {
  try {
    const { fullName, businessName, email, password, acceptTerms } = req.body;

    // basic validation
    if (!fullName || !businessName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required (fullName, businessName, email, password).",
      });
    }

    if (acceptTerms !== true) {
      return res.status(400).json({
        success: false,
        message: "You must accept the terms to register.",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const emailNorm = normalizeEmail(email);

    // check existing
    const existing = await User.findOne({ email: emailNorm });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered.",
      });
    }

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = await User.create({
      fullName: fullName.trim(),
      businessName: businessName.trim(),
      email: emailNorm,
      password: hashed,
      acceptTerms: true,

      // ✅ onboarding defaults (safe even if schema already has defaults)
      onboardingCompleted: false,
    });

    const token = signToken(user._id);

    const onboardingCompleted = !!user.onboardingCompleted;
    const nextRoute = onboardingCompleted ? "/dashboard" : "/onboarding";

    return res.status(201).json({
      success: true,
      message: "Registered successfully.",
      token,
      nextRoute,
      user: {
        id: user._id,
        fullName: user.fullName,
        businessName: user.businessName,
        email: user.email,
        onboardingCompleted,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    // handle unique index error (safety)
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error during registration.",
      error: err.message,
    });
  }
};

// ------------------------------
// POST /api/auth/login (UNCHANGED LOGIC)
// ------------------------------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const emailNorm = normalizeEmail(email);

    const user = await User.findOne({ email: emailNorm });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // ✅ track last login (does not affect login)
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);

    const onboardingCompleted = !!user.onboardingCompleted;
    const nextRoute = onboardingCompleted ? "/dashboard" : "/onboarding";

    return res.status(200).json({
      success: true,
      message: "Logged in successfully.",
      token,
      nextRoute,
      user: {
        id: user._id,
        fullName: user.fullName,
        businessName: user.businessName,
        email: user.email,
        onboardingCompleted,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error during login.",
      error: err.message,
    });
  }
};

// ------------------------------
// POST /api/auth/forgot-password (NEW - FIXED)
// ------------------------------
// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const genericMsg =
      "If an account exists for that email, a reset link has been sent.";

    const emailNorm = normalizeEmail(email);
    if (!emailNorm) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const user = await User.findOne({ email: emailNorm });

    // prevent email enumeration
    if (!user) {
      return res.status(200).json({ success: true, message: genericMsg });
    }

    // Create token (raw token goes to email, hashed stored in DB)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = hashToken(resetToken);

    user.resetPasswordTokenHash = resetTokenHash;
    user.resetPasswordExpiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes
    await user.save();

    const frontendBase = process.env.FRONTEND_URL || "http://localhost:8080";
    const resetLink = `${frontendBase}/reset-password?token=${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.5;">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password.</p>
        <p>
          <a href="${resetLink}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">
            Reset Password
          </a>
        </p>
        <p>This link expires in <b>15 minutes</b>.</p>
        <p>If you didn’t request this, you can ignore this email.</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      html,
    });

    return res.status(200).json({ success: true, message: genericMsg });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    // ✅ if some middleware expects next(), don't crash
    if (typeof next === "function") return next(err);

    return res.status(500).json({
      success: false,
      message: "Server error during forgot password.",
      error: err.message,
    });
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required.",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const tokenHash = hashToken(token);

    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Reset token is invalid or has expired.",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Clear reset fields
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpiresAt = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. Please log in.",
    });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    if (typeof next === "function") return next(err);

    return res.status(500).json({
      success: false,
      message: "Server error during reset password.",
      error: err.message,
    });
  }
};
