import { Request, Response, NextFunction } from "express";
import logger from "./logger";
import { HttpError } from "./errors";

// Global error handling middleware
const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Log the error
  logger.error(`[${err.name || "Error"}] ${err.message}`, {
    path: req.path,
    method: req.method,
    stack: err.stack,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Handle custom HttpErrors
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      status: "error",
      statusCode: err.statusCode,
      message: err.message,
    });
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      status: "error",
      statusCode: 401,
      message: "Invalid or expired token",
    });
  }

  // Handle Joi validation errors
  if (err.isJoi) {
    return res.status(400).json({
      status: "error",
      statusCode: 400,
      message: "Validation failed",
      details: err.details.map((d: any) => d.message),
    });
  }

  // Default to 500 Internal Server Error
  const statusCode = 500;
  const message = "Internal Server Error";

  res.status(statusCode).json({
    status: "error",
    statusCode,
    message,
  });
};

export default errorMiddleware;
