import { describe, expect, test, jest } from "@jest/globals";

jest.mock("../src/config/database", () => ({
  connectDatabase: jest.fn(),
  getDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));
jest.mock("../src/config/redis", () => ({
  connectRedis: jest.fn(),
  getRedis: jest.fn(),
}));
jest.mock("../src/config/kafka", () => ({ initializeKafka: jest.fn() }));
jest.mock("../src/config/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock("../../common/logger", () => ({
  default: {
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
jest.mock("socket.io", () => ({
  Server: jest
    .fn()
    .mockImplementation(() => ({ on: jest.fn(), emit: jest.fn() })),
}));
jest.mock("kafkajs", () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    producer: jest.fn().mockReturnValue({
      connect: jest.fn(),
      send: jest.fn(),
      disconnect: jest.fn(),
    }),
    consumer: jest.fn().mockReturnValue({
      connect: jest.fn(),
      subscribe: jest.fn(),
      run: jest.fn(),
      disconnect: jest.fn(),
    }),
  })),
}));

describe("Realtime Analytics Service", () => {
  describe("Config", () => {
    test("config has required fields", async () => {
      const { config } = await import("../src/config/config");
      expect(config).toBeDefined();
      expect(typeof config.port).toBe("number");
      expect(config.database).toBeDefined();
      expect(config.kafka).toBeDefined();
    });
  });

  describe("Middleware", () => {
    test("errorHandler is a function", async () => {
      const { errorHandler } = await import("../src/middleware/errorHandler");
      expect(typeof errorHandler).toBe("function");
    });

    test("authMiddleware is a function", async () => {
      const { authMiddleware } = await import("../src/middleware/auth");
      expect(typeof authMiddleware).toBe("function");
    });

    test("rateLimitMiddleware is a function", async () => {
      const { rateLimitMiddleware } =
        await import("../src/middleware/rateLimit");
      expect(typeof rateLimitMiddleware).toBe("function");
    });

    test("metricsMiddleware is a function", async () => {
      const { metricsMiddleware } = await import("../src/middleware/metrics");
      expect(typeof metricsMiddleware).toBe("function");
    });
  });

  describe("Analytics types", () => {
    test("analytics types module is importable", async () => {
      const types = await import("../src/types/analytics");
      expect(types).toBeDefined();
    });
  });
});
