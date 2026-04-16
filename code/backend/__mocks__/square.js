"use strict";

const Environment = { Sandbox: "sandbox", Production: "production" };

const ApiError = class ApiError extends Error {
  constructor(message) {
    super(message);
    this.name = "ApiError";
  }
};

const Client = jest.fn().mockImplementation(() => ({
  paymentsApi: {
    createPayment: jest.fn().mockResolvedValue({
      result: { payment: { id: "sq_test_123", status: "COMPLETED" } },
    }),
    getPayment: jest.fn().mockResolvedValue({
      result: { payment: { id: "sq_test_123", status: "COMPLETED" } },
    }),
  },
  refundsApi: {
    refundPayment: jest.fn().mockResolvedValue({
      result: { refund: { id: "sq_refund_123", status: "COMPLETED" } },
    }),
  },
  webhooksHelper: {
    isValidWebhookEventSignature: jest.fn().mockReturnValue(true),
  },
}));

module.exports = { Client, Environment, ApiError };
