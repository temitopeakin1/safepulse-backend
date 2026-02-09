import { z } from "zod";

/**
 * Format the first Zod error as a single message for API responses.
 * Reusable across all Zod-based validation (middleware, controllers, etc.).
 */
export function formatZodError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return "Validation failed";
  const path = first.path.length ? `${first.path.join(".")}: ` : "";
  return `${path}${first.message}`;
}

/**
 * Validate data against a Zod schema. Returns typed data or throws Error with formatted message.
 * Use in controllers when you need to validate something that isn't req.body, or when you prefer
 * validation in the controller instead of middleware.
 */
export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(formatZodError(result.error));
  }
  return result.data;
}
