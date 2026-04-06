import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import paymentService from "./payment.service";
import { ChargeInput, RefundInput } from "./types/payment.types";
import { withRetry } from "./utils/retry.util";
import { logger } from "./utils/logger";

const processedRequestIds = new Set<string>();
const REQUEST_ID_TTL = 24 * 60 * 60 * 1000;

class PaymentController {
  private validateRequest(req: Request, res: Response): boolean {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json({ message: "Validation error", errors: errors.array() });
      return false;
    }
    return true;
  }

  private ensureIdempotency(requestId: string): boolean {
    if (processedRequestIds.has(requestId)) return false;
    processedRequestIds.add(requestId);
    setTimeout(() => processedRequestIds.delete(requestId), REQUEST_ID_TTL);
    return true;
  }

  async createCharge(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const requestId = (req.headers["x-request-id"] as string) || uuidv4();
    try {
      if (!this.validateRequest(req, res)) return;

      if (!this.ensureIdempotency(requestId)) {
        const existingPayment = await paymentService.findByRequestId(requestId);
        if (existingPayment) {
          res.status(200).json(existingPayment);
          return;
        }
        res.status(409).json({
          message: "Duplicate request detected, but payment not found",
          requestId,
        });
        return;
      }

      const { amount, currency, source, metadata } = req.body;
      const userId = (req as any).user?.sub || (req as any).user?.id;

      const chargeInput: ChargeInput = {
        userId,
        amount,
        currency: currency?.toLowerCase() || "usd",
        source,
        metadata: { ...metadata, requestId },
      };

      const payment = await withRetry(
        () => paymentService.createCharge(chargeInput),
        {
          maxRetries: 3,
          initialDelayMs: 300,
          maxDelayMs: 3000,
          backoffFactor: 2,
          retryableErrors: [
            "NETWORK_ERROR",
            "GATEWAY_ERROR",
            "RATE_LIMIT_ERROR",
            "TIMEOUT_ERROR",
          ],
        },
      );

      res.status(201).json(payment);
    } catch (error: any) {
      logger.error("Error creating payment charge: " + error.message);
      next(error);
    }
  }

  async getPaymentById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!this.validateRequest(req, res)) return;
      const { id } = req.params;
      const userId = (req as any).user?.sub || (req as any).user?.id;
      const payment = await paymentService.findById(id);
      if (!payment) {
        res.status(404).json({ message: "Payment not found" });
        return;
      }
      if (payment.userId !== userId) {
        res.status(403).json({
          message: "Forbidden: You do not have access to this payment",
        });
        return;
      }
      res.status(200).json(payment);
    } catch (error: any) {
      logger.error("Error retrieving payment: " + error.message);
      next(error);
    }
  }

  async getPaymentsByUserId(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = (req as any).user?.sub || (req as any).user?.id;
      const payments = await paymentService.findByUserId(userId);
      res.status(200).json(payments);
    } catch (error: any) {
      logger.error("Error retrieving payments: " + error.message);
      next(error);
    }
  }

  async createRefund(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const requestId = (req.headers["x-request-id"] as string) || uuidv4();
    try {
      if (!this.validateRequest(req, res)) return;

      if (!this.ensureIdempotency(requestId)) {
        const existingRefund =
          await paymentService.findRefundByRequestId(requestId);
        if (existingRefund) {
          res.status(200).json(existingRefund);
          return;
        }
        res
          .status(409)
          .json({ message: "Duplicate refund request", requestId });
        return;
      }

      const { paymentId, amount, reason } = req.body;
      const userId = (req as any).user?.sub || (req as any).user?.id;

      const payment = await paymentService.findById(paymentId);
      if (!payment) {
        res.status(404).json({ message: "Payment not found" });
        return;
      }
      if (payment.userId !== userId) {
        res.status(403).json({
          message: "Forbidden: You do not have access to this payment",
        });
        return;
      }

      const refundInput: RefundInput = {
        paymentId,
        amount,
        reason,
        metadata: { requestId },
      };
      const refundedPayment = await withRetry(
        () => paymentService.createRefund(refundInput),
        {
          maxRetries: 3,
          initialDelayMs: 300,
          maxDelayMs: 3000,
          backoffFactor: 2,
        },
      );

      res.status(200).json(refundedPayment);
    } catch (error: any) {
      logger.error("Error processing refund: " + error.message);
      next(error);
    }
  }

  async handleWebhook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const requestId = (req.headers["x-request-id"] as string) || uuidv4();
    const signature = req.headers["stripe-signature"] as string;
    try {
      if (!signature) {
        res.status(400).json({ message: "Missing stripe-signature header" });
        return;
      }

      const idempotencyKey = "webhook_" + signature;
      if (!this.ensureIdempotency(idempotencyKey)) {
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      await paymentService.handleWebhookEvent(
        "stripe",
        req.body,
        signature,
        req.body,
      );
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error("Webhook error: " + error.message);
      res.status(400).json({ message: "Webhook error: " + error.message });
    }
  }
}

export default new PaymentController();
