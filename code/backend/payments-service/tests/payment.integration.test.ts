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
import paymentService from "../src/payment.service";
import { PaymentStatus, ProcessorType } from "../src/types/payment.types";
import jwt from "jsonwebtoken";

// Mock dependencies
jest.mock("../src/payment.service");
jest.mock("../../common/kafka", () => ({
  sendMessage: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("jsonwebtoken", () => ({
  verify: jest.fn().mockReturnValue({ sub: "user_123", role: "admin" }),
  sign: jest.fn().mockReturnValue("mock_access_token"),
  decode: jest.fn().mockReturnValue({ sub: "user_123", role: "admin" }),
}));

describe("Payments API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply default after clearAllMocks (clearMocks:true in config clears implementations in some jest versions)
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: "user_123",
      role: "admin",
    });
  });

  afterEach(() => {
    // Clean up after each test
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    // Clean up after all tests
    jest.resetModules();
    await new Promise<void>((resolve) => setImmediate(resolve));
  });

  describe("POST /api/payments", () => {
    test("should process payment successfully", async () => {
      // Arrange
      const paymentRequest = {
        amount: 100.0,
        currency: "USD",
        source: "card_token_123",
        description: "Test payment",
        metadata: {
          orderId: "order_123",
        },
        processorType: ProcessorType.STRIPE,
      };

      const mockPaymentResponse = {
        id: "payment_123",
        status: PaymentStatus.COMPLETED,
        processorId: "ch_123456",
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        createdAt: new Date(),
      };

      (paymentService.processPayment as jest.Mock).mockResolvedValue(
        mockPaymentResponse,
      );

      // Act
      const response = await request(app)
        .post("/api/payments")
        .set("Authorization", "Bearer valid_token")
        .send(paymentRequest)
        .expect("Content-Type", /json/)
        .expect(201);

      // Assert
      expect(paymentService.processPayment).toHaveBeenCalledWith(
        paymentRequest,
      );
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: mockPaymentResponse.id,
          status: mockPaymentResponse.status,
          amount: mockPaymentResponse.amount,
          currency: mockPaymentResponse.currency,
        }),
      });
    });

    test("should return 400 when payment details are invalid", async () => {
      // Arrange
      const invalidPaymentRequest = {
        amount: -100.0, // Invalid amount
        currency: "USD",
        source: "card_token_123",
        processorType: ProcessorType.STRIPE,
      };

      const error = new Error("Invalid payment details");
      (paymentService.processPayment as jest.Mock).mockRejectedValue(error);

      // Act
      const response = await request(app)
        .post("/api/payments")
        .set("Authorization", "Bearer valid_token")
        .send(invalidPaymentRequest)
        .expect("Content-Type", /json/)
        .expect(400);

      // Assert
      expect(paymentService.processPayment).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: "Invalid payment details",
      });
    });

    test("should return 401 when not authenticated", async () => {
      // Arrange
      const paymentRequest = {
        amount: 100.0,
        currency: "USD",
        source: "card_token_123",
        description: "Test payment",
        processorType: ProcessorType.STRIPE,
      };

      // Act
      const response = await request(app)
        .post("/api/payments")
        .send(paymentRequest)
        .expect("Content-Type", /json/)
        .expect(401);

      // Assert
      expect(paymentService.processPayment).not.toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: "Authentication required",
      });
    });

    test("should return 500 when server error occurs", async () => {
      // Arrange
      const paymentRequest = {
        amount: 100.0,
        currency: "USD",
        source: "card_token_123",
        description: "Test payment",
        processorType: ProcessorType.STRIPE,
      };

      const error = new Error("Payment processor unavailable");
      (paymentService.processPayment as jest.Mock).mockRejectedValue(error);

      // Act
      const response = await request(app)
        .post("/api/payments")
        .set("Authorization", "Bearer valid_token")
        .send(paymentRequest)
        .expect("Content-Type", /json/)
        .expect(500);

      // Assert
      expect(paymentService.processPayment).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: "Internal server error",
      });
    });
  });

  describe("POST /api/payments/:id/refund", () => {
    test("should refund payment successfully", async () => {
      // Arrange
      const paymentId = "payment_123";
      const refundRequest = {
        amount: 100.0,
        reason: "Customer requested",
      };

      const mockRefundResponse = {
        id: "refund_123",
        paymentId,
        amount: refundRequest.amount,
        status: "completed",
        processorId: "re_123456",
        createdAt: new Date(),
      };

      (paymentService.refundPayment as jest.Mock).mockResolvedValue(
        mockRefundResponse,
      );

      // Act
      const response = await request(app)
        .post(`/api/payments/${paymentId}/refund`)
        .set("Authorization", "Bearer valid_token")
        .send(refundRequest)
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(paymentService.refundPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId,
          amount: refundRequest.amount,
          reason: refundRequest.reason,
        }),
      );
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: mockRefundResponse.id,
          paymentId: mockRefundResponse.paymentId,
          amount: mockRefundResponse.amount,
          status: mockRefundResponse.status,
        }),
      });
    });

    test("should return 404 when payment not found", async () => {
      // Arrange
      const nonExistentPaymentId = "non_existent_payment";
      const refundRequest = {
        amount: 100.0,
        reason: "Customer requested",
      };

      const error = new Error("Payment not found");
      error.name = "NotFoundError";
      (paymentService.refundPayment as jest.Mock).mockRejectedValue(error);

      // Act
      const response = await request(app)
        .post(`/api/payments/${nonExistentPaymentId}/refund`)
        .set("Authorization", "Bearer valid_token")
        .send(refundRequest)
        .expect("Content-Type", /json/)
        .expect(404);

      // Assert
      expect(paymentService.refundPayment).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: "Payment not found",
      });
    });

    test("should return 403 when user does not have permission", async () => {
      // Arrange
      const paymentId = "payment_123";
      const refundRequest = {
        amount: 100.0,
        reason: "Customer requested",
      };

      // Mock JWT verification for different user
      (jwt.verify as jest.Mock).mockReturnValue({
        sub: "different_user",
        role: "user", // Not admin
      });

      // Mock findById to return a payment owned by user_123 (not different_user)
      // This makes the ownership check in the route trigger the 403.
      (paymentService.findById as jest.Mock).mockResolvedValue({
        id: paymentId,
        userId: "user_123",
        amount: 100.0,
        currency: "usd",
        status: "COMPLETED",
      });

      // Act
      const response = await request(app)
        .post(`/api/payments/${paymentId}/refund`)
        .set("Authorization", "Bearer valid_token")
        .send(refundRequest)
        .expect("Content-Type", /json/)
        .expect(403);

      // Assert
      expect(paymentService.refundPayment).not.toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: "Permission denied",
      });
    });
  });

  describe("GET /api/payments/:id/status", () => {
    test("should get payment status successfully", async () => {
      // Arrange
      const paymentId = "payment_123";
      const mockStatusResponse = {
        status: PaymentStatus.COMPLETED,
        updatedAt: new Date(),
      };

      (paymentService.getPaymentStatus as jest.Mock).mockResolvedValue(
        mockStatusResponse,
      );

      // Act
      const response = await request(app)
        .get(`/api/payments/${paymentId}/status`)
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(paymentService.getPaymentStatus).toHaveBeenCalledWith(
        paymentId,
        expect.any(String),
        expect.any(String),
      );
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          status: mockStatusResponse.status,
          updatedAt: expect.any(String),
        }),
      });
    });

    test("should return 404 when payment not found", async () => {
      // Arrange
      const nonExistentPaymentId = "non_existent_payment";

      const error = new Error("Payment not found");
      error.name = "NotFoundError";
      (paymentService.getPaymentStatus as jest.Mock).mockRejectedValue(error);

      // Act
      const response = await request(app)
        .get(`/api/payments/${nonExistentPaymentId}/status`)
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(404);

      // Assert
      expect(paymentService.getPaymentStatus).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: "Payment not found",
      });
    });
  });

  describe("GET /api/payments", () => {
    test("should get all payments for user", async () => {
      // Arrange
      const userId = "user_123";
      const mockPayments = [
        {
          id: "payment_1",
          userId,
          amount: 100.0,
          currency: "USD",
          status: PaymentStatus.COMPLETED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "payment_2",
          userId,
          amount: 50.0,
          currency: "USD",
          status: PaymentStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (paymentService.getUserPayments as jest.Mock).mockResolvedValue(
        mockPayments,
      );

      // Act
      const response = await request(app)
        .get("/api/payments")
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(paymentService.getUserPayments).toHaveBeenCalledWith(userId);
      expect(response.body).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: mockPayments[0].id,
            amount: mockPayments[0].amount,
            status: mockPayments[0].status,
          }),
          expect.objectContaining({
            id: mockPayments[1].id,
            amount: mockPayments[1].amount,
            status: mockPayments[1].status,
          }),
        ]),
      });
    });

    test("should return empty array when user has no payments", async () => {
      // Arrange
      const userId = "user_123";

      (paymentService.getUserPayments as jest.Mock).mockResolvedValue([]);

      // Act
      const response = await request(app)
        .get("/api/payments")
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(paymentService.getUserPayments).toHaveBeenCalledWith(userId);
      expect(response.body).toEqual({
        success: true,
        data: [],
      });
    });
  });
});
