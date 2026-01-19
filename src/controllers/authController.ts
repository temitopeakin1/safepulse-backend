import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import pool from "../config/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Register user
const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400);
    throw new Error("All fields are mandatory");
  }

  // email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400);
    throw new Error("Invalid email format");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, created_at
      `,
      [username, email, hashedPassword]
    );

    res.status(201).json({
      status: 201,
      message: "User signup successful",
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        email: result.rows[0].email,
        createdAt: result.rows[0].created_at,
      },
    });
  } catch (error: any) {
    // PostgreSQL unique violation
    if (error.code === "23505") {
      res.status(409);
      throw new Error("Email already exists");
    }
    throw error;
  }
});

// login user endpoint
const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please complete all fields");
  }

  // find user by email
  const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  const user = userResult.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401);
    throw new Error("Invalid email or password");
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
    { id: user.id, email: user.email, username: user.username },
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
    //refreshToken,
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
  // assuming auth middleware sets req.user
  if (!req.user) {
    res.status(401);
    throw new Error("Not authenticated");
  }

  res.status(200).json({
    success: true,
    user: req.user,
  });
});

export { registerUser, loginUser, currentUser, logoutUser, refreshAccessToken };
