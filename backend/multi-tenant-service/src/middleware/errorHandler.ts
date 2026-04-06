import { Request, Response, NextFunction } from "express";
export const errorHandler = (
  error: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  res
    .status(error.statusCode || 500)
    .json({ success: false, error: error.message || "Internal server error" });
};
