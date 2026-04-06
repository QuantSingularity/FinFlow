import { describe, expect, test, jest, beforeEach } from "@jest/globals";
import paymentService from "../src/payment.service";
import paymentProcessorFactory from "../src/factories/payment-processor.factory";
import { PaymentStatus, ProcessorType } from "../src/types/payment.types";

jest.mock("../src/factories/payment-processor.factory");
jest.mock("../src/models/payment.model");
jest.mock("../../common/kafka", () => ({
  sendMessage: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../src/utils/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

describe("PaymentService", () => {
  const mockProcessor = {
    getName: jest.fn().mockReturnValue("stripe"),
    processPayment: jest.fn(),
    refundPayment: jest.fn(),
    getPaymentStatus: jest.fn(),
    validatePaymentDetails: jest.fn(),
    createCharge: jest.fn(),
    createRefund: jest.fn(),
    retrieveCharge: jest.fn(),
    createPaymentIntent: jest.fn(),
    verifyWebhookSignature: jest.fn(),
    processWebhookEvent: jest.fn(),
    getClientConfig: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (paymentProcessorFactory.getProcessor as jest.Mock).mockReturnValue(
      mockProcessor,
    );
  });

  describe("processPayment", () => {
    test("should process payment successfully", async () => {
      const paymentDetails = {
        amount: 100.0,
        currency: "USD",
        source: "card_token_123",
        description: "Test payment",
        metadata: { orderId: "order_123" },
        processorType: ProcessorType.STRIPE,
      };

      const processorResponse = {
        id: "payment_123",
        status: PaymentStatus.COMPLETED,
        processorId: "ch_123456",
        amount: paymentDetails.amount,
        currency: paymentDetails.currency,
        createdAt: new Date(),
      };

      mockProcessor.validatePaymentDetails.mockReturnValue(true);
      mockProcessor.processPayment.mockResolvedValue(processorResponse);

      const result = await paymentService.processPayment(paymentDetails);

      expect(paymentProcessorFactory.getProcessor).toHaveBeenCalledWith(
        ProcessorType.STRIPE,
      );
      expect(mockProcessor.validatePaymentDetails).toHaveBeenCalledWith(
        paymentDetails,
      );
      expect(mockProcessor.processPayment).toHaveBeenCalledWith(paymentDetails);
      expect(result).toEqual(processorResponse);
    });

    test("should throw error when payment details are invalid", async () => {
      const paymentDetails = {
        amount: -100.0,
        currency: "USD",
        source: "card_token_123",
        processorType: ProcessorType.STRIPE,
      };

      mockProcessor.validatePaymentDetails.mockReturnValue(false);

      await expect(
        paymentService.processPayment(paymentDetails),
      ).rejects.toThrow("Invalid payment details");
      expect(mockProcessor.processPayment).not.toHaveBeenCalled();
    });

    test("should throw error when processor type is invalid", async () => {
      const paymentDetails = {
        amount: 100.0,
        currency: "USD",
        source: "card_token_123",
        processorType: "INVALID_PROCESSOR" as ProcessorType,
      };

      (paymentProcessorFactory.getProcessor as jest.Mock).mockImplementation(
        () => {
          throw new Error("Invalid processor type");
        },
      );

      await expect(
        paymentService.processPayment(paymentDetails),
      ).rejects.toThrow("Invalid processor type");
      expect(mockProcessor.processPayment).not.toHaveBeenCalled();
    });

    test("should handle processor errors during payment processing", async () => {
      const paymentDetails = {
        amount: 100.0,
        currency: "USD",
        source: "card_token_123",
        processorType: ProcessorType.STRIPE,
      };

      const processorError = new Error("Payment processor error");
      mockProcessor.validatePaymentDetails.mockReturnValue(true);
      mockProcessor.processPayment.mockRejectedValue(processorError);

      await expect(
        paymentService.processPayment(paymentDetails),
      ).rejects.toThrow("Payment processor error");
    });
  });

  describe("refundPayment", () => {
    test("should refund payment successfully", async () => {
      const refundDetails = {
        paymentId: "payment_123",
        amount: 100.0,
        reason: "Customer requested",
        processorType: ProcessorType.STRIPE,
        processorPaymentId: "ch_123456",
      };

      const refundResponse = {
        id: "refund_123",
        paymentId: refundDetails.paymentId,
        amount: refundDetails.amount,
        status: "completed",
        processorId: "re_123456",
        createdAt: new Date(),
      };

      mockProcessor.refundPayment.mockResolvedValue(refundResponse);

      const result = await paymentService.refundPayment(refundDetails);

      expect(paymentProcessorFactory.getProcessor).toHaveBeenCalledWith(
        ProcessorType.STRIPE,
      );
      expect(mockProcessor.refundPayment).toHaveBeenCalledWith(refundDetails);
      expect(result).toEqual(refundResponse);
    });

    test("should throw error when refund fails", async () => {
      const refundDetails = {
        paymentId: "payment_123",
        amount: 100.0,
        reason: "Customer requested",
        processorType: ProcessorType.STRIPE,
        processorPaymentId: "ch_123456",
      };

      const refundError = new Error("Refund failed");
      mockProcessor.refundPayment.mockRejectedValue(refundError);

      await expect(paymentService.refundPayment(refundDetails)).rejects.toThrow(
        "Refund failed",
      );
    });
  });

  describe("getPaymentStatus", () => {
    test("should get payment status successfully", async () => {
      const paymentId = "payment_123";
      const processorType = ProcessorType.STRIPE;
      const processorPaymentId = "ch_123456";

      const statusResponse = {
        status: PaymentStatus.COMPLETED,
        updatedAt: new Date(),
      };

      mockProcessor.getPaymentStatus.mockResolvedValue(statusResponse);

      const result = await paymentService.getPaymentStatus(
        paymentId,
        processorType,
        processorPaymentId,
      );

      expect(paymentProcessorFactory.getProcessor).toHaveBeenCalledWith(
        processorType,
      );
      expect(mockProcessor.getPaymentStatus).toHaveBeenCalledWith(
        processorPaymentId,
      );
      expect(result).toEqual(statusResponse);
    });

    test("should throw error when getting status fails", async () => {
      const paymentId = "payment_123";
      const processorType = ProcessorType.STRIPE;
      const processorPaymentId = "ch_123456";

      const statusError = new Error("Status check failed");
      mockProcessor.getPaymentStatus.mockRejectedValue(statusError);

      await expect(
        paymentService.getPaymentStatus(
          paymentId,
          processorType,
          processorPaymentId,
        ),
      ).rejects.toThrow("Status check failed");
    });
  });

  describe("getUserPayments", () => {
    test("should return payments for a user", async () => {
      const paymentModel = require("../src/models/payment.model").default;
      const mockPayments = [{ id: "p1", userId: "user_123", amount: 100 }];
      paymentModel.findByUserId = jest.fn().mockResolvedValue(mockPayments);

      const result = await paymentService.getUserPayments("user_123");
      expect(result).toEqual(mockPayments);
    });
  });
});
