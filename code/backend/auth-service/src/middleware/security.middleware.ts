import { Request, Response, NextFunction } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";
import logger from "../../../common/logger";

const rateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
});

export const rateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const clientIp =
      (req.headers["x-forwarded-for"] as string) || req.ip || "unknown";
    await rateLimiter.consume(clientIp.toString());
    next();
  } catch {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: "Too many requests, please try again later.",
    });
  }
};

export const securityHeadersMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self' data:;",
  );
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  );
  next();
};
