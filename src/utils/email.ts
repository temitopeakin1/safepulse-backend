import nodemailer from "nodemailer";

const transporter = (() => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
  });
})();

const from =
  process.env.FROM_EMAIL || process.env.SMTP_USER || "noreply@safepulse.com";
const appName = process.env.APP_NAME || "Safepulse";

if (!transporter) {
  console.warn(
    "[EMAIL] SMTP transporter not created. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in .env and restart the server.",
  );
}

/**
 * Send verification email with link. No-op if SMTP is not configured (link is still logged in dev).
 */
export async function sendVerificationEmail(
  to: string,
  verificationLink: string,
  firstName?: string,
): Promise<boolean> {
  const trans = transporter;
  if (!trans) {
    console.warn(
      "[EMAIL] SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD to send verification emails.",
    );
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

/**
 * Send password reset email with link. No-op if SMTP is not configured (link is still logged in dev).
 */
export async function sendResetPasswordEmail(
  to: string,
  resetLink: string,
  firstName?: string,
): Promise<boolean> {
  const trans = transporter;
  if (!trans) {
    console.warn(
      "[EMAIL] SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD to send password reset emails.",
    );
    return false;
  }

  const name = firstName ? ` ${firstName}` : "";
  const subject = `Reset your password for ${appName}`;
  const html = `
    <p>Hi${name},</p>
    <p>You requested a password reset. Click the link below to set a new password:</p>
    <p><a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Reset my password</a></p>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break:break-all;color:#666;">${resetLink}</p>
    <p>This link expires in 15 minutes. If you didn't request a reset, you can ignore this email.</p>
    <p>— ${appName}</p>
  `;
  const text = `Hi${name},\n\nReset your password by opening this link:\n${resetLink}\n\nThis link expires in 15 minutes.\n\n— ${appName}`;

  try {
    await trans.sendMail({
      from: `${appName} <${from}>`,
      to,
      subject,
      text,
      html,
    });
    console.log("[EMAIL] Password reset email sent to", to);
    return true;
  } catch (err: any) {
    console.error(
      "[EMAIL] Failed to send password reset email:",
      err?.message || err,
    );
    if (err?.response) console.error("[EMAIL] SMTP response:", err.response);
    return false;
  }
}
