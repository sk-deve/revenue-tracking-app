const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ✅ NEW (for Quotes & Jobs form)
    clientName: { type: String, trim: true },
    service: { type: String, trim: true },

    // ✅ Existing
    quotedPrice: { type: Number, required: true },
    finalPrice: { type: Number }, // null/undefined for Lost is fine
    status: {
      type: String,
      enum: ["Won", "Lost"],
      required: true,
    },

    // ✅ IMPORTANT: your controller/dashboard uses this
    leakageAmount: { type: Number, default: 0 },

    // ✅ Optional extra fields (keep if you want)
    discountLeakage: { type: Number, default: 0 },
    marginLoss: { type: Number, default: 0 },
    reworkCost: { type: Number, default: 0 },

    discountReason: { type: String, trim: true },
    notes: { type: String, trim: true },

    // ✅ You are already sorting by date in controller, so store it
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);
