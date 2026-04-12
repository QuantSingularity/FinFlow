import { Request, Response, NextFunction } from "express";
export const dataIsolationMiddleware = (
  _req: Request,
  _res: Response,
  next: NextFunction,
): void => next();
