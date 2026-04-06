import { Request, Response, NextFunction } from "express";
import logger from "../../../common/logger";
import { HttpError } from "../../../common/errors";

const errorMiddleware = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  logger.error({
    message: "Error occurred",
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    method: req.method,
    path: req.path,
  });

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      error: { message: error.message, status: error.statusCode },
    });
    return;
  }

  if (
    error.name === "JsonWebTokenError" ||
    error.name === "TokenExpiredError"
  ) {
    res
      .status(401)
      .json({ error: { message: "Invalid or expired token", status: 401 } });
    return;
  }

  if (error.name === "ValidationError") {
    res.status(400).json({ error: { message: error.message, status: 400 } });
    return;
  }

  res
    .status(500)
    .json({ error: { message: "Internal Server Error", status: 500 } });
};

export default errorMiddleware;
