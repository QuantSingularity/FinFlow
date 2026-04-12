import { body, param } from "express-validator";

// Validation rules for journal entry creation
export const createJournalEntryValidation = [
  body("invoiceId")
    .optional()
    .isUUID()
    .withMessage("Invoice ID must be a valid UUID"),
  body("debitAccount")
    .isString()
    .notEmpty()
    .withMessage("Debit account is required"),
  body("creditAccount")
    .isString()
    .notEmpty()
    .withMessage("Credit account is required"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
  body("date")
    .optional()
    .isISO8601()
    .withMessage("Date must be a valid date in ISO 8601 format"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
];

// Validation rules for journal entry ID parameter
export const journalEntryIdValidation = [
  param("id").isUUID().withMessage("Journal entry ID must be a valid UUID"),
];

// Validation rules for journal entry update
export const updateJournalEntryValidation = [
  param("id").isUUID().withMessage("Journal entry ID must be a valid UUID"),
  body("debitAccount")
    .optional()
    .isString()
    .notEmpty()
    .withMessage("Debit account cannot be empty"),
  body("creditAccount")
    .optional()
    .isString()
    .notEmpty()
    .withMessage("Credit account cannot be empty"),
  body("amount")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
  body("date")
    .optional()
    .isISO8601()
    .withMessage("Date must be a valid date in ISO 8601 format"),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
];

export default {
  createJournalEntryValidation,
  journalEntryIdValidation,
  updateJournalEntryValidation,
};
