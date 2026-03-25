const mongoose = require("mongoose");

const teamMemberSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // if invited user already exists in Users collection
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    name: { type: String, trim: true, default: "" },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // ✅ NEW UI ROLES
    // Owner is NOT a TeamMember (it's the workspace owner User)
    role: {
      type: String,
      enum: ["Admin", "Editor", "Viewer"],
      default: "Editor",
    },

    status: {
      type: String,
      enum: ["Invited", "Active", "Disabled", "Expired"],
      default: "Invited",
      index: true,
    },

    invitedAt: { type: Date, default: null },
    joinedAt: { type: Date, default: null },

    lastActiveAt: { type: Date, default: null },

    // invite token data
    inviteTokenHash: { type: String, default: "" },
    inviteExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// prevent duplicates per owner
teamMemberSchema.index({ ownerId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("TeamMember", teamMemberSchema);


