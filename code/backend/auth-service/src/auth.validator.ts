import { body } from "express-validator";

// Validation rules for user registration
export const registerValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number"),
];

// Validation rules for user login
export const loginValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

// Validation rules for refresh token
export const refreshTokenValidation = [
  body("refreshToken").notEmpty().withMessage("Refresh token is required"),
];

// Validation rules for user update
export const updateUserValidation = [
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("role")
    .optional()
    .isIn(["USER", "ADMIN"])
    .withMessage("Role must be either USER or ADMIN"),
];

export default {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  updateUserValidation,
};
