import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import axios from "axios";
import paymentService from "../paymentService";

// Mock axios
jest.mock("axios");

describe("Payment Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("processPayment", () => {
    test("should process payment successfully", async () => {
      // Arrange
      const paymentData = {
        amount: 100,
        currency: "USD",
        source: "card_token_123",
        description: "Test payment",
        processorType: "STRIPE",
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            id: "payment_123",
            status: "COMPLETED",
            amount: 100,
            currency: "USD",
            processorId: "ch_123456",
            createdAt: "2025-05-20T14:30:00Z",
          },
        },
      };

      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await paymentService.processPayment(paymentData);

      // Assert
      expect(axios.post).toHaveBeenCalledWith(
        "/api/payments",
        paymentData,
        expect.any(Object),
      );
      expect(result).toEqual(mockResponse.data.data);
    });

    test("should throw error when payment processing fails", async () => {
      // Arrange
      const paymentData = {
        amount: 100,
        currency: "USD",
        source: "invalid_token",
        description: "Test payment",
        processorType: "STRIPE",
      };

      const errorResponse = {
        response: {
          data: {
            success: false,
            error: "Invalid payment source",
          },
          status: 400,
        },
      };

      (axios.post as jest.Mock).mockRejectedValue(errorResponse);

      // Act & Assert
      await expect(paymentService.processPayment(paymentData)).rejects.toThrow(
        "Invalid payment source",
      );
    });
  });

  describe("getPayments", () => {
    test("should fetch payments successfully", async () => {
      // Arrange
      const mockPayments = [
        {
          id: "payment_1",
          status: "COMPLETED",
          amount: 100,
          currency: "USD",
          createdAt: "2025-05-20T14:30:00Z",
        },
        {
          id: "payment_2",
          status: "PENDING",
          amount: 200,
          currency: "USD",
          createdAt: "2025-05-20T14:35:00Z",
        },
      ];

      const mockResponse = {
        data: {
          success: true,
          data: mockPayments,
        },
      };

      (axios.get as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await paymentService.getPayments();

      // Assert
      expect(axios.get).toHaveBeenCalledWith(
        "/api/payments",
        expect.any(Object),
      );
      expect(result).toEqual(mockPayments);
    });

    test("should throw error when fetching payments fails", async () => {
      // Arrange
      const errorResponse = {
        response: {
          data: {
            success: false,
            error: "Failed to fetch payments",
          },
          status: 500,
        },
      };

      (axios.get as jest.Mock).mockRejectedValue(errorResponse);

      // Act & Assert
      await expect(paymentService.getPayments()).rejects.toThrow(
        "Failed to fetch payments",
      );
    });
  });

  describe("getPaymentStatus", () => {
    test("should get payment status successfully", async () => {
      // Arrange
      const paymentId = "payment_123";
      const mockStatus = {
        status: "COMPLETED",
        updatedAt: "2025-05-20T14:40:00Z",
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockStatus,
        },
      };

      (axios.get as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await paymentService.getPaymentStatus(paymentId);

      // Assert
      expect(axios.get).toHaveBeenCalledWith(
        `/api/payments/${paymentId}/status`,
        expect.any(Object),
      );
      expect(result).toEqual(mockStatus);
    });

    test("should throw error when payment not found", async () => {
      // Arrange
      const nonExistentPaymentId = "non_existent_payment";
      const errorResponse = {
        response: {
          data: {
            success: false,
            error: "Payment not found",
          },
          status: 404,
        },
      };

      (axios.get as jest.Mock).mockRejectedValue(errorResponse);

      // Act & Assert
      await expect(
        paymentService.getPaymentStatus(nonExistentPaymentId),
      ).rejects.toThrow("Payment not found");
    });
  });

  describe("refundPayment", () => {
    test("should refund payment successfully", async () => {
      // Arrange
      const paymentId = "payment_123";
      const refundData = {
        amount: 100,
        reason: "Customer requested",
      };

      const mockRefund = {
        id: "refund_123",
        paymentId,
        amount: 100,
        status: "completed",
        createdAt: "2025-05-20T14:45:00Z",
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockRefund,
        },
      };

      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await paymentService.refundPayment(paymentId, refundData);

      // Assert
      expect(axios.post).toHaveBeenCalledWith(
        `/api/payments/${paymentId}/refund`,
        refundData,
        expect.any(Object),
      );
      expect(result).toEqual(mockRefund);
    });

    test("should throw error when refund fails", async () => {
      // Arrange
      const paymentId = "payment_123";
      const refundData = {
        amount: 200, // More than original payment
        reason: "Customer requested",
      };

      const errorResponse = {
        response: {
          data: {
            success: false,
            error: "Refund amount exceeds payment amount",
          },
          status: 400,
        },
      };

      (axios.post as jest.Mock).mockRejectedValue(errorResponse);

      // Act & Assert
      await expect(
        paymentService.refundPayment(paymentId, refundData),
      ).rejects.toThrow("Refund amount exceeds payment amount");
    });
  });
});
