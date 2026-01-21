export const validateLoginPayload = (body: any): string | null => {
  const allowedKeys = ["email", "password"];
  const bodyKeys = Object.keys(body);

  // Reject extra fields
  for (const key of bodyKeys) {
    if (!allowedKeys.includes(key)) {
      return `Invalid field '${key}' in login request`;
    }
  }

  if (!body.email || !body.password) {
    return "Email and password are required";
  }

  return null;
};

export const validateRegisterPayload = (body: any): string | null => {
  const allowedKeys = ["username", "email", "password"];
  const bodyKeys = Object.keys(body);

  for (const key of bodyKeys) {
    if (!allowedKeys.includes(key)) {
      return `Invalid field '${key}' in register request`;
    }
  }

  if (!body.username || !body.email || !body.password) {
    return "Username, email and password are required";
  }

  return null;
};

export const validateResetPasswordPayload = (body: any): string | null => {
  if (!body || typeof body !== "object") {
    return "Invalid request payload";
  }

  const allowedKeys = ["token", "newPassword", "confirmPassword"];
  const bodyKeys = Object.keys(body);

  for (const key of bodyKeys) {
    if (!allowedKeys.includes(key)) {
      return `Invalid field '${key}' in reset password request`;
    }
  }

  if (!body.token || !body.newPassword) {
    return "Token and new password are required";
  }

  if (!body.confirmPassword) {
    return "Confirm password is required";
  }

  if (body.confirmPassword !== body.newPassword) {
    return "Passwords do not match";
  }

  return null;
};

