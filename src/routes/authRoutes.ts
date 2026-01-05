import express, { Router } from "express";
import {
  currentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
} from "../controllers/authController";
import validateToken from "../middleware/validateTokenHandler";

const router: Router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/logout", logoutUser);

router.post("/refresh-token", refreshAccessToken);

router.get("/current", validateToken, currentUser);

export default router;
