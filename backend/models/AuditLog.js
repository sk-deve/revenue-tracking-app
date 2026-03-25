const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actorName: { type: String, trim: true, default: "" },

    action: {
      type: String,
      enum: [
        // ✅ TEAM
        "TEAM_INVITED",
        "TEAM_INVITE_RESENT",
        "TEAM_INVITE_ACCEPTED",
        "TEAM_ROLE_CHANGED",
        "TEAM_STATUS_CHANGED",
        "TEAM_REMOVED",

        // ✅ keep your existing actions below (DO NOT REMOVE THEM)
        // example:
        // "DISCOUNT_LOGGED",
        // "REWORK_LOGGED",
        // "RULE_UPDATED",
      ],
      required: true,
      index: true,
    },

    title: { type: String, trim: true, default: "" },
    meta: { type: String, trim: true, default: "" },
    targetMemberId: { type: mongoose.Schema.Types.ObjectId, ref: "TeamMember", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);

