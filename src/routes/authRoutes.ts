import express, { Router } from "express";
import {
  currentUser,
  forgotPassword,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  resetPassword,
} from "../controllers/authController";
import validateToken from "../middleware/validateTokenHandler";
import {rateLimiter}  from "../middleware/rateLimiter";

const router: Router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/logout", logoutUser);

router.post("/refresh-token", refreshAccessToken);

router.get("/current", validateToken, currentUser);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", rateLimiter, resetPassword);

export default router;
