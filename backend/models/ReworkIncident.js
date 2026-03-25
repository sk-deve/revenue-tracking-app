const mongoose = require("mongoose");

const ReworkIncidentSchema = new mongoose.Schema(
  {
    // ✅ workspace owner id (so team shares same workspace data)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ✅ optional: who actually created it (team member vs owner)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    jobRef: { type: String, required: true, trim: true }, // e.g. JOB-1234
    hours: { type: Number, required: true, min: 0 },
    costPerHour: { type: Number, required: true, min: 0 },

    // ✅ computed: hours * costPerHour
    loss: { type: Number, required: true, min: 0 },

    reason: {
      type: String,
      required: true,
      enum: ["Quality", "Error", "Misquote", "Customer", "Other"],
      default: "Quality",
    },

    // ✅ new UI calls it "Description"
    description: { type: String, default: "", trim: true },

    // ✅ keep notes too (optional), in case you already used it elsewhere
    notes: { type: String, default: "", trim: true },

    date: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReworkIncident", ReworkIncidentSchema);

