import { Request, Response, NextFunction } from "express";
export const tenantMiddleware = (
  _req: Request,
  _res: Response,
  next: NextFunction,
): void => next();
