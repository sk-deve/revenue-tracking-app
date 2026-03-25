const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const TeamMember = require("../models/TeamMember");
const AuditLog = require("../models/AuditLog");
const User = require("../models/User");
const { sendInviteEmail } = require("../utils/mailer");

// ✅ NEW (for Jobs + Leakage columns in new UI)
const Job = require("../models/Job");
const ReworkIncident = require("../models/ReworkIncident");

const safeStr = (v) => String(v || "").trim();
const isEmail = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(v || "")
      .trim()
      .toLowerCase()
  );

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

const safeNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ✅ BACKWARD COMPATIBLE ROLES (old + new UI)
const ROLE_CANON = ["Admin", "Editor", "Viewer"];
const ROLE_LEGACY = ["Manager", "Staff"];
const ROLE_ALL = [...ROLE_CANON, ...ROLE_LEGACY];

function normalizeRole(role) {
  const r = safeStr(role);
  if (!r) return "Editor";
  if (r === "Manager") return "Admin";
  if (r === "Staff") return "Editor";
  if (ROLE_CANON.includes(r)) return r;
  return "Editor";
}

function toLastActiveLabel(dt) {
  if (!dt) return "—";
  const diff = Date.now() - new Date(dt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

async function logAudit({
  ownerId,
  actor,
  action,
  title,
  meta,
  targetMemberId = null,
}) {
  const actorName = safeStr(actor?.fullName) || safeStr(actor?.email) || "User";
  await AuditLog.create({
    ownerId,
    actorId: actor?._id || null,
    actorName,
    action,
    title,
    meta,
    targetMemberId,
  });
}

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfNextMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1);

// ✅ compute Jobs + Leakage for the month (safe even if you don't store member references yet)
async function computeMemberMetrics({ ownerId, memberUserId, from, to }) {
  if (!memberUserId) return { jobs: 0, leakage: 0 };

  // Your Jobs are stored under Job.user = ownerId (workspace owner).
  // For per-member, we try common fields without breaking if they don't exist.
  const jobMatch = {
    user: ownerId,
    createdAt: { $gte: from, $lt: to },
    $or: [
      { createdBy: memberUserId },
      { createdByUserId: memberUserId },
      { assignedTo: memberUserId },
      { assignedToUserId: memberUserId },
      { employeeUserId: memberUserId },
      { userId: memberUserId },
    ],
  };

  const [jobs, reworks] = await Promise.all([
    Job.find(jobMatch)
      .select("status quotedPrice finalPrice leakageAmount marginLossAmount")
      .lean(),

    ReworkIncident.find({
      userId: ownerId,
      date: { $gte: from, $lt: to },
      $or: [
        { createdBy: memberUserId },
        { createdByUserId: memberUserId },
        { employeeUserId: memberUserId },
        { userId: memberUserId },
      ],
    })
      .select("loss")
      .lean(),
  ]);

  let leakage = 0;

  for (const j of jobs) {
    const quoted = safeNum(j.quotedPrice);
    const final = safeNum(j.finalPrice);

    // Discount leakage (Won)
    if (j.status === "Won" && quoted > 0 && final >= 0 && quoted > final) {
      leakage += quoted - final;
    }

    // Direct leakage fields (if exist)
    leakage += Math.max(0, safeNum(j.leakageAmount));
    leakage += Math.max(0, safeNum(j.marginLossAmount));
  }

  for (const r of reworks) {
    leakage += Math.max(0, safeNum(r.loss));
  }

  return { jobs: jobs.length, leakage: Math.round(leakage) };
}

/**
 * GET /api/team/members
 */
exports.getMembers = async (req, res) => {
  try {
    const ownerId = req.user.id;

    const owner = await User.findById(ownerId).select(
      "onboardingCompleted fullName email businessName lastActiveAt"
    );
    if (!owner)
      return res.status(404).json({ success: false, message: "User not found." });

    if (!owner.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: "Onboarding not completed.",
        code: "ONBOARDING_REQUIRED",
      });
    }

    const members = await TeamMember.find({ ownerId })
      .sort({ status: 1, createdAt: -1 })
      .lean();

    // ✅ current month metrics for UI table
    const now = new Date();
    const from = startOfMonth(now);
    const to = startOfNextMonth(now);

    // ✅ owner row (new UI needs owner inside table)
    const ownerMetrics = await computeMemberMetrics({
      ownerId,
      memberUserId: owner._id,
      from,
      to,
    });

    const ownerRow = {
      id: owner._id,
      isOwner: true,
      name: safeStr(owner.fullName) || "Owner",
      email: owner.email,
      role: "Owner",
      roleLabel: "Owner",
      status: "Active",
      jobs: ownerMetrics.jobs,
      leakage: ownerMetrics.leakage,
      lastActive: toLastActiveLabel(owner.lastActiveAt),
      lastActiveAt: owner.lastActiveAt || null,
      invitedAt: null,
      joinedAt: null,
      createdAt: null,
    };

    const memberRows = await Promise.all(
      members.map(async (m) => {
        const metrics = await computeMemberMetrics({
          ownerId,
          memberUserId: m.userId || null,
          from,
          to,
        });

        return {
          id: m._id,
          isOwner: false,
          name: m.name || m.email.split("@")[0],
          email: m.email,

          // keep DB role
          role: m.role,
          // new UI role label
          roleLabel: normalizeRole(m.role),

          status: m.status,

          // ✅ new UI table columns
          jobs: metrics.jobs,
          leakage: metrics.leakage,

          // keep old fields exactly
          lastActive: toLastActiveLabel(m.lastActiveAt),
          lastActiveAt: m.lastActiveAt,
          invitedAt: m.invitedAt,
          joinedAt: m.joinedAt,
          createdAt: m.createdAt,
        };
      })
    );

    return res.status(200).json({ success: true, rows: [ownerRow, ...memberRows] });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error loading team members.",
      error: err.message,
    });
  }
};

/**
 * GET /api/team/stats
 */
exports.getStats = async (req, res) => {
  try {
    const ownerId = req.user.id;

    const owner = await User.findById(ownerId).select("onboardingCompleted lastActiveAt");
    if (!owner)
      return res.status(404).json({ success: false, message: "User not found." });

    if (!owner.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: "Onboarding not completed.",
        code: "ONBOARDING_REQUIRED",
      });
    }

    const all = await TeamMember.find({ ownerId }).select("status role lastActiveAt").lean();

    const active = all.filter((m) => m.status === "Active").length;
    const invited = all.filter((m) => m.status === "Invited").length;

    // ✅ NEW UI stats
    const pendingInvites = invited;

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const membersActiveToday = all.filter(
      (m) => m.lastActiveAt && new Date(m.lastActiveAt) >= start
    ).length;
    const ownerActiveToday =
      owner.lastActiveAt && new Date(owner.lastActiveAt) >= start ? 1 : 0;

    const activeToday = membersActiveToday + ownerActiveToday;

    return res.status(200).json({
      success: true,
      stats: {
        // ✅ include owner for new UI "Total Members" card
        totalMembers: all.length + 1,

        // ✅ keep old fields EXACTLY (compat)
        active,
        invited,
        rolesCount: 3,
        auditTrail: "Enabled",
        security: "RBAC",

        // ✅ added fields (new UI)
        activeToday,
        pendingInvites,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error loading team stats.",
      error: err.message,
    });
  }
};

/**
 * POST /api/team/invite
 */
exports.inviteMember = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { name, email, role } = req.body;

    const owner = await User.findById(ownerId).select(
      "onboardingCompleted fullName email businessName"
    );
    if (!owner)
      return res.status(404).json({ success: false, message: "User not found." });

    if (!owner.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: "Onboarding not completed.",
        code: "ONBOARDING_REQUIRED",
      });
    }

    const cleanEmail = safeStr(email).toLowerCase();
    if (!isEmail(cleanEmail)) {
      return res.status(400).json({ success: false, message: "Valid email is required." });
    }

    const cleanName = safeStr(name);

    // ✅ REPLACED LINE (was Manager/Staff only)
    const cleanRole = ROLE_ALL.includes(role) ? role : "Editor";

    if (cleanEmail === String(owner.email).toLowerCase()) {
      return res.status(400).json({ success: false, message: "You cannot invite your own email." });
    }

    // keep (you had it; not removing)
    await User.findOne({ email: cleanEmail }).select("_id email fullName");

    let created;
    try {
      created = await TeamMember.create({
        ownerId,
        name: cleanName,
        email: cleanEmail,
        role: cleanRole,
        status: "Invited",
        userId: null, // ✅ ALWAYS NULL AT INVITE TIME
        invitedAt: new Date(),
      });
    } catch (e) {
      if (String(e.code) === "11000") {
        return res.status(409).json({
          success: false,
          message: "This email is already invited / added in your team.",
        });
      }
      throw e;
    }

    // token + expiry
    const token = crypto.randomBytes(32).toString("hex");
    created.inviteTokenHash = sha256(token);
    created.inviteExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48); // 48h
    await created.save();

    const acceptUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${token}&owner=${ownerId}&email=${encodeURIComponent(
      cleanEmail
    )}`;

    try {
      await sendInviteEmail({
        to: cleanEmail,
        businessName: owner.businessName || "LeakageTracker",
        inviterName: owner.fullName || owner.email,
        acceptUrl,
      });
    } catch (mailErr) {
      console.error("INVITE MAIL ERROR:", mailErr?.message || mailErr);
    }

    await logAudit({
      ownerId,
      actor: owner,
      action: "TEAM_INVITED",
      title: "Team member invited",
      meta: `${cleanEmail} invited as ${cleanRole}`,
      targetMemberId: created._id,
    });

    return res.status(201).json({
      success: true,
      message: "Invitation created (email sent if SMTP configured).",
      member: {
        id: created._id,
        name: created.name || cleanEmail.split("@")[0],
        email: created.email,
        role: created.role,
        status: created.status,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error inviting member.",
      error: err.message,
    });
  }
};

/**
 * POST /api/team/resend-invite
 * body: { memberId }
 */
exports.resendInvite = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { memberId } = req.body;

    const owner = await User.findById(ownerId).select(
      "onboardingCompleted fullName email businessName"
    );
    if (!owner)
      return res.status(404).json({ success: false, message: "User not found." });

    if (!owner.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: "Onboarding not completed.",
        code: "ONBOARDING_REQUIRED",
      });
    }

    const member = await TeamMember.findOne({ _id: memberId, ownerId });
    if (!member)
      return res.status(404).json({ success: false, message: "Member not found." });

    if (member.status !== "Invited") {
      return res.status(400).json({
        success: false,
        message: "Only invited members can be resent.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    member.inviteTokenHash = sha256(token);
    member.inviteExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48);
    member.invitedAt = new Date();
    await member.save();

    const acceptUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${token}&owner=${ownerId}&email=${encodeURIComponent(
      member.email
    )}`;

    try {
      await sendInviteEmail({
        to: member.email,
        businessName: owner.businessName || "LeakageTracker",
        inviterName: owner.fullName || owner.email,
        acceptUrl,
      });
    } catch (mailErr) {
      console.error("RESEND MAIL ERROR:", mailErr?.message || mailErr);
    }

    await logAudit({
      ownerId,
      actor: owner,
      action: "TEAM_INVITE_RESENT",
      title: "Invite resent",
      meta: `${member.email} invite resent`,
      targetMemberId: member._id,
    });

    return res.status(200).json({
      success: true,
      message: "Invite resent (email sent if SMTP configured).",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error resending invite.",
      error: err.message,
    });
  }
};

/**
 * POST /api/team/accept-invite
 * body: { token, owner }
 */
exports.acceptInvite = async (req, res) => {
  try {
    const { token, owner } = req.body;
    if (!token || !owner) {
      return res.status(400).json({ success: false, message: "Token and owner are required." });
    }

    const tokenHash = sha256(token);

    const member = await TeamMember.findOne({
      ownerId: owner,
      inviteTokenHash: tokenHash,
      status: "Invited",
    });

    if (!member) {
      return res.status(400).json({
        success: false,
        message: "Invalid or already used invite link.",
      });
    }

    if (member.inviteExpiresAt && member.inviteExpiresAt < new Date()) {
      member.status = "Expired";
      member.inviteTokenHash = "";
      member.inviteExpiresAt = null;
      await member.save();

      return res.status(400).json({
        success: false,
        message: "Invite expired.",
        code: "INVITE_EXPIRED",
      });
    }

    const user = await User.findOne({ email: member.email }).select("_id email");

    if (!user) {
      return res.status(200).json({
        success: true,
        next: "SIGNUP_REQUIRED",
        email: member.email,
        message: "Set a password to join this workspace.",
      });
    }

    return res.status(200).json({
      success: true,
      next: "LOGIN",
      email: member.email,
      message: "Account exists. Please login to join.",
    });
  } catch (err) {
    console.error("ACCEPT INVITE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to accept invite.",
      error: err.message,
    });
  }
};

/**
 * POST /api/team/complete-invite
 * body: { token, owner, password, fullName? }
 */
exports.completeInvite = async (req, res) => {
  try {
    const { token, owner, password, fullName } = req.body;

    if (!token || !owner || !password) {
      return res.status(400).json({
        success: false,
        message: "token, owner, and password are required.",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const tokenHash = sha256(token);

    const member = await TeamMember.findOne({
      ownerId: owner,
      inviteTokenHash: tokenHash,
      status: "Invited",
    });

    if (!member) {
      return res.status(400).json({
        success: false,
        message: "Invalid or used invite link.",
        code: "INVITE_INVALID",
      });
    }

    if (member.inviteExpiresAt && member.inviteExpiresAt < new Date()) {
      member.status = "Expired";
      member.inviteTokenHash = "";
      member.inviteExpiresAt = null;
      await member.save();

      return res.status(400).json({
        success: false,
        message: "Invite expired.",
        code: "INVITE_EXPIRED",
      });
    }

    const hashed = await bcrypt.hash(String(password), 10);

    const existingUser = await User.findOne({ email: member.email }).select("_id email fullName");

    if (existingUser) {
      await User.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            password: hashed,
            onboardingCompleted: true,
            acceptTerms: true,
            notificationsEnabled: true,
            ...(safeStr(fullName) ? { fullName: safeStr(fullName) } : {}),
          },
        }
      );

      member.userId = existingUser._id;
      member.status = "Active";
      member.joinedAt = new Date();
      member.inviteTokenHash = "";
      member.inviteExpiresAt = null;
      await member.save();

      try {
        await logAudit({
          ownerId: owner,
          actor: existingUser,
          action: "TEAM_INVITE_COMPLETED",
          title: "Invite completed",
          meta: `${member.email} set password and joined`,
          targetMemberId: member._id,
        });
      } catch (e) {
        console.error("AUDIT LOG ERROR:", e?.message || e);
      }

      const tokenJwt = jwt.sign({ id: existingUser._id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
      });

      return res.status(200).json({
        success: true,
        message: "Password set. You’re in!",
        token: tokenJwt,
        email: member.email,
      });
    }

    const createdUser = await User.create({
      fullName: safeStr(fullName) || member.name || member.email.split("@")[0],
      businessName: "Team Member",
      email: member.email,
      password: hashed,
      acceptTerms: true,
      onboardingCompleted: true,
      notificationsEnabled: true,
    });

    member.userId = createdUser._id;
    member.status = "Active";
    member.joinedAt = new Date();
    member.inviteTokenHash = "";
    member.inviteExpiresAt = null;
    await member.save();

    try {
      await logAudit({
        ownerId: owner,
        actor: createdUser,
        action: "TEAM_INVITE_COMPLETED",
        title: "Invite completed",
        meta: `${member.email} created account and joined`,
        targetMemberId: member._id,
      });
    } catch (e) {
      console.error("AUDIT LOG ERROR:", e?.message || e);
    }

    const tokenJwt = jwt.sign({ id: createdUser._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    return res.status(200).json({
      success: true,
      message: "Account created. You’re in!",
      token: tokenJwt,
      email: member.email,
    });
  } catch (err) {
    console.error("COMPLETE INVITE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to complete invite.",
      error: err.message,
    });
  }
};

/**
 * PATCH /api/team/member/:id
 */
exports.updateMember = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const memberId = req.params.id;
    const { role, status, name } = req.body;

    const owner = await User.findById(ownerId).select("onboardingCompleted fullName email");
    if (!owner) return res.status(404).json({ success: false, message: "User not found." });

    if (!owner.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: "Onboarding not completed.",
        code: "ONBOARDING_REQUIRED",
      });
    }

    const member = await TeamMember.findOne({ _id: memberId, ownerId });
    if (!member) return res.status(404).json({ success: false, message: "Member not found." });

    if (role) {
      // ✅ REPLACED LINE (was Manager/Staff only)
      const newRole = ROLE_ALL.includes(role) ? role : member.role;

      if (newRole !== member.role) {
        member.role = newRole;
        await logAudit({
          ownerId,
          actor: owner,
          action: "TEAM_ROLE_CHANGED",
          title: "Role updated",
          meta: `${member.email} → ${newRole}`,
          targetMemberId: member._id,
        });
      }
    }

    if (status) {
      const allowed = ["Active", "Invited", "Disabled", "Expired"];
      const newStatus = allowed.includes(status) ? status : member.status;
      if (newStatus !== member.status) {
        member.status = newStatus;
        if (newStatus === "Active" && !member.joinedAt) member.joinedAt = new Date();
        await logAudit({
          ownerId,
          actor: owner,
          action: "TEAM_STATUS_CHANGED",
          title: "Status updated",
          meta: `${member.email} → ${newStatus}`,
          targetMemberId: member._id,
        });
      }
    }

    if (typeof name === "string") {
      member.name = safeStr(name);
    }

    await member.save();

    return res.status(200).json({
      success: true,
      message: "Member updated.",
      member: {
        id: member._id,
        name: member.name || member.email.split("@")[0],
        email: member.email,
        role: member.role,
        status: member.status,
        lastActiveAt: member.lastActiveAt,
        joinedAt: member.joinedAt,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error updating member.",
      error: err.message,
    });
  }
};

/**
 * DELETE /api/team/member/:id
 */
exports.removeMember = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const memberId = req.params.id;

    const owner = await User.findById(ownerId).select("onboardingCompleted fullName email");
    if (!owner) return res.status(404).json({ success: false, message: "User not found." });

    if (!owner.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: "Onboarding not completed.",
        code: "ONBOARDING_REQUIRED",
      });
    }

    const member = await TeamMember.findOne({ _id: memberId, ownerId }).lean();
    if (!member) return res.status(404).json({ success: false, message: "Member not found." });

    await TeamMember.deleteOne({ _id: memberId, ownerId });

    await logAudit({
      ownerId,
      actor: owner,
      action: "TEAM_REMOVED",
      title: "Team member removed",
      meta: `${member.email} removed`,
      targetMemberId: memberId,
    });

    return res.status(200).json({ success: true, message: "Member removed." });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error removing member.",
      error: err.message,
    });
  }
};

/**
 * GET /api/team/activity?limit=10
 */
exports.getActivity = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const limit = Math.min(Number(req.query.limit || 10), 50);

    const owner = await User.findById(ownerId).select("onboardingCompleted");
    if (!owner) return res.status(404).json({ success: false, message: "User not found." });

    if (!owner.onboardingCompleted) {
      return res.status(403).json({
        success: false,
        message: "Onboarding not completed.",
        code: "ONBOARDING_REQUIRED",
      });
    }

    const logs = await AuditLog.find({ ownerId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const rows = logs.map((l) => ({
      id: l._id,
      title: l.title,
      meta: l.meta,
      action: l.action,
      actorName: l.actorName,
      time: l.createdAt,
    }));

    return res.status(200).json({ success: true, rows });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error loading activity.",
      error: err.message,
    });
  }
};




