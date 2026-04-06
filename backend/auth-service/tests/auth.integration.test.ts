import {
  describe,
  expect,
  test,
  jest,
  beforeEach,
  afterAll,
  afterEach,
} from "@jest/globals";
import request from "supertest";
import app from "../src/app";
import authService from "../src/auth.service";
import userService from "../src/user.service";
import jwt from "jsonwebtoken";
import { auditLog } from "../src/utils/audit.utils";

// Mock dependencies
jest.mock("../src/auth.service");
jest.mock("../src/user.service");
jest.mock("jsonwebtoken");
jest.mock("../src/utils/audit.utils");
jest.mock("../../common/kafka", () => ({
  sendMessage: jest.fn().mockResolvedValue(undefined),
}));

describe("Auth API Integration Tests", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    jest.restoreAllMocks();
  });

  afterAll(() => {
    // Clean up after all tests
    jest.resetModules();
  });

  describe("POST /api/auth/register", () => {
    test("should register a new user successfully", async () => {
      // Arrange
      const registerDto = {
        email: "test@example.com",
        password: "StrongP@ss123",
        firstName: "Test",
        lastName: "User",
      };

      const mockUser = {
        id: "user_123",
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: "user",
        accessToken: "mock_access_token",
        refreshToken: "mock_refresh_token",
      };

      (authService.register as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .post("/api/auth/register")
        .send(registerDto)
        .expect("Content-Type", /json/)
        .expect(201);

      // Assert
      expect(authService.register).toHaveBeenCalledWith({
        ...registerDto,
        ipAddress: expect.any(String),
      });
      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            role: mockUser.role,
          },
          tokens: {
            accessToken: mockUser.accessToken,
            refreshToken: mockUser.refreshToken,
          },
        },
      });
    });

    test("should return 400 when registration data is invalid", async () => {
      // Arrange
      const invalidRegisterDto = {
        email: "invalid-email",
        password: "weak",
      };

      // Act
      const response = await request(app)
        .post("/api/auth/register")
        .send(invalidRegisterDto)
        .expect("Content-Type", /json/)
        .expect(400);

      // Assert
      expect(authService.register).not.toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: expect.any(String),
      });
    });

    test("should return 500 when server error occurs", async () => {
      // Arrange
      const registerDto = {
        email: "test@example.com",
        password: "StrongP@ss123",
        firstName: "Test",
        lastName: "User",
      };

      const error = new Error("Database connection error");
      (authService.register as jest.Mock).mockRejectedValue(error);

      // Act
      const response = await request(app)
        .post("/api/auth/register")
        .send(registerDto)
        .expect("Content-Type", /json/)
        .expect(500);

      // Assert
      expect(authService.register).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: "Internal server error",
      });
    });
  });

  describe("POST /api/auth/login", () => {
    test("should login user successfully", async () => {
      // Arrange
      const loginDto = {
        email: "test@example.com",
        password: "StrongP@ss123",
      };

      const mockUser = {
        id: "user_123",
        email: loginDto.email,
        firstName: "Test",
        lastName: "User",
        role: "user",
        accessToken: "mock_access_token",
        refreshToken: "mock_refresh_token",
      };

      (authService.login as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .post("/api/auth/login")
        .send(loginDto)
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(authService.login).toHaveBeenCalledWith({
        ...loginDto,
        ipAddress: expect.any(String),
      });
      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            role: mockUser.role,
          },
          tokens: {
            accessToken: mockUser.accessToken,
            refreshToken: mockUser.refreshToken,
          },
        },
      });
    });

    test("should return 401 when credentials are invalid", async () => {
      // Arrange
      const loginDto = {
        email: "test@example.com",
        password: "WrongPassword",
      };

      const error = new Error("Invalid credentials");
      error.name = "UnauthorizedError";
      (authService.login as jest.Mock).mockRejectedValue(error);

      // Act
      const response = await request(app)
        .post("/api/auth/login")
        .send(loginDto)
        .expect("Content-Type", /json/)
        .expect(401);

      // Assert
      expect(authService.login).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: "Invalid credentials",
      });
    });
  });

  describe("POST /api/auth/refresh-token", () => {
    test("should refresh token successfully", async () => {
      // Arrange
      const refreshTokenDto = {
        refreshToken: "valid_refresh_token",
      };

      const mockTokens = {
        accessToken: "new_access_token",
      };

      (authService.refreshToken as jest.Mock).mockResolvedValue(mockTokens);

      // Act
      const response = await request(app)
        .post("/api/auth/refresh-token")
        .send(refreshTokenDto)
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(authService.refreshToken).toHaveBeenCalledWith({
        refreshToken: refreshTokenDto.refreshToken,
        ipAddress: expect.any(String),
      });
      expect(response.body).toEqual({
        success: true,
        data: {
          accessToken: mockTokens.accessToken,
        },
      });
    });

    test("should return 401 when refresh token is invalid", async () => {
      // Arrange
      const refreshTokenDto = {
        refreshToken: "invalid_refresh_token",
      };

      const error = new Error("Invalid refresh token");
      error.name = "UnauthorizedError";
      (authService.refreshToken as jest.Mock).mockRejectedValue(error);

      // Act
      const response = await request(app)
        .post("/api/auth/refresh-token")
        .send(refreshTokenDto)
        .expect("Content-Type", /json/)
        .expect(401);

      // Assert
      expect(authService.refreshToken).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: "Invalid refresh token",
      });
    });
  });

  describe("POST /api/auth/logout", () => {
    test("should logout user successfully", async () => {
      // Arrange
      const userId = "user_123";

      // Mock JWT verification
      (jwt.verify as jest.Mock).mockReturnValue({ sub: userId });

      // Act
      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(authService.logout).toHaveBeenCalledWith(
        userId,
        expect.any(String),
      );
      expect(response.body).toEqual({
        success: true,
        message: "Logged out successfully",
      });
    });

    test("should return 401 when not authenticated", async () => {
      // Act
      const response = await request(app)
        .post("/api/auth/logout")
        .expect("Content-Type", /json/)
        .expect(401);

      // Assert
      expect(authService.logout).not.toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: "Authentication required",
      });
    });
  });

  describe("POST /api/auth/oauth/callback", () => {
    test("should handle OAuth login successfully", async () => {
      // Arrange
      const oauthLoginDto = {
        provider: "GOOGLE",
        code: "auth_code_123",
        redirectUri: "http://localhost:3000/oauth/callback",
      };

      const mockUser = {
        id: "user_123",
        email: "oauth@example.com",
        firstName: "OAuth",
        lastName: "User",
        role: "user",
        accessToken: "mock_access_token",
        refreshToken: "mock_refresh_token",
      };

      (authService.oauthLogin as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .post("/api/auth/oauth/callback")
        .send(oauthLoginDto)
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(authService.oauthLogin).toHaveBeenCalledWith({
        ...oauthLoginDto,
        ipAddress: expect.any(String),
      });
      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            role: mockUser.role,
          },
          tokens: {
            accessToken: mockUser.accessToken,
            refreshToken: mockUser.refreshToken,
          },
        },
      });
    });

    test("should return 400 when OAuth provider is invalid", async () => {
      // Arrange
      const invalidOauthLoginDto = {
        provider: "INVALID_PROVIDER",
        code: "auth_code_123",
        redirectUri: "http://localhost:3000/oauth/callback",
      };

      // Act
      const response = await request(app)
        .post("/api/auth/oauth/callback")
        .send(invalidOauthLoginDto)
        .expect("Content-Type", /json/)
        .expect(400);

      // Assert
      expect(authService.oauthLogin).not.toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: expect.any(String),
      });
    });
  });

  describe("PUT /api/auth/password", () => {
    test("should change password successfully", async () => {
      // Arrange
      const userId = "user_123";
      const passwordChangeDto = {
        currentPassword: "CurrentP@ss123",
        newPassword: "NewStrongP@ss456",
      };

      // Mock JWT verification
      (jwt.verify as jest.Mock).mockReturnValue({ sub: userId });

      // Act
      const response = await request(app)
        .put("/api/auth/password")
        .set("Authorization", "Bearer valid_token")
        .send(passwordChangeDto)
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(authService.changePassword).toHaveBeenCalledWith(
        userId,
        passwordChangeDto.currentPassword,
        passwordChangeDto.newPassword,
        expect.any(String),
      );
      expect(response.body).toEqual({
        success: true,
        message: "Password changed successfully",
      });
    });

    test("should return 401 when current password is incorrect", async () => {
      // Arrange
      const userId = "user_123";
      const passwordChangeDto = {
        currentPassword: "WrongCurrentP@ss",
        newPassword: "NewStrongP@ss456",
      };

      // Mock JWT verification
      (jwt.verify as jest.Mock).mockReturnValue({ sub: userId });

      const error = new Error("Current password is incorrect");
      error.name = "UnauthorizedError";
      (authService.changePassword as jest.Mock).mockRejectedValue(error);

      // Act
      const response = await request(app)
        .put("/api/auth/password")
        .set("Authorization", "Bearer valid_token")
        .send(passwordChangeDto)
        .expect("Content-Type", /json/)
        .expect(401);

      // Assert
      expect(authService.changePassword).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: "Current password is incorrect",
      });
    });

    test("should return 400 when new password is weak", async () => {
      // Arrange
      const userId = "user_123";
      const passwordChangeDto = {
        currentPassword: "CurrentP@ss123",
        newPassword: "weak",
      };

      // Mock JWT verification
      (jwt.verify as jest.Mock).mockReturnValue({ sub: userId });

      const error = new Error("Password must be at least 8 characters long");
      (authService.changePassword as jest.Mock).mockRejectedValue(error);

      // Act
      const response = await request(app)
        .put("/api/auth/password")
        .set("Authorization", "Bearer valid_token")
        .send(passwordChangeDto)
        .expect("Content-Type", /json/)
        .expect(400);

      // Assert
      expect(authService.changePassword).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: "Password must be at least 8 characters long",
      });
    });
  });
});
