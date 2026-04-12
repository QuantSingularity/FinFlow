import { body, param } from "express-validator";

// Validation rules for forecast request
export const createForecastRequestValidation = [
  body("months")
    .optional()
    .isInt({ min: 1, max: 24 })
    .withMessage("Months must be between 1 and 24"),
];

// Validation rules for user ID parameter
export const userIdValidation = [
  param("userId").isString().withMessage("User ID must be a string"),
];

export default {
  createForecastRequestValidation,
  userIdValidation,
};
