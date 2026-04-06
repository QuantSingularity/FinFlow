import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import paymentService from "./payment.service";
import config from "../../common/config";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "payments-service" });
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

const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const user = (req as any).user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ success: false, error: "Permission denied" });
    return;
  }
  next();
};

// POST /api/payments - process a payment
app.post("/api/payments", authenticate, async (req: Request, res: Response) => {
  try {
    const result = await paymentService.processPayment(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    if (
      error.name === "ValidationError" ||
      error.message === "Invalid payment details"
    ) {
      res.status(400).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
});

// GET /api/payments - get all payments for current user
app.get("/api/payments", authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const payments = await paymentService.getUserPayments(user.id);
    res.status(200).json({ success: true, data: payments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /api/payments/:id/status - get payment status
app.get(
  "/api/payments/:id/status",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const paymentId = req.params.id;
      const payment = await paymentService.findById(paymentId);
      if (!payment) {
        res.status(404).json({ success: false, error: "Payment not found" });
        return;
      }
      const statusResult = await paymentService.getPaymentStatus(
        paymentId,
        payment.processorType,
        payment.processorId || paymentId,
      );
      res.status(200).json({ success: true, data: statusResult });
    } catch (error: any) {
      if (
        error.name === "NotFoundError" ||
        error.message === "Payment not found"
      ) {
        res.status(404).json({ success: false, error: "Payment not found" });
      } else {
        res
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    }
  },
);

// POST /api/payments/:id/refund - refund a payment (admin only)
app.post(
  "/api/payments/:id/refund",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const paymentId = req.params.id;
      const { amount, reason } = req.body;
      const result = await paymentService.refundPayment({
        paymentId,
        amount,
        reason,
        processorType: req.body.processorType,
        processorPaymentId: req.body.processorPaymentId,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      if (
        error.name === "NotFoundError" ||
        error.message === "Payment not found"
      ) {
        res.status(404).json({ success: false, error: "Payment not found" });
      } else {
        res
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    }
  },
);

export default app;
