import express, { Router } from "express";
import {
  currentUser,
  changePassword,
  forgotPassword,
  getNotificationPreferences,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  resendVerificationEmail,
  resetPassword,
  updateNotificationPreferences,
  updateProfile,
  verifyEmail,
} from "../controllers/authController";
import validateToken from "../middleware/validateTokenHandler";
import { validateBody } from "../middleware/validateBody";
import { rateLimiter } from "../middleware/rateLimiter";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  notificationPreferencesSchema,
  changePasswordSchema,
} from "../validators/auth";

const router: Router = express.Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, phoneNumber, email, password, confirmPassword]
 *             properties:
 *               firstName: { type: "string", example: "John" }
 *               lastName: { type: "string", example: "Doe" }
 *               phoneNumber: { type: "string", example: "+1234567890" }
 *               email: { type: "string", format: "email", example: "user@example.com" }
 *               password: { type: "string", format: "password", minLength: 8 }
 *               confirmPassword: { type: "string", format: "password" }
 *     responses:
 *       201:
 *         description: User registered. Email verification required before login.
 *       400:
 *         description: Validation error or invalid input
 *       409:
 *         description: Email or phone number already exists
 */
router.post("/register", validateBody(registerSchema), registerUser);

/**
 * @openapi
 * /api/v1/auth/verify-email:
 *   get:
 *     tags: [Auth]
 *     summary: Verify email (click link from email)
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *         description: Token from verification email link
 *     responses:
 *       200:
 *         description: Email verified. You can now log in.
 *       400:
 *         description: Invalid or expired token
 */
router.get("/verify-email", verifyEmail);

/**
 * @openapi
 * /api/v1/auth/resend-verification-email:
 *   post:
 *     tags: [Auth]
 *     summary: Resend verification email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: If account exists and not verified, new link sent (or already verified message)
 */
router.post("/resend-verification-email", validateBody(forgotPasswordSchema), resendVerificationEmail);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: "string", format: "email" }
 *               password: { type: "string", format: "password" }
 *     responses:
 *       200:
 *         description: Login successful, returns access token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: "boolean" }
 *                 accessToken: { type: "string" }
 *       401:
 *         description: Invalid email or password
 *       403:
 *         description: Email not verified (verify your email before logging in)
 */
router.post("/login", validateBody(loginSchema), loginUser);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out (clears refresh token cookie)
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", logoutUser);

/**
 * @openapi
 * /api/v1/auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Get a new access token using refresh token
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: "string", description: "Optional if sent via cookie" }
 *     responses:
 *       200:
 *         description: New access token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: "string" }
 *       401:
 *         description: Refresh token missing
 *       403:
 *         description: Invalid refresh token
 */
router.post("/refresh-token", refreshAccessToken);

/**
 * @openapi
 * /api/v1/auth/current:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 user: { type: "object" }
 *       401:
 *         description: Not authenticated
 */
router.get("/current", validateToken, currentUser);

/**
 * @openapi
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: "string", format: "email" }
 *     responses:
 *       200:
 *         description: If email exists, reset link has been sent (same response for security)
 */
router.post("/forgot-password", validateBody(forgotPasswordSchema), forgotPassword);

/**
 * @openapi
 * /api/v1/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password with token from email link
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword, confirmPassword]
 *             properties:
 *               token: { type: "string", description: "Token from reset link" }
 *               newPassword: { type: "string", format: "password", minLength: 8 }
 *               confirmPassword: { type: "string", format: "password" }
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token / validation error
 */
router.post("/reset-password", rateLimiter, validateBody(resetPasswordSchema), resetPassword);

/**
 * @openapi
 * /api/v1/auth/update:
 *   patch:
 *     tags: [Auth]
 *     summary: Update profile (name, phone, email)
 *     description: Edit personal information. Send only the fields you want to update.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: "string", example: "John" }
 *               lastName: { type: "string", example: "Doe" }
 *               phoneNumber: { type: "string", example: "+1234567890" }
 *               email: { type: "string", format: "email", example: "user@example.com" }
 *             minProperties: 1
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 user: { type: object }
 *       400:
 *         description: Validation error or no fields to update
 *       401:
 *         description: Not authenticated
 *       409:
 *         description: Email or phone number already exists
 */
router.patch("/update", validateToken, validateBody(updateProfileSchema), updateProfile);

/**
 * @openapi
 * /api/v1/auth/preferences:
 *   get:
 *     tags: [Auth]
 *     summary: Get notification preferences (Profile - Notification Preferences)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Notification preferences (emailNotifications, criticalIncidentsNearMe, reportStatusUpdates)
 *       401:
 *         description: Not authenticated
 */
router.get("/preferences", validateToken, getNotificationPreferences);

/**
 * @openapi
 * /api/v1/auth/preferences:
 *   patch:
 *     tags: [Auth]
 *     summary: Update notification preferences (Profile - Edit)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailNotifications: { type: boolean }
 *               criticalIncidentsNearMe: { type: boolean }
 *               reportStatusUpdates: { type: boolean }
 *             minProperties: 1
 *     responses:
 *       200:
 *         description: Preferences updated
 *       401:
 *         description: Not authenticated
 */
router.patch("/preferences", validateToken, validateBody(notificationPreferencesSchema), updateNotificationPreferences);

/**
 * @openapi
 * /api/v1/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password (Profile - Security)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword, confirmPassword]
 *             properties:
 *               currentPassword: { type: string, format: password }
 *               newPassword: { type: string, format: password, minLength: 8 }
 *               confirmPassword: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password incorrect or validation error
 *       401:
 *         description: Not authenticated
 */
router.post("/change-password", validateToken, validateBody(changePasswordSchema), changePassword);

export default router;
