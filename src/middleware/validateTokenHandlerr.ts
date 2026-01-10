import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import jwt, { JwtPayload } from "jsonwebtoken";

interface DecodedUser {
  id: string;       
  username: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: DecodedUser;
    }
  }
}

const validateToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401);
      throw new Error("Token is missing or invalid");
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string,
      (err, decoded) => {
        if (err || !decoded) {
          res.status(401);
          throw new Error("Unauthorized User");
        }

        const payload = decoded as JwtPayload;

        req.user = {
          id: payload.id as string, 
          email: payload.email as string,
          username: payload.username as string,
        };

        next();
      }
    );
  }
);

export default validateToken;
