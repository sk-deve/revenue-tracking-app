const jwt = require("jsonwebtoken");
const TeamMember = require("../models/TeamMember"); // ✅ add

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const xToken = req.headers["x-auth-token"];

    let token = null;

    if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (xToken && typeof xToken === "string") {
      token = xToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided.",
        code: "NO_TOKEN",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload.",
        code: "BAD_TOKEN",
      });
    }

    // ✅ keep your existing behavior
    req.user = { id: decoded.id };

    // ✅ NEW: workspace owner id for scoping data
    // default = same as user (owner account)
    req.workspaceOwnerId = decoded.ownerId || decoded.workspaceOwnerId || decoded.id;

    // If token doesn't have ownerId, infer it from TeamMember table
    if (!decoded.ownerId && !decoded.workspaceOwnerId) {
      const tm = await TeamMember.findOne({
        userId: decoded.id,
        status: "Active",
      })
        .select("ownerId")
        .lean();

      if (tm?.ownerId) req.workspaceOwnerId = String(tm.ownerId);
    }

    next();
  } catch (err) {
    const isExpired = err?.name === "TokenExpiredError";

    return res.status(401).json({
      success: false,
      message: isExpired ? "Token expired." : "Invalid token.",
      code: isExpired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
    });
  }
};

