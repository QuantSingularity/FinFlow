import express from "express";
import paymentController from "./payment.controller";
import {
  chargeValidation,
  paymentIdValidation,
  refundValidation,
} from "./payment.validator";

const router = express.Router();

router.post("/charge", paymentController.createCharge.bind(paymentController));
router.get("/:id", paymentController.getPaymentById.bind(paymentController));
router.get("/", paymentController.getPaymentsByUserId.bind(paymentController));
router.post("/refund", paymentController.createRefund.bind(paymentController));
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleWebhook.bind(paymentController),
);

export default router;
