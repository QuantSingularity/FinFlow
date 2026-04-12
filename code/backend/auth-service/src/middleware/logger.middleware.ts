import { Request, Response, NextFunction } from "express";
import winston from "winston";

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Logger middleware
const loggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Log request
  logger.info({
    message: "Incoming request",
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Track response time
  const start = Date.now();

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - start;

    const logLevel = res.statusCode >= 400 ? "error" : "info";

    logger[logLevel]({
      message: "Outgoing response",
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
};

export default loggerMiddleware;

// Export logger for use in other files
export { logger };
