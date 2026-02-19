import nodemailer from "nodemailer";

const transporter = (() => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
})();

const from = process.env.FROM_EMAIL || process.env.SMTP_USER || "noreply@safepulse.com";
const appName = process.env.APP_NAME || "Safepulse";

/**
 * Send verification email with link. No-op if SMTP is not configured (link is still logged in dev).
 */
export async function sendVerificationEmail(
  to: string,
  verificationLink: string,
  firstName?: string
): Promise<boolean> {
  const trans = transporter;
  if (!trans) {
    console.warn("[EMAIL] SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD to send verification emails.");
    return false;
  }

  const name = firstName ? ` ${firstName}` : "";
  const subject = `Verify your email for ${appName}`;
  const html = `
    <p>Hi${name},</p>
    <p>Thanks for signing up. Please verify your email by clicking the link below:</p>
    <p><a href="${verificationLink}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Verify my email</a></p>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break:break-all;color:#666;">${verificationLink}</p>
    <p>This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
    <p>— ${appName}</p>
  `;
  const text = `Hi${name},\n\nVerify your email by opening this link:\n${verificationLink}\n\nThis link expires in 24 hours.\n\n— ${appName}`;

  try {
    await trans.sendMail({
      from: `${appName} <${from}>`,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error("[EMAIL] Failed to send verification email:", err);
    return false;
  }
}
