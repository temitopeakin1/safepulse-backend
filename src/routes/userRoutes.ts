// import validateToken from "../middleware/validateTokenHandler";
// import { registerUser, loginUser, currentUser } from "../controller/userController";
// import { registerUser } from "../controller/userController";

import { registerUser } from "controllers/userController";
import express, {Router } from "express";

const router: Router = express.Router();

router.post("/register", registerUser);

// router.post("/login", loginUser);

// router.get("/current", validateToken, currentUser);

// router.get("/current", currentUser);

export default router;
