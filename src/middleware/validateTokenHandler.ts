import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";

interface DecodedUser {
  username: string;
  email: string;
  id: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: DecodedUser;
    }
  }
}

const validateToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401);
    throw new Error("Token missing or invalid token");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as DecodedUser;
    req.user = decoded;
    console.log("Decoded User:", req.user); 
    next();
  } catch (err) {
    res.status(401);
    throw new Error("Token missing or invalid token");
  }
});

export default validateToken;
