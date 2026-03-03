import { z } from "zod";

/** Password strength rules (min 8 chars, no spaces, lower, upper, number, special) */
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine((val) => !/\s/.test(val), "Password must not contain spaces")
  .refine(
    (val) => /[a-z]/.test(val),
    "Password must include at least one lowercase letter",
  )
  .refine(
    (val) => /[A-Z]/.test(val),
    "Password must include at least one uppercase letter",
  )
  .refine(
    (val) => /[0-9]/.test(val),
    "Password must include at least one number",
  )
  .refine(
    (val) => /[^A-Za-z0-9]/.test(val),
    "Password must include at least one special character",
  );

export const loginSchema = z
  .object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z.string().email("Invalid email format"),
  })
  .strict();

export const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    phoneNumber: z.string().min(1, "Phone number is required"),
    email: z.string().email("Invalid email format"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const updateProfileSchema = z
  .object({
    firstName: z.string().min(1, "First name cannot be empty").optional(),
    lastName: z.string().min(1, "Last name cannot be empty").optional(),
    phoneNumber: z.string().min(1, "Phone number cannot be empty").optional(),
    email: z.string().email("Invalid email format").optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message:
      "At least one field (firstName, lastName, phoneNumber, email) is required",
  });

export const notificationPreferencesSchema = z
  .object({
    emailNotifications: z.boolean().optional(),
    criticalIncidentsNearMe: z.boolean().optional(),
    reportStatusUpdates: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message:
      "At least one preference (emailNotifications, criticalIncidentsNearMe, reportStatusUpdates) is required",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirm password do not match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type NotificationPreferencesInput = z.infer<
  typeof notificationPreferencesSchema
>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
