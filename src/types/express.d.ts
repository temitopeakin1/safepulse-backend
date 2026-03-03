import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
      };
      /** Set by validateBody middleware with parsed, validated payload */
      validated?: unknown;
    }
  }
}

export {};
