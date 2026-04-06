import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import config from "../../common/config";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "analytics-service" });
});

const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Authentication required" });
    return;
  }
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    (req as any).user = { id: decoded.sub, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
};

const getAnalyticsService = () => require("./analytics.service").default;

// GET /api/analytics/transaction-summary
app.get(
  "/api/analytics/transaction-summary",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      if (
        !startDate ||
        !endDate ||
        isNaN(Date.parse(startDate as string)) ||
        isNaN(Date.parse(endDate as string))
      ) {
        res.status(400).json({ success: false, error: "Invalid date format" });
        return;
      }
      const svc = getAnalyticsService();
      const result = await svc.generateTransactionSummary(
        new Date(startDate as string),
        new Date(endDate as string),
      );
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      if (error.name === "ValidationError") {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    }
  },
);

// GET /api/analytics/forecast
app.get(
  "/api/analytics/forecast",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, forecastType } = req.query;
      if (
        !startDate ||
        !endDate ||
        isNaN(Date.parse(startDate as string)) ||
        isNaN(Date.parse(endDate as string))
      ) {
        res.status(400).json({ success: false, error: "Invalid date format" });
        return;
      }
      const validTypes = ["revenue", "expenses", "cashflow"];
      if (!forecastType || !validTypes.includes(forecastType as string)) {
        res.status(400).json({
          success: false,
          error: `Invalid forecast type: ${forecastType}`,
        });
        return;
      }
      const svc = getAnalyticsService();
      const result = await svc.generateForecast(
        new Date(startDate as string),
        new Date(endDate as string),
        forecastType as string,
      );
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      if (
        error.name === "ValidationError" ||
        error.message?.includes("Insufficient")
      ) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    }
  },
);

// GET /api/analytics/dashboard-metrics
app.get(
  "/api/analytics/dashboard-metrics",
  authenticate,
  async (_req: Request, res: Response) => {
    try {
      const svc = getAnalyticsService();
      const result = await svc.getDashboardMetrics();
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },
);

// GET /api/analytics/payment-analytics
app.get(
  "/api/analytics/payment-analytics",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      if (
        !startDate ||
        !endDate ||
        isNaN(Date.parse(startDate as string)) ||
        isNaN(Date.parse(endDate as string))
      ) {
        res.status(400).json({ success: false, error: "Invalid date format" });
        return;
      }
      const svc = getAnalyticsService();
      const result = await svc.getPaymentAnalytics(
        new Date(startDate as string),
        new Date(endDate as string),
      );
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },
);

// POST /api/analytics/custom-report
app.post(
  "/api/analytics/custom-report",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const svc = getAnalyticsService();
      const result = await svc.generateCustomReport(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      if (
        error.name === "ValidationError" ||
        error.message?.includes("Invalid")
      ) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    }
  },
);

export default app;
