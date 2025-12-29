import {constants} from "../constants";
import { Request, Response, NextFunction } from "express";

const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = res.statusCode || 500;

  switch (statusCode) {
    case constants.VALIDATION_ERROR:
      return res.status(statusCode).json({
        title: "Validation Failed",
        message: err.message,
      });

    case constants.UNAUTHORIZED:
      return res.status(statusCode).json({
        title: "Unauthorized",
        message: err.message,
      });

    case constants.FORBIDDEN:
      return res.status(statusCode).json({
        title: "Forbidden",
        message: err.message,
      });

    case constants.NOT_FOUND:
      return res.status(statusCode).json({
        title: "Not Found",
        message: err.message,
      });
    case constants.CONFLICT:
      return res
        .status(statusCode).json({ 
          title: "Conflict", 
          message: err.message 
        });
    default:
      return res.status(500).json({
        title: "Server Error",
        message: err.message,
      });
  }
};

export default errorHandler;
