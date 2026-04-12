import { body, param } from "express-validator";

// Validation rules for transaction creation
export const createTransactionValidation = [
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
  body("category")
    .optional()
    .isString()
    .withMessage("Category must be a string"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
  body("date")
    .optional()
    .isISO8601()
    .withMessage("Date must be a valid date in ISO 8601 format"),
];

// Validation rules for transaction ID parameter
export const transactionIdValidation = [
  param("id").isUUID().withMessage("Transaction ID must be a valid UUID"),
];

// Validation rules for transaction update
export const updateTransactionValidation = [
  param("id").isUUID().withMessage("Transaction ID must be a valid UUID"),
  body("amount")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
  body("category")
    .optional()
    .isString()
    .withMessage("Category must be a string"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
  body("date")
    .optional()
    .isISO8601()
    .withMessage("Date must be a valid date in ISO 8601 format"),
];

export default {
  createTransactionValidation,
  transactionIdValidation,
  updateTransactionValidation,
};
