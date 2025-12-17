"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
// import userRoutes from "routes/userRoutes";
// import productRoutes from "./routes/productRoutes"; // Corrected import path
// import userRoutes from "./routes/userRoutes";
// import errorHandler from "./middleware/errorHandler";
// import connectDb from "../config/dbConnection";
dotenv_1.default.config();
// connectDb();
exports.app = (0, express_1.default)();
const port = parseInt(process.env.PORT || "5000");
exports.app.get("/", (req, res) => {
    res.send("Server is fine and ready boom");
});
// middleware function for error handling
// app.use(errorHandler);
// middleware for body-parser
exports.app.use(express_1.default.json());
const router = express_1.default.Router();
// app.use("/api/users", userRoutes); 
// server to listen to the specific port (5000)
exports.app.listen(port, () => {
    console.log(`server running on port ${port}`);
});
