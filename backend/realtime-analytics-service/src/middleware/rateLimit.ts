import { Request, Response, NextFunction } from "express";

export const rateLimitMiddleware = (
  _req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  next();
};
