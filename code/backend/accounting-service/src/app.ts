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
  res.status(200).json({ status: "ok", service: "accounting-service" });
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

const getAccountingService = () => require("./accounting.service").default;
const getAnalyticsService = () => require("./analytics.service").default;

// POST /api/accounting/journal-entries
app.post(
  "/api/accounting/journal-entries",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { ledgerEntries, ...journalEntryData } = req.body;

      if (journalEntryData.date) {
        journalEntryData.date = new Date(journalEntryData.date);
      }
      journalEntryData.createdBy = user?.id;

      const svc = getAccountingService();
      const result = await svc.createJournalEntry(
        journalEntryData,
        ledgerEntries,
      );
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      if (
        error.name === "ValidationError" ||
        error.message?.includes("balanced")
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

// GET /api/accounting/journal-entries
app.get(
  "/api/accounting/journal-entries",
  authenticate,
  async (_req: Request, res: Response) => {
    try {
      const svc = getAccountingService();
      const entries = await svc.getAllJournalEntries();
      res.status(200).json({ success: true, data: entries });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },
);

// GET /api/accounting/trial-balance
app.get(
  "/api/accounting/trial-balance",
  authenticate,
  async (_req: Request, res: Response) => {
    try {
      const svc = getAccountingService();
      const result = await svc.generateTrialBalance();
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },
);

// GET /api/accounting/income-statement
app.get(
  "/api/accounting/income-statement",
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
      const svc = getAccountingService();
      const result = await svc.generateIncomeStatement(
        new Date(startDate as string),
        new Date(endDate as string),
      );
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },
);

// GET /api/accounting/balance-sheet
app.get(
  "/api/accounting/balance-sheet",
  authenticate,
  async (_req: Request, res: Response) => {
    try {
      const svc = getAccountingService();
      const result = await svc.generateBalanceSheet(new Date());
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },
);

// GET /api/accounting/account/:id/balance
app.get(
  "/api/accounting/account/:id/balance",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { asOfDate } = req.query;
      const resolvedDate = asOfDate ? new Date(asOfDate as string) : new Date();
      const svc = getAccountingService();
      const balance = await svc.getAccountBalance(id, resolvedDate);
      res.status(200).json({
        success: true,
        data: {
          accountId: id,
          balance,
          asOfDate: resolvedDate.toISOString(),
        },
      });
    } catch (error: any) {
      if (
        error.name === "NotFoundError" ||
        error.message?.includes("not found") ||
        error.message?.includes("Account not found")
      ) {
        res.status(404).json({ success: false, error: error.message });
      } else {
        res
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    }
  },
);

// GET /api/accounting/financial-metrics
// Calls accounting service for income statement + balance sheet, then analytics for metrics
app.get(
  "/api/accounting/financial-metrics",
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
        res.status(400).json({
          success: false,
          error: "startDate and endDate are required",
        });
        return;
      }
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      const accountingSvc = getAccountingService();
      const analyticsSvc = getAnalyticsService();

      const incomeStatement = await accountingSvc.generateIncomeStatement(
        start,
        end,
      );
      const balanceSheet = await accountingSvc.generateBalanceSheet(end);
      const result = await analyticsSvc.calculateFinancialMetrics(
        incomeStatement,
        balanceSheet,
      );
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },
);

export default app;
