import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import pool from "../config/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as UserModel from "../models/userModel";
import * as PasswordResetModel from "../models/passwordResetModel";
import * as EmailVerificationModel from "../models/emailVerificationModel";
import crypto from "crypto";
import * as NotificationPreferencesModel from "../models/notificationPreferencesModel";
import { sendVerificationEmail } from "../utils/email";
import type {
  RegisterInput,
  LoginInput,
  ResetPasswordInput,
  ForgotPasswordInput,
  UpdateProfileInput,
  NotificationPreferencesInput,
  ChangePasswordInput,
} from "../validators/auth";

// Register user (body validated by validateBody(registerSchema) in route)
const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, phoneNumber, email, password } = req.validated as RegisterInput;

  const existingByEmail = await UserModel.findUserByEmail(email);
  if (existingByEmail) {
    res.status(409);
    throw new Error("Email already exists");
  }

  const existingByPhone = await UserModel.findUserByPhoneNumber(phoneNumber);
  if (existingByPhone) {
    res.status(409);
    throw new Error("Phone number already exists");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (first_name, last_name, phone_number, email, password)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, first_name, last_name, phone_number, email, created_at
      `,
      [firstName, lastName, phoneNumber, email, hashedPassword]
    );

    const newUser = result.rows[0];
    const userId = newUser.id;

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await EmailVerificationModel.createVerificationToken(userId, tokenHash, expiresAt);

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const verificationLink = `${clientUrl}/verify-email?token=${token}`;
    await sendVerificationEmail(newUser.email, verificationLink, newUser.first_name);
    if (process.env.NODE_ENV !== "production") {
      console.log("[EMAIL VERIFICATION LINK]", verificationLink);
    }

    const payload: { status: number; message: string; user: object; verificationLink?: string; token?: string } = {
      status: 201,
      message: "Please verify your email. Check your inbox for the verification link.",
      user: {
        id: newUser.id,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        phoneNumber: newUser.phone_number,
        email: newUser.email,
        createdAt: newUser.created_at,
        emailVerified: false,
      },
    };
    if (process.env.NODE_ENV !== "production") {
      payload.verificationLink = verificationLink;
      payload.token = token;
    }

    res.status(201).json(payload);
  } catch (error: any) {
    if (error.code === "23505") {
      res.status(409);
      const constraint = error.constraint ?? "";
      if (constraint.includes("phone")) {
        throw new Error("Phone number already exists");
      }
      if (constraint.includes("email")) {
        throw new Error("Email already exists");
      }
      throw new Error("Email or phone number already exists");
    }
    throw error;
  }
});

// login user endpoint (body validated by validateBody(loginSchema) in route)
const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.validated as LoginInput;

  // find user by email
  const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  const user = userResult.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (!user.email_verified) {
    res.status(403);
    throw new Error("Please verify your email before logging in");
  }

  // update last login
  await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [
    user.id,
  ]);

  // create JWT Token
  const secretKey = process.env.ACCESS_TOKEN_SECRET;
  if (!secretKey) {
    res.status(500);
    throw new Error("JWT secret is not defined");
  }
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    },
    process.env.ACCESS_TOKEN_SECRET as string,
    { expiresIn: "20m" }
  );

  // refresh token
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET as string,
    { expiresIn: "7d" }
  );

  // store refresh token in DB
  await pool.query("UPDATE users SET refresh_token = $1 WHERE id = $2", [
    refreshToken,
    user.id,
  ]);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    success: true,
    accessToken,
    // refreshToken,
  });
});

// GET /api/v1/auth/verify-email — confirm email via link (token in query)
const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token || typeof token !== "string") {
    res.status(400);
    throw new Error("Verification token is required");
  }
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await EmailVerificationModel.findValidVerificationToken(tokenHash);
  if (!record) {
    res.status(400);
    throw new Error("Invalid or expired verification link. Please request a new one.");
  }
  await EmailVerificationModel.markEmailVerifiedAndDeleteToken(record.user_id);
  res.status(200).json({
    success: true,
    message: "Email verified successfully. You can now log in.",
  });
});

// POST /api/v1/auth/resend-verification-email — resend verification link
const resendVerificationEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.validated as ForgotPasswordInput;
  const user = await UserModel.findUserByEmail(email);
  if (!user) {
    res.status(200).json({
      success: true,
      message: "If an account exists with this email, a new verification link has been sent.",
    });
    return;
  }
  if ((user as any).email_verified) {
    res.status(200).json({
      success: true,
      message: "Email is already verified. You can log in.",
    });
    return;
  }
  await EmailVerificationModel.invalidateVerificationTokens(user.id);
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await EmailVerificationModel.createVerificationToken(user.id, tokenHash, expiresAt);
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const verificationLink = `${clientUrl}/verify-email?token=${token}`;
  await sendVerificationEmail((user as any).email, verificationLink, (user as any).first_name);
  if (process.env.NODE_ENV !== "production") {
    console.log("[EMAIL VERIFICATION LINK]", verificationLink);
  }
  const payload: { success: boolean; message: string; verificationLink?: string; token?: string } = {
    success: true,
    message: "If an account exists with this email, a new verification link has been sent.",
  };
  if (process.env.NODE_ENV !== "production") {
    payload.verificationLink = verificationLink;
    payload.token = token;
  }
  res.status(200).json(payload);
});

// forget password endpoint (body validated by validateBody(forgotPasswordSchema) in route)
const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.validated as ForgotPasswordInput;

  const user = await UserModel.findUserByEmail(email);

  // IMPORTANT: don’t leak whether email exists
  if (!user) {
    res.status(200).json({
      success: true,
      message: "If the email exists, a reset link has been sent.",
    });
    return;
  }

  await PasswordResetModel.invalidateUserTokens(user.id);

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await PasswordResetModel.createResetToken(user.id, tokenHash, expiresAt);

  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const resetLink = `${clientUrl}/reset-password?token=${token}`;

  console.log("[RESET PASSWORD LINK]", resetLink);

  const payload: { success: boolean; message: string; resetLink?: string; token?: string } = {
    success: true,
    message: "If the email exists, a reset link has been sent.",
  };
  // In development, include the reset link and token so you can test without email
  if (process.env.NODE_ENV !== "production") {
    payload.resetLink = resetLink;
    payload.token = token;
  }

  res.status(200).json(payload);
  return;
});

// reset password endpoint (body validated by validateBody(resetPasswordSchema) in route)
const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.validated as ResetPasswordInput;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await PasswordResetModel.findValidResetToken(tokenHash);

  if (!record) {
    res.status(400);
    throw new Error("Invalid or expired reset token");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await pool.query(
    "UPDATE users SET password = $1, refresh_token = NULL WHERE id = $2",
    [hashedPassword, record.user_id]
  );

  await PasswordResetModel.markTokenUsed(record.id);

  res.status(200).json({
    success: true,
    message: "Password reset successful",
  });
});

// logout user endpoint
const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    await pool.query(
      "UPDATE users SET refresh_token = NULL WHERE refresh_token = $1",
      [refreshToken]
    );
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.status(200).json({
    success: true,
    message: "User Logged out successfully",
  });
});

// refresh token endpoint
const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  // try cookie first, fallback to body (for Postman testing)
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    res.status(401);
    throw new Error("Refresh token missing");
  }

  // find user with this refresh token
  const result = await pool.query(
    "SELECT * FROM users WHERE refresh_token = $1",
    [refreshToken]
  );

  const user = result.rows[0];
  if (!user) {
    res.status(403);
    throw new Error("Invalid refresh token");
  }

  // verify refresh token
  try {
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string);
  } catch {
    res.status(403);
    throw new Error("Invalid refresh token");
  }

  const newAccessToken = jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    process.env.ACCESS_TOKEN_SECRET as string,
    { expiresIn: "15m" }
  );

  res.status(200).json({
    accessToken: newAccessToken,
  });
});

// current user info (private)
// Get current user (requires auth middleware)
const currentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authenticated");
  }

  res.status(200).json({
    success: true,
    user: req.user,
  });
});

// PATCH /api/v1/auth/update — update profile (name, phone, email)
const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authenticated");
  }
  const userId = (req.user as any).id;
  const body = req.validated as UpdateProfileInput;

  if (body.email) {
    const existingByEmail = await UserModel.findUserByEmail(body.email);
    if (existingByEmail && existingByEmail.id !== userId) {
      res.status(409);
      throw new Error("Email already exists");
    }
  }
  if (body.phoneNumber) {
    const existingByPhone = await UserModel.findUserByPhoneNumber(body.phoneNumber);
    if (existingByPhone && existingByPhone.id !== userId) {
      res.status(409);
      throw new Error("Phone number already exists");
    }
  }

  const data = {
    ...(body.firstName !== undefined && { first_name: body.firstName }),
    ...(body.lastName !== undefined && { last_name: body.lastName }),
    ...(body.phoneNumber !== undefined && { phone_number: body.phoneNumber }),
    ...(body.email !== undefined && { email: body.email }),
  };
  const updated = await UserModel.updateUserProfile(userId, data);
  if (!updated) {
    res.status(400);
    throw new Error("No valid fields to update");
  }

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user: {
      id: updated.id,
      firstName: updated.first_name,
      lastName: updated.last_name,
      phoneNumber: updated.phone_number,
      email: updated.email,
      createdAt: updated.created_at,
    },
  });
});

// GET /api/v1/auth/preferences — get notification preferences (Profile - Notification Preferences)
const getNotificationPreferences = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authenticated");
  }
  const userId = (req.user as any).id;
  const prefs = await NotificationPreferencesModel.getPreferences(userId);
  res.status(200).json({
    success: true,
    preferences: {
      emailNotifications: prefs.email_notifications,
      criticalIncidentsNearMe: prefs.critical_incidents_near_me,
      reportStatusUpdates: prefs.report_status_updates,
    },
  });
});

// PATCH /api/v1/auth/preferences — update notification preferences (Profile - Edit)
const updateNotificationPreferences = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authenticated");
  }
  const userId = (req.user as any).id;
  const body = req.validated as NotificationPreferencesInput;
  const updated = await NotificationPreferencesModel.updatePreferences(userId, {
    email_notifications: body.emailNotifications,
    critical_incidents_near_me: body.criticalIncidentsNearMe,
    report_status_updates: body.reportStatusUpdates,
  });
  res.status(200).json({
    success: true,
    message: "Notification preferences updated",
    preferences: {
      emailNotifications: updated.email_notifications,
      criticalIncidentsNearMe: updated.critical_incidents_near_me,
      reportStatusUpdates: updated.report_status_updates,
    },
  });
});

// POST /api/v1/auth/change-password — change password (Profile - Security)
const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authenticated");
  }
  const userId = (req.user as any).id;
  const body = req.validated as ChangePasswordInput;
  const user = await UserModel.findUserById(userId);
  if (!user || !user.password) {
    res.status(401);
    throw new Error("User not found");
  }
  const currentMatch = await bcrypt.compare(body.currentPassword, user.password);
  if (!currentMatch) {
    res.status(400);
    throw new Error("Current password is incorrect");
  }
  const hashedPassword = await bcrypt.hash(body.newPassword, 10);
  await UserModel.updateUserPassword(userId, hashedPassword);
  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

export {
  registerUser,
  loginUser,
  currentUser,
  logoutUser,
  refreshAccessToken,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  updateProfile,
  getNotificationPreferences,
  updateNotificationPreferences,
  changePassword,
};
