import { Request, Response, NextFunction } from "express";
export const metricsMiddleware = (
  _req: Request,
  _res: Response,
  next: NextFunction,
): void => next();
