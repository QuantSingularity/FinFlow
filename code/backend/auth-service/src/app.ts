import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import authRoutes from "./auth.routes";
import authService from "./auth.service";
import config from "../../common/config";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "auth-service" });
});

// JWT authentication middleware for protected routes
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

// Auth routes
app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    // Basic input validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({
        success: false,
        error: "Please provide a valid email address",
      });
      return;
    }
    if (!password || password.length < 8) {
      res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters long",
      });
      return;
    }
    const result = await authService.register({
      ...req.body,
      ipAddress: req.ip,
    });
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: result.id,
          email: result.email,
          firstName: (result as any).firstName,
          lastName: (result as any).lastName,
          role: result.role,
        },
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      },
    });
  } catch (error: any) {
    if (error.name === "BadRequestError") {
      res.status(400).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const result = await authService.login({ ...req.body, ipAddress: req.ip });
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: result.id,
          email: result.email,
          firstName: (result as any).firstName,
          lastName: (result as any).lastName,
          role: result.role,
        },
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      },
    });
  } catch (error: any) {
    if (error.name === "UnauthorizedError") {
      res.status(401).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
});

app.post("/api/auth/refresh-token", async (req: Request, res: Response) => {
  try {
    const tokens = await authService.refreshToken({
      ...req.body,
      ipAddress: req.ip,
    });
    res.status(200).json({ success: true, data: tokens });
  } catch (error: any) {
    if (error.name === "UnauthorizedError") {
      res.status(401).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
});

app.post(
  "/api/auth/logout",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      await authService.logout(user.id, req.ip);
      res
        .status(200)
        .json({ success: true, message: "Logged out successfully" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },
);

app.post("/api/auth/oauth/callback", async (req: Request, res: Response) => {
  try {
    const { provider } = req.body;
    const validProviders = ["GOOGLE", "GITHUB", "MICROSOFT"];
    if (!provider || !validProviders.includes(provider)) {
      res.status(400).json({ success: false, error: "Invalid OAuth provider" });
      return;
    }
    const result = await authService.oauthLogin({
      ...req.body,
      ipAddress: req.ip,
    });
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: result.id,
          email: result.email,
          firstName: (result as any).firstName,
          lastName: (result as any).lastName,
          role: result.role,
        },
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      },
    });
  } catch (error: any) {
    if (error.name === "BadRequestError") {
      res.status(400).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
});

app.put(
  "/api/auth/password",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(
        user.id,
        currentPassword,
        newPassword,
        req.ip,
      );
      res
        .status(200)
        .json({ success: true, message: "Password changed successfully" });
    } catch (error: any) {
      if (
        error.name === "UnauthorizedError" ||
        error.message === "Current password is incorrect"
      ) {
        res.status(401).json({ success: false, error: error.message });
      } else if (
        error.name === "BadRequestError" ||
        error.message?.includes("Password must") ||
        error.message?.includes("characters long")
      ) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    }
  },
);

export default app;
