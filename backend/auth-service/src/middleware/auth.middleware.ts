import { Request, Response, NextFunction } from "express";
import passport from "passport";
// Authentication middleware using JWT
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Invalid or expired token" });
    }

    // Attach user to request
    req.user = user;
    next();
  })(req, res, next);
};

// Role-based authorization middleware
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Authentication required" });
    }

    if (!roles.includes(req.user.role as string)) {
      return res
        .status(403)
        .json({ message: "Forbidden: Insufficient permissions" });
    }

    next();
  };
};

// Admin-only authorization middleware
export const authorizeAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    return res
      .status(401)
      .json({ message: "Unauthorized: Authentication required" });
  }

  if (req.user.role !== "ADMIN") {
    return res
      .status(403)
      .json({ message: "Forbidden: Admin access required" });
  }

  next();
};

export default {
  authenticate,
  authorize,
  authorizeAdmin,
};
