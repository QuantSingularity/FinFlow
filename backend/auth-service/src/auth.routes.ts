import express from "express";
import authController from "./auth.controller";
import { authenticate } from "./middleware/auth.middleware";
import { validate } from "./middleware/validation.middleware";
import {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
} from "./auth.validator";

const router = express.Router();

router.post(
  "/register",
  validate(registerValidation),
  authController.register.bind(authController),
);

router.post(
  "/login",
  validate(loginValidation),
  authController.login.bind(authController),
);

router.get("/me", authenticate, authController.me.bind(authController));

router.post(
  "/refresh",
  validate(refreshTokenValidation),
  authController.refreshToken.bind(authController),
);

router.post(
  "/logout",
  authenticate,
  authController.logout.bind(authController),
);

router.post(
  "/change-password",
  authenticate,
  authController.changePassword.bind(authController),
);

export default router;
