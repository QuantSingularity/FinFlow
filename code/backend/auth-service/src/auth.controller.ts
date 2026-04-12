import { Request, Response, NextFunction } from "express";
import authService from "./auth.service";
import { LoginDTO, RegisterDTO, RefreshTokenDTO } from "./auth.types";

class AuthController {
  async register(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const registerDto: RegisterDTO = { ...req.body, ipAddress: req.ip };
      const result = await authService.register(registerDto);
      res.status(201).json({
        id: result.id,
        email: result.email,
        role: result.role,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const loginDto: LoginDTO = { ...req.body, ipAddress: req.ip };
      const result = await authService.login(loginDto);
      res.status(200).json({
        id: result.id,
        email: result.email,
        role: result.role,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      res.status(200).json({ id: user.id, email: user.email, role: user.role });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { refreshToken }: RefreshTokenDTO = req.body;
      if (!refreshToken) {
        res.status(400).json({ message: "Refresh token is required" });
        return;
      }
      const tokens = await authService.refreshToken({
        refreshToken,
        ipAddress: req.ip,
      });
      res.status(200).json(tokens);
    } catch (error: any) {
      if (error.name === "UnauthorizedError") {
        res.status(401).json({ message: error.message });
        return;
      }
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      await authService.logout(user.id, req.ip);
      res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(
        user.id,
        currentPassword,
        newPassword,
        req.ip,
      );
      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      next(error);
    }
  }

  async oauthCallback(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await authService.oauthLogin({
        ...req.body,
        ipAddress: req.ip,
      });
      res.status(200).json({
        id: result.id,
        email: result.email,
        role: result.role,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
