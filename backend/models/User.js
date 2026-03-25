const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    serviceName: { type: String, trim: true, default: "" },
    expectedPrice: { type: Number, default: 0 },
    expectedMargin: { type: Number, default: 0 },
    typicalUpsells: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const onboardingSchema = new mongoose.Schema(
  {
    business: {
      businessType: { type: String, trim: true, default: "Auto Repair / Shop" },
      currency: { type: String, trim: true, default: "USD" },
      laborCostPerHour: { type: Number, default: 0 },
      targetProfitMargin: { type: Number, default: 0 },
      overheadAvg: { type: Number, default: 0 },
    },
    rules: {
      trackDiscountLoss: { type: Boolean, default: true },
      trackMarginDrop: { type: Boolean, default: true },
      trackReworkCost: { type: Boolean, default: true },
      trackLostQuotes: { type: Boolean, default: false },
      maxDiscountAllowed: { type: Number, default: 0 },
      minimumMarginAllowed: { type: Number, default: 0 },
    },
    services: { type: [serviceSchema], default: [] },
  },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    business: {
      companyName: { type: String, trim: true, default: "" },
      industry: { type: String, trim: true, default: "" },
      defaultHourlyRate: { type: Number, default: 0 },
      currencyLabel: { type: String, trim: true, default: "USD ($)" },
    },

    leakageRules: {
      discountAlertThreshold: { type: Number, default: 15 },
      reworkAlertThreshold: { type: Number, default: 3 },
      marginDropAlert: { type: Number, default: 5 },
    },

    notificationPrefs: {
      highDiscountAlerts: { type: Boolean, default: true },
      reworkIncidentAlerts: { type: Boolean, default: true },
      weeklyLeakageSummary: { type: Boolean, default: true },
      monthlyReports: { type: Boolean, default: false },
      teamActivity: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    businessName: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    password: { type: String, required: true },
    acceptTerms: { type: Boolean, required: true, default: false },

    onboarding: { type: onboardingSchema, default: () => ({}) },
    onboardingCompleted: { type: Boolean, default: false },
    notificationsEnabled: { type: Boolean, default: true },

    // ✅ password reset fields
    resetPasswordTokenHash: { type: String, default: null },
    resetPasswordExpiresAt: { type: Date, default: null },

    // ✅ NEW fields for Settings UI
    phone: { type: String, trim: true, default: "" },
     // ✅ admin dashboard fields (safe defaults)
    lastLoginAt: { type: Date, default: null },

    isSuspended: { type: Boolean, default: false },
    suspendedAt: { type: Date, default: null },
    suspensionReason: { type: String, trim: true, default: "" },

    accountRole: {
      type: String,
      enum: ["Business Owner", "Admin", "Editor", "Viewer"],
      default: "Business Owner",
    },

    settings: { type: settingsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

// ✅ FIXED: use a hook with NO next() to avoid "next is not a function"
userSchema.pre("save", function () {
  // Ensure nested objects exist
  if (!this.settings) this.settings = {};
  if (!this.settings.business) this.settings.business = {};

  // If companyName not set, mirror businessName
  if (!this.settings.business.companyName && this.businessName) {
    this.settings.business.companyName = this.businessName;
  }

  // If currencyLabel not set, derive from onboarding currency
  if (!this.settings.business.currencyLabel) {
    const c = this.onboarding?.business?.currency || "USD";
    this.settings.business.currencyLabel = c === "USD" ? "USD ($)" : c;
  }
});

module.exports = mongoose.model("User", userSchema);



