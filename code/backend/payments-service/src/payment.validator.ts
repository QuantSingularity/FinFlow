import { body, param } from "express-validator";

// Validation rules for payment charge
export const chargeValidation = [
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
  body("currency")
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage("Currency must be a 3-letter code"),
  body("source").isString().withMessage("Payment source token is required"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("Metadata must be an object"),
];

// Validation rules for payment ID parameter
export const paymentIdValidation = [
  param("id").isUUID().withMessage("Payment ID must be a valid UUID"),
];

// Validation rules for refund
export const refundValidation = [
  body("paymentId").isUUID().withMessage("Payment ID must be a valid UUID"),
  body("amount")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
  body("reason")
    .optional()
    .isString()
    .isIn(["duplicate", "fraudulent", "requested_by_customer"])
    .withMessage(
      "Reason must be one of: duplicate, fraudulent, requested_by_customer",
    ),
];

export default {
  chargeValidation,
  paymentIdValidation,
  refundValidation,
};
