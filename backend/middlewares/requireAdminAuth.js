const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

module.exports = async function requireAdminAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";

    if (!token) {
      return res.status(401).json({ success: false, message: "Admin token missing." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await Admin.findById(decoded.id).select("email role isActive");
    if (!admin) {
      return res.status(401).json({ success: false, message: "Admin not found." });
    }

    if (!admin.isActive) {
      return res.status(403).json({ success: false, message: "Admin account disabled." });
    }

    req.admin = { id: admin._id, email: admin.email, role: admin.role };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid/expired admin token." });
  }
};
