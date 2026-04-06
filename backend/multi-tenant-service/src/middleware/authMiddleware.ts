import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Authentication required" });
    return;
  }
  try {
    const decoded = jwt.verify(
      header.split(" ")[1],
      process.env.JWT_SECRET || "test-jwt-secret-key-for-development",
    ) as any;
    (req as any).user = { id: decoded.sub, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid token" });
  }
};
