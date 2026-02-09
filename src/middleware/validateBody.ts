import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { formatZodError } from "../utils/validate";

/**
 * Reusable middleware: validate req.body against a Zod schema.
 * On success, sets req.validated with the parsed data and calls next().
 * On failure, responds with 400 and the first validation message (same shape as errorHandler).
 */
export function validateBody<T>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        title: "Validation Failed",
        message: formatZodError(result.error),
      });
      return;
    }
    req.validated = result.data as unknown;
    next();
  };
}
