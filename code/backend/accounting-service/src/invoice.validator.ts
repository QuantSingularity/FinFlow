import { body, param } from "express-validator";

// Validation rules for invoice creation
export const createInvoiceValidation = [
  body("client").isString().notEmpty().withMessage("Client name is required"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
  body("dueDate")
    .isISO8601()
    .withMessage("Due date must be a valid date in ISO 8601 format"),
  body("status")
    .optional()
    .isIn(["PENDING", "PAID", "OVERDUE", "CANCELLED"])
    .withMessage("Status must be one of: PENDING, PAID, OVERDUE, CANCELLED"),
];

// Validation rules for invoice ID parameter
export const invoiceIdValidation = [
  param("id").isUUID().withMessage("Invoice ID must be a valid UUID"),
];

// Validation rules for invoice update
export const updateInvoiceValidation = [
  param("id").isUUID().withMessage("Invoice ID must be a valid UUID"),
  body("client")
    .optional()
    .isString()
    .notEmpty()
    .withMessage("Client name cannot be empty"),
  body("amount")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Due date must be a valid date in ISO 8601 format"),
  body("status")
    .optional()
    .isIn(["PENDING", "PAID", "OVERDUE", "CANCELLED"])
    .withMessage("Status must be one of: PENDING, PAID, OVERDUE, CANCELLED"),
];

export default {
  createInvoiceValidation,
  invoiceIdValidation,
  updateInvoiceValidation,
};
