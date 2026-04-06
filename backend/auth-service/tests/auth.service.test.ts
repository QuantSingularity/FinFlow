import { describe, expect, test, jest, beforeEach } from "@jest/globals";
import authService from "../src/auth.service";
import userService from "../src/user.service";
import jwt from "jsonwebtoken";
import { comparePassword, hashPassword } from "../src/utils/password.utils";
import { auditLog } from "../src/utils/audit.utils";
import { OAuthProviderType } from "../src/types/auth.types";
import axios from "axios";

// Mock dependencies
jest.mock("../src/user.service");
jest.mock("jsonwebtoken");
jest.mock("../src/utils/password.utils");
jest.mock("../src/utils/audit.utils");
jest.mock("../../common/kafka", () => ({
  sendMessage: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("axios");

describe("AuthService", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe("register", () => {
    test("should register a new user successfully", async () => {
      // Arrange
      const registerDto = {
        email: "test@example.com",
        password: "StrongP@ss123",
        firstName: "Test",
        lastName: "User",
        ipAddress: "127.0.0.1",
      };

      const hashedPassword = "hashed_password";
      const userId = "user_123";
      const userRole = "user";
      const accessToken = "access_token_123";
      const refreshToken = "refresh_token_123";

      const mockUser = {
        id: userId,
        email: registerDto.email,
        role: userRole,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock implementations
      (hashPassword as jest.Mock).mockResolvedValue(hashedPassword);
      (userService.create as jest.Mock).mockResolvedValue(mockUser);
      (jwt.sign as jest.Mock).mockImplementation((payload, secret, options) => {
        if (
          options?.expiresIn === "1h" ||
          options?.expiresIn === process.env.JWT_EXPIRES_IN
        ) {
          return accessToken;
        }
        return refreshToken;
      });

      // Act
      const result = await authService.register(registerDto);

      // Assert
      expect(hashPassword).toHaveBeenCalledWith(registerDto.password);
      expect(userService.create).toHaveBeenCalledWith({
        email: registerDto.email,
        hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      });
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(userService.updateRefreshToken).toHaveBeenCalledWith(
        userId,
        refreshToken,
      );
      expect(auditLog).toHaveBeenCalledWith({
        action: "USER_REGISTER",
        userId,
        resourceType: "USER",
        resourceId: userId,
        metadata: {
          email: registerDto.email,
          ipAddress: registerDto.ipAddress,
        },
      });
      expect(result).toEqual({
        ...mockUser,
        accessToken,
        refreshToken,
      });
    });

    test("should validate password strength during registration", async () => {
      // Arrange
      const registerDto = {
        email: "test@example.com",
        password: "weak",
        firstName: "Test",
        lastName: "User",
        ipAddress: "127.0.0.1",
      };

      // Act & Assert
      await expect(authService.register(registerDto)).rejects.toThrow(
        "Password must be at least 8 characters long",
      );
    });

    test("should handle errors during registration", async () => {
      // Arrange
      const registerDto = {
        email: "test@example.com",
        password: "StrongP@ss123",
        firstName: "Test",
        lastName: "User",
        ipAddress: "127.0.0.1",
      };

      const error = new Error("Database error");
      (hashPassword as jest.Mock).mockResolvedValue("hashed_password");
      (userService.create as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(authService.register(registerDto)).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("login", () => {
    test("should login user successfully", async () => {
      // Arrange
      const loginDto = {
        email: "test@example.com",
        password: "StrongP@ss123",
        ipAddress: "127.0.0.1",
      };

      const userId = "user_123";
      const userRole = "user";
      const hashedPassword = "hashed_password";
      const accessToken = "access_token_123";
      const refreshToken = "refresh_token_123";

      const mockUser = {
        id: userId,
        email: loginDto.email,
        hashedPassword,
        role: userRole,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock implementations
      (userService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockImplementation((payload, secret, options) => {
        if (
          options?.expiresIn === "1h" ||
          options?.expiresIn === process.env.JWT_EXPIRES_IN
        ) {
          return accessToken;
        }
        return refreshToken;
      });

      // Act
      const result = await authService.login(loginDto);

      // Assert
      expect(userService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(comparePassword).toHaveBeenCalledWith(
        loginDto.password,
        hashedPassword,
      );
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(userService.updateRefreshToken).toHaveBeenCalledWith(
        userId,
        refreshToken,
      );
      expect(auditLog).toHaveBeenCalledWith({
        action: "LOGIN_SUCCESS",
        userId,
        resourceType: "USER",
        resourceId: userId,
        metadata: {
          email: loginDto.email,
          ipAddress: loginDto.ipAddress,
        },
      });
      expect(result).toEqual({
        ...mockUser,
        accessToken,
        refreshToken,
      });
    });

    test("should fail login with invalid email", async () => {
      // Arrange
      const loginDto = {
        email: "nonexistent@example.com",
        password: "StrongP@ss123",
        ipAddress: "127.0.0.1",
      };

      // Mock implementations
      (userService.findByEmail as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(loginDto)).rejects.toThrow(
        "Invalid credentials",
      );
      expect(auditLog).not.toHaveBeenCalled();
    });

    test("should fail login with invalid password", async () => {
      // Arrange
      const loginDto = {
        email: "test@example.com",
        password: "WrongPassword",
        ipAddress: "127.0.0.1",
      };

      const userId = "user_123";
      const hashedPassword = "hashed_password";

      const mockUser = {
        id: userId,
        email: loginDto.email,
        hashedPassword,
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock implementations
      (userService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (comparePassword as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(loginDto)).rejects.toThrow(
        "Invalid credentials",
      );
      expect(auditLog).toHaveBeenCalledWith({
        action: "LOGIN_FAILED",
        resourceType: "USER",
        resourceId: userId,
        metadata: {
          email: loginDto.email,
          reason: "INVALID_PASSWORD",
          ipAddress: loginDto.ipAddress,
        },
      });
    });
  });

  describe("oauthLogin", () => {
    test("should login with Google OAuth successfully for new user", async () => {
      // Arrange
      const oauthLoginDto = {
        provider: OAuthProviderType.GOOGLE,
        code: "auth_code_123",
        redirectUri: "http://localhost:3000/oauth/callback",
        ipAddress: "127.0.0.1",
      };

      const accessToken = "google_access_token";
      const userId = "user_123";
      const userEmail = "oauth@example.com";
      const jwtAccessToken = "jwt_access_token";
      const jwtRefreshToken = "jwt_refresh_token";

      // Mock axios responses
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { access_token: accessToken },
      });

      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          sub: "google_user_123",
          email: userEmail,
          given_name: "OAuth",
          family_name: "User",
        },
      });

      // Mock user service
      (userService.findByEmail as jest.Mock).mockResolvedValue(null);
      (userService.create as jest.Mock).mockResolvedValue({
        id: userId,
        email: userEmail,
        role: "user",
        oauthProvider: OAuthProviderType.GOOGLE,
        oauthId: "google_user_123",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock JWT
      (jwt.sign as jest.Mock).mockImplementation((payload, secret, options) => {
        if (
          options?.expiresIn === "1h" ||
          options?.expiresIn === process.env.JWT_EXPIRES_IN
        ) {
          return jwtAccessToken;
        }
        return jwtRefreshToken;
      });

      // Act
      const result = await authService.oauthLogin(oauthLoginDto);

      // Assert
      expect(axios.post).toHaveBeenCalledWith(
        "https://oauth2.googleapis.com/token",
        expect.any(Object),
      );
      expect(axios.get).toHaveBeenCalledWith(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        expect.any(Object),
      );
      expect(userService.findByEmail).toHaveBeenCalledWith(userEmail);
      expect(userService.create).toHaveBeenCalledWith({
        email: userEmail,
        firstName: "OAuth",
        lastName: "User",
        oauthProvider: OAuthProviderType.GOOGLE,
        oauthId: "google_user_123",
      });
      expect(auditLog).toHaveBeenCalledWith({
        action: "OAUTH_LOGIN",
        userId,
        resourceType: "USER",
        resourceId: userId,
        metadata: {
          email: userEmail,
          provider: OAuthProviderType.GOOGLE,
          ipAddress: oauthLoginDto.ipAddress,
        },
      });
      expect(result).toEqual({
        id: userId,
        email: userEmail,
        role: "user",
        oauthProvider: OAuthProviderType.GOOGLE,
        oauthId: "google_user_123",
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        accessToken: jwtAccessToken,
        refreshToken: jwtRefreshToken,
      });
    });

    test("should login with OAuth for existing user", async () => {
      // Arrange
      const oauthLoginDto = {
        provider: OAuthProviderType.GOOGLE,
        code: "auth_code_123",
        redirectUri: "http://localhost:3000/oauth/callback",
        ipAddress: "127.0.0.1",
      };

      const accessToken = "google_access_token";
      const userId = "user_123";
      const userEmail = "existing@example.com";
      const jwtAccessToken = "jwt_access_token";
      const jwtRefreshToken = "jwt_refresh_token";

      // Mock axios responses
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: { access_token: accessToken },
      });

      (axios.get as jest.Mock).mockResolvedValueOnce({
        data: {
          sub: "google_user_123",
          email: userEmail,
          given_name: "Existing",
          family_name: "User",
        },
      });

      // Mock user service for existing user
      (userService.findByEmail as jest.Mock).mockResolvedValue({
        id: userId,
        email: userEmail,
        role: "user",
        oauthProvider: OAuthProviderType.GOOGLE,
        oauthId: "google_user_123",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock JWT
      (jwt.sign as jest.Mock).mockImplementation((payload, secret, options) => {
        if (
          options?.expiresIn === "1h" ||
          options?.expiresIn === process.env.JWT_EXPIRES_IN
        ) {
          return jwtAccessToken;
        }
        return jwtRefreshToken;
      });

      // Act
      const result = await authService.oauthLogin(oauthLoginDto);

      // Assert
      expect(userService.create).not.toHaveBeenCalled(); // Should not create a new user
      expect(userService.updateRefreshToken).toHaveBeenCalledWith(
        userId,
        jwtRefreshToken,
      );
      expect(result.accessToken).toBe(jwtAccessToken);
      expect(result.refreshToken).toBe(jwtRefreshToken);
    });
  });

  describe("refreshToken", () => {
    test("should refresh token successfully", async () => {
      // Arrange
      const refreshTokenDto = {
        refreshToken: "valid_refresh_token",
        ipAddress: "127.0.0.1",
      };

      const userId = "user_123";
      const userRole = "user";
      const newAccessToken = "new_access_token";

      // Mock JWT verify
      (jwt.verify as jest.Mock).mockReturnValue({
        sub: userId,
        role: userRole,
      });

      // Mock user service
      (userService.findById as jest.Mock).mockResolvedValue({
        id: userId,
        role: userRole,
        refreshToken: refreshTokenDto.refreshToken,
      });

      // Mock JWT sign
      (jwt.sign as jest.Mock).mockReturnValue(newAccessToken);

      // Act
      const result = await authService.refreshToken(refreshTokenDto);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(
        refreshTokenDto.refreshToken,
        expect.any(String),
      );
      expect(userService.findById).toHaveBeenCalledWith(userId);
      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: userId, role: userRole },
        expect.any(String),
        expect.any(Object),
      );
      expect(auditLog).toHaveBeenCalledWith({
        action: "TOKEN_REFRESH_SUCCESS",
        userId,
        resourceType: "TOKEN",
        metadata: {
          ipAddress: refreshTokenDto.ipAddress,
        },
      });
      expect(result).toEqual({ accessToken: newAccessToken });
    });

    test("should fail with invalid refresh token", async () => {
      // Arrange
      const refreshTokenDto = {
        refreshToken: "invalid_refresh_token",
        ipAddress: "127.0.0.1",
      };

      // Mock JWT verify to throw error
      (jwt.verify as jest.Mock).mockImplementation(() => {
        const error = new Error("Invalid token");
        error.name = "JsonWebTokenError";
        throw error;
      });

      // Act & Assert
      await expect(authService.refreshToken(refreshTokenDto)).rejects.toThrow(
        "Invalid refresh token",
      );
      expect(auditLog).not.toHaveBeenCalled();
    });

    test("should fail when user not found", async () => {
      // Arrange
      const refreshTokenDto = {
        refreshToken: "valid_refresh_token",
        ipAddress: "127.0.0.1",
      };

      const userId = "user_123";
      const userRole = "user";

      // Mock JWT verify
      (jwt.verify as jest.Mock).mockReturnValue({
        sub: userId,
        role: userRole,
      });

      // Mock user service to return null (user not found)
      (userService.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(authService.refreshToken(refreshTokenDto)).rejects.toThrow(
        "Invalid refresh token",
      );
      expect(auditLog).not.toHaveBeenCalled();
    });

    test("should fail when stored refresh token does not match", async () => {
      // Arrange
      const refreshTokenDto = {
        refreshToken: "valid_refresh_token",
        ipAddress: "127.0.0.1",
      };

      const userId = "user_123";
      const userRole = "user";

      // Mock JWT verify
      (jwt.verify as jest.Mock).mockReturnValue({
        sub: userId,
        role: userRole,
      });

      // Mock user service to return user with different refresh token
      (userService.findById as jest.Mock).mockResolvedValue({
        id: userId,
        role: userRole,
        refreshToken: "different_refresh_token",
      });

      // Act & Assert
      await expect(authService.refreshToken(refreshTokenDto)).rejects.toThrow(
        "Invalid refresh token",
      );
      expect(auditLog).not.toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    test("should logout user successfully", async () => {
      // Arrange
      const userId = "user_123";
      const ipAddress = "127.0.0.1";

      // Act
      await authService.logout(userId, ipAddress);

      // Assert
      expect(userService.updateRefreshToken).toHaveBeenCalledWith(userId, null);
      expect(auditLog).toHaveBeenCalledWith({
        action: "LOGOUT",
        userId,
        resourceType: "USER",
        resourceId: userId,
        metadata: { ipAddress },
      });
    });

    test("should handle errors during logout", async () => {
      // Arrange
      const userId = "user_123";
      const ipAddress = "127.0.0.1";
      const error = new Error("Database error");

      // Mock user service to throw error
      (userService.updateRefreshToken as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(authService.logout(userId, ipAddress)).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("changePassword", () => {
    test("should change password successfully", async () => {
      // Arrange
      const userId = "user_123";
      const currentPassword = "CurrentP@ss123";
      const newPassword = "NewStrongP@ss456";
      const ipAddress = "127.0.0.1";
      const hashedPassword = "current_hashed_password";
      const newHashedPassword = "new_hashed_password";

      // Mock user service
      (userService.findById as jest.Mock).mockResolvedValue({
        id: userId,
        hashedPassword,
      });

      // Mock password utils
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (hashPassword as jest.Mock).mockResolvedValue(newHashedPassword);

      // Act
      await authService.changePassword(
        userId,
        currentPassword,
        newPassword,
        ipAddress,
      );

      // Assert
      expect(userService.findById).toHaveBeenCalledWith(userId);
      expect(comparePassword).toHaveBeenCalledWith(
        currentPassword,
        hashedPassword,
      );
      expect(hashPassword).toHaveBeenCalledWith(newPassword);
      expect(userService.update).toHaveBeenCalledWith(userId, {
        hashedPassword: newHashedPassword,
      });
      expect(userService.updateRefreshToken).toHaveBeenCalledWith(userId, null);
      expect(auditLog).toHaveBeenCalledWith({
        action: "PASSWORD_CHANGED",
        userId,
        resourceType: "USER",
        resourceId: userId,
        metadata: { ipAddress },
      });
    });

    test("should fail when current password is incorrect", async () => {
      // Arrange
      const userId = "user_123";
      const currentPassword = "WrongP@ss123";
      const newPassword = "NewStrongP@ss456";
      const ipAddress = "127.0.0.1";
      const hashedPassword = "current_hashed_password";

      // Mock user service
      (userService.findById as jest.Mock).mockResolvedValue({
        id: userId,
        hashedPassword,
      });

      // Mock password utils to return false (incorrect password)
      (comparePassword as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        authService.changePassword(
          userId,
          currentPassword,
          newPassword,
          ipAddress,
        ),
      ).rejects.toThrow("Current password is incorrect");

      expect(auditLog).toHaveBeenCalledWith({
        action: "PASSWORD_CHANGE_FAILED",
        userId,
        resourceType: "USER",
        resourceId: userId,
        metadata: {
          reason: "INVALID_CURRENT_PASSWORD",
          ipAddress,
        },
      });
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userService.update).not.toHaveBeenCalled();
    });

    test("should fail when new password does not meet strength requirements", async () => {
      // Arrange
      const userId = "user_123";
      const currentPassword = "CurrentP@ss123";
      const newPassword = "weak";
      const ipAddress = "127.0.0.1";
      const hashedPassword = "current_hashed_password";

      // Mock user service
      (userService.findById as jest.Mock).mockResolvedValue({
        id: userId,
        hashedPassword,
      });

      // Mock password utils
      (comparePassword as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(
        authService.changePassword(
          userId,
          currentPassword,
          newPassword,
          ipAddress,
        ),
      ).rejects.toThrow("Password must be at least 8 characters long");

      expect(hashPassword).not.toHaveBeenCalled();
      expect(userService.update).not.toHaveBeenCalled();
    });
  });
});
