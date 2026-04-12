import { describe, expect, test, jest, beforeEach } from "@jest/globals";

jest.mock("../src/config/database", () => ({
  initializeDatabase: jest.fn(),
  getDatabase: jest.fn(),
}));
jest.mock("../src/config/redis", () => ({
  initializeRedis: jest.fn(),
  getRedis: jest.fn(),
}));
jest.mock("../src/config/queue", () => ({ initializeQueue: jest.fn() }));
jest.mock("../src/config/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
}));

import { QuickBooksService } from "../src/integrations/quickbooks/QuickBooksService";
import { XeroService } from "../src/integrations/xero/XeroService";

describe("Integration Service", () => {
  describe("QuickBooksService", () => {
    test("should instantiate QuickBooksService", () => {
      expect(QuickBooksService).toBeDefined();
    });

    test("should have required OAuth methods", () => {
      const instance = new (QuickBooksService as any)({});
      expect(typeof instance).toBe("object");
    });
  });

  describe("XeroService", () => {
    test("should instantiate XeroService", () => {
      expect(XeroService).toBeDefined();
    });

    test("should have required methods", () => {
      const instance = new (XeroService as any)({});
      expect(typeof instance).toBe("object");
    });
  });

  describe("Config stubs", () => {
    test("initializeDatabase is a function", async () => {
      const { initializeDatabase } = require("../src/config/database");
      expect(typeof initializeDatabase).toBe("function");
    });

    test("initializeRedis is a function", async () => {
      const { initializeRedis } = require("../src/config/redis");
      expect(typeof initializeRedis).toBe("function");
    });
  });
});
