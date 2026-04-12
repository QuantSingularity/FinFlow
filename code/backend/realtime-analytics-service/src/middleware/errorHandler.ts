import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const status = error.statusCode || error.status || 500;
  res.status(status).json({
    success: false,
    error: error.message || "Internal server error",
  });
};
