import { NextFunction, Request, Response } from "express";

const validateInternalServiceToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (!expected) {
    res.status(500);
    throw new Error("INTERNAL_SERVICE_TOKEN is not configured");
  }

  const provided = req.headers["x-internal-service-token"];
  if (typeof provided !== "string" || provided !== expected) {
    res.status(401);
    throw new Error("Unauthorized internal service");
  }

  next();
};

export default validateInternalServiceToken;
