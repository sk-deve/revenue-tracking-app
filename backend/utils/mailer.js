const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendInviteEmail({ to, businessName, inviterName, acceptUrl }) {
  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `You're invited to join ${businessName}`,
    html: `
      <div style="font-family:Arial;line-height:1.5">
        <h2>You're invited</h2>
        <p><b>${inviterName}</b> invited you to join <b>${businessName}</b>.</p>
        <p style="margin:20px 0">
          <a href="${acceptUrl}" style="background:#111827;color:#fff;padding:12px 16px;border-radius:10px;text-decoration:none">
            Accept Invite
          </a>
        </p>
        <p>This link expires in 48 hours.</p>
      </div>
    `,
  });
}

module.exports = { sendInviteEmail };
