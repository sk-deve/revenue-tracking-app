const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    // workspace owner scope (same pattern you use everywhere)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // optional: who caused it (team member)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    type: {
      type: String,
      enum: ["discount", "rework", "rule", "system"],
      default: "system",
    },

    title: { type: String, required: true },
    message: { type: String, required: true },

    // optional: deep link on click
    link: { type: String, default: "" },

    // optional metadata (jobId, jobRef, service, etc.)
    meta: { type: Object, default: {} },

    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// fast unread queries
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
