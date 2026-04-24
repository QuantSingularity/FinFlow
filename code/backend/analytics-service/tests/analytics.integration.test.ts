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
import analyticsService from "../src/analytics.service";
import forecastModel from "../src/forecast.model";
import jwt from "jsonwebtoken";

// Mock dependencies
jest.mock("../src/analytics.service");
jest.mock("../src/forecast.model");
jest.mock("../../common/kafka", () => ({
  sendMessage: jest.fn().mockResolvedValue(undefined),
}));
// Explicit factory mock — more reliable than jest.mock("jsonwebtoken") + mockReturnValue
// because clearMocks:true in jest.config.js would wipe auto-mock return values between tests.
jest.mock("jsonwebtoken", () => ({
  verify: jest.fn().mockReturnValue({ sub: "user_123", role: "user" }),
  sign: jest.fn().mockReturnValue("mock_access_token"),
  decode: jest.fn().mockReturnValue({ sub: "user_123", role: "user" }),
}));

describe("Analytics API Integration Tests", () => {
  beforeEach(() => {
    // clearMocks: true in jest.config clears call history; re-apply return values here
    // so individual tests can still override them via mockReturnValueOnce.
    jest.clearAllMocks();
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: "user_123",
      role: "user",
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

  describe("GET /api/analytics/transaction-summary", () => {
    test("should generate transaction summary successfully", async () => {
      // Arrange
      const startDate = "2025-01-01";
      const endDate = "2025-05-31";

      const mockTransactions = [
        {
          id: "tx_1",
          amount: 1000,
          category: "Sales",
          date: new Date("2025-05-01"),
          description: "Product sale",
        },
        {
          id: "tx_2",
          amount: 500,
          category: "Sales",
          date: new Date("2025-05-02"),
          description: "Product sale",
        },
        {
          id: "tx_3",
          amount: 300,
          category: "Expenses",
          date: new Date("2025-05-03"),
          description: "Office supplies",
        },
      ];

      const mockSummary = {
        totalTransactions: 3,
        totalAmount: 1800,
        averageAmount: 600,
        categorySummary: [
          { category: "Sales", amount: 1500 },
          { category: "Expenses", amount: 300 },
        ],
        transactionsByDate: [
          { date: "2025-05-01", count: 1 },
          { date: "2025-05-02", count: 1 },
          { date: "2025-05-03", count: 1 },
        ],
      };

      (
        analyticsService.getTransactionsByDateRange as jest.Mock
      ).mockResolvedValue(mockTransactions);
      (
        analyticsService.generateTransactionSummary as jest.Mock
      ).mockResolvedValue(mockSummary);

      // Act
      const response = await request(app)
        .get(
          `/api/analytics/transaction-summary?startDate=${startDate}&endDate=${endDate}`,
        )
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(analyticsService.getTransactionsByDateRange).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
      );
      expect(analyticsService.generateTransactionSummary).toHaveBeenCalledWith(
        mockTransactions,
      );
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          totalTransactions: mockSummary.totalTransactions,
          totalAmount: mockSummary.totalAmount,
          averageAmount: mockSummary.averageAmount,
          categorySummary: expect.arrayContaining([
            expect.objectContaining({
              category: "Sales",
              amount: 1500,
            }),
            expect.objectContaining({
              category: "Expenses",
              amount: 300,
            }),
          ]),
        }),
      });
    });

    test("should return 400 when date parameters are invalid", async () => {
      // Arrange
      const invalidStartDate = "invalid-date";
      const endDate = "2025-05-31";

      // Act
      const response = await request(app)
        .get(
          `/api/analytics/transaction-summary?startDate=${invalidStartDate}&endDate=${endDate}`,
        )
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(400);

      // Assert
      expect(
        analyticsService.getTransactionsByDateRange,
      ).not.toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: expect.stringContaining("Invalid date"),
      });
    });

    test("should return empty summary when no transactions found", async () => {
      // Arrange
      const startDate = "2025-01-01";
      const endDate = "2025-05-31";

      const emptyTransactions = [];
      const emptySummary = {
        totalTransactions: 0,
        totalAmount: 0,
        averageAmount: 0,
        categorySummary: [],
        transactionsByDate: [],
      };

      (
        analyticsService.getTransactionsByDateRange as jest.Mock
      ).mockResolvedValue(emptyTransactions);
      (
        analyticsService.generateTransactionSummary as jest.Mock
      ).mockResolvedValue(emptySummary);

      // Act
      const response = await request(app)
        .get(
          `/api/analytics/transaction-summary?startDate=${startDate}&endDate=${endDate}`,
        )
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          totalTransactions: 0,
          totalAmount: 0,
          averageAmount: 0,
          categorySummary: [],
        }),
      });
    });
  });

  describe("GET /api/analytics/forecast", () => {
    test("should generate forecast successfully", async () => {
      // Arrange
      const startDate = "2025-06-01";
      const endDate = "2025-08-31";
      const forecastType = "REVENUE";

      const mockForecast = {
        forecastType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        historicalData: [
          { date: new Date("2025-01-01"), amount: 10000 },
          { date: new Date("2025-02-01"), amount: 12000 },
          { date: new Date("2025-03-01"), amount: 11500 },
          { date: new Date("2025-04-01"), amount: 13000 },
          { date: new Date("2025-05-01"), amount: 14000 },
        ],
        forecastData: [
          { date: new Date("2025-06-01"), amount: 14500, confidence: 0.9 },
          { date: new Date("2025-07-01"), amount: 15000, confidence: 0.85 },
          { date: new Date("2025-08-01"), amount: 15500, confidence: 0.8 },
        ],
        averageGrowth: 0.08,
        confidenceLevel: 0.85,
      };

      (analyticsService.generateForecast as jest.Mock).mockResolvedValue(
        mockForecast,
      );

      // Act
      const response = await request(app)
        .get(
          `/api/analytics/forecast?startDate=${startDate}&endDate=${endDate}&forecastType=${forecastType}`,
        )
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(analyticsService.generateForecast).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
        forecastType,
      );
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          forecastType: mockForecast.forecastType,
          historicalData: expect.arrayContaining([
            expect.objectContaining({
              date: expect.any(String),
              amount: expect.any(Number),
            }),
          ]),
          forecastData: expect.arrayContaining([
            expect.objectContaining({
              date: expect.any(String),
              amount: expect.any(Number),
              confidence: expect.any(Number),
            }),
          ]),
          averageGrowth: mockForecast.averageGrowth,
          confidenceLevel: mockForecast.confidenceLevel,
        }),
      });
    });

    test("should return 400 when forecast type is invalid", async () => {
      // Arrange
      const startDate = "2025-06-01";
      const endDate = "2025-08-31";
      const invalidForecastType = "INVALID_TYPE";

      // Act
      const response = await request(app)
        .get(
          `/api/analytics/forecast?startDate=${startDate}&endDate=${endDate}&forecastType=${invalidForecastType}`,
        )
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(400);

      // Assert
      expect(analyticsService.generateForecast).not.toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: expect.stringContaining("Invalid forecast type"),
      });
    });

    test("should return 400 when insufficient historical data", async () => {
      // Arrange
      const startDate = "2025-06-01";
      const endDate = "2025-08-31";
      const forecastType = "REVENUE";

      const error = new Error("Insufficient historical data for forecast");
      (analyticsService.generateForecast as jest.Mock).mockRejectedValue(error);

      // Act
      const response = await request(app)
        .get(
          `/api/analytics/forecast?startDate=${startDate}&endDate=${endDate}&forecastType=${forecastType}`,
        )
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(400);

      // Assert
      expect(analyticsService.generateForecast).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: "Insufficient historical data for forecast",
      });
    });
  });

  describe("GET /api/analytics/dashboard-metrics", () => {
    test("should get dashboard metrics successfully", async () => {
      // Arrange
      const mockDashboardMetrics = {
        revenueMetrics: {
          currentMonth: 15000,
          previousMonth: 12000,
          percentageChange: 25,
          trend: [10000, 11000, 12000, 15000],
        },
        expenseMetrics: {
          currentMonth: 9000,
          previousMonth: 8500,
          percentageChange: 5.88,
          trend: [7000, 8000, 8500, 9000],
        },
        profitMetrics: {
          currentMonth: 6000,
          previousMonth: 3500,
          percentageChange: 71.43,
          trend: [3000, 3000, 3500, 6000],
        },
        cashFlowMetrics: {
          currentMonth: 5000,
          previousMonth: 4000,
          percentageChange: 25,
          trend: [2000, 3000, 4000, 5000],
        },
        topExpenseCategories: [
          { category: "Rent", amount: 3000, percentage: 33.33 },
          { category: "Salaries", amount: 4000, percentage: 44.44 },
          { category: "Utilities", amount: 1000, percentage: 11.11 },
          { category: "Supplies", amount: 1000, percentage: 11.11 },
        ],
        recentTransactions: [
          {
            id: "tx_1",
            date: new Date(),
            description: "Sale",
            amount: 1000,
            type: "income",
          },
          {
            id: "tx_2",
            date: new Date(),
            description: "Rent payment",
            amount: 3000,
            type: "expense",
          },
        ],
      };

      (analyticsService.getDashboardMetrics as jest.Mock).mockResolvedValue(
        mockDashboardMetrics,
      );

      // Act
      const response = await request(app)
        .get("/api/analytics/dashboard-metrics")
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(analyticsService.getDashboardMetrics).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          revenueMetrics: expect.objectContaining({
            currentMonth: mockDashboardMetrics.revenueMetrics.currentMonth,
            percentageChange:
              mockDashboardMetrics.revenueMetrics.percentageChange,
          }),
          expenseMetrics: expect.objectContaining({
            currentMonth: mockDashboardMetrics.expenseMetrics.currentMonth,
            percentageChange:
              mockDashboardMetrics.expenseMetrics.percentageChange,
          }),
          profitMetrics: expect.objectContaining({
            currentMonth: mockDashboardMetrics.profitMetrics.currentMonth,
            percentageChange:
              mockDashboardMetrics.profitMetrics.percentageChange,
          }),
          topExpenseCategories: expect.arrayContaining([
            expect.objectContaining({
              category: expect.any(String),
              amount: expect.any(Number),
              percentage: expect.any(Number),
            }),
          ]),
          recentTransactions: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              description: expect.any(String),
              amount: expect.any(Number),
            }),
          ]),
        }),
      });
    });

    test("should return 401 when not authenticated", async () => {
      // Act
      const response = await request(app)
        .get("/api/analytics/dashboard-metrics")
        .expect("Content-Type", /json/)
        .expect(401);

      // Assert
      expect(analyticsService.getDashboardMetrics).not.toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: "Authentication required",
      });
    });
  });

  describe("GET /api/analytics/payment-analytics", () => {
    test("should get payment analytics successfully", async () => {
      // Arrange
      const startDate = "2025-01-01";
      const endDate = "2025-05-31";

      const mockPaymentAnalytics = {
        processorBreakdown: [
          { processor: "STRIPE", count: 150, amount: 15000, percentage: 60 },
          { processor: "PAYPAL", count: 75, amount: 7500, percentage: 30 },
          { processor: "SQUARE", count: 25, amount: 2500, percentage: 10 },
        ],
        statusBreakdown: [
          { status: "COMPLETED", count: 200, amount: 20000, percentage: 80 },
          { status: "PENDING", count: 30, amount: 3000, percentage: 12 },
          { status: "FAILED", count: 20, amount: 2000, percentage: 8 },
        ],
        dailyTrends: [
          { date: "2025-05-01", count: 10, amount: 1000 },
          { date: "2025-05-02", count: 12, amount: 1200 },
          { date: "2025-05-03", count: 8, amount: 800 },
        ],
        averageTransactionValue: 100,
        totalTransactions: 250,
        totalAmount: 25000,
        successRate: 80,
      };

      (analyticsService.getPaymentAnalytics as jest.Mock).mockResolvedValue(
        mockPaymentAnalytics,
      );

      // Act
      const response = await request(app)
        .get(
          `/api/analytics/payment-analytics?startDate=${startDate}&endDate=${endDate}`,
        )
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(analyticsService.getPaymentAnalytics).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
      );
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          processorBreakdown: expect.arrayContaining([
            expect.objectContaining({
              processor: "STRIPE",
              count: 150,
              amount: 15000,
            }),
          ]),
          statusBreakdown: expect.arrayContaining([
            expect.objectContaining({
              status: "COMPLETED",
              count: 200,
              amount: 20000,
            }),
          ]),
          averageTransactionValue: mockPaymentAnalytics.averageTransactionValue,
          totalTransactions: mockPaymentAnalytics.totalTransactions,
          totalAmount: mockPaymentAnalytics.totalAmount,
          successRate: mockPaymentAnalytics.successRate,
        }),
      });
    });
  });

  describe("POST /api/analytics/custom-report", () => {
    test("should generate custom report successfully", async () => {
      // Arrange
      const reportRequest = {
        startDate: "2025-01-01",
        endDate: "2025-05-31",
        metrics: ["REVENUE", "EXPENSES", "PROFIT_MARGIN"],
        groupBy: "MONTH",
        filters: {
          categories: ["Sales", "Marketing"],
          minAmount: 1000,
        },
      };

      const mockCustomReport = {
        title: "Custom Report",
        dateRange: {
          startDate: new Date(reportRequest.startDate),
          endDate: new Date(reportRequest.endDate),
        },
        summary: {
          totalRevenue: 100000,
          totalExpenses: 70000,
          profitMargin: 30,
        },
        data: [
          {
            period: "2025-01",
            revenue: 18000,
            expenses: 12000,
            profitMargin: 33.33,
          },
          {
            period: "2025-02",
            revenue: 20000,
            expenses: 14000,
            profitMargin: 30,
          },
          {
            period: "2025-03",
            revenue: 19000,
            expenses: 13000,
            profitMargin: 31.58,
          },
          {
            period: "2025-04",
            revenue: 21000,
            expenses: 15000,
            profitMargin: 28.57,
          },
          {
            period: "2025-05",
            revenue: 22000,
            expenses: 16000,
            profitMargin: 27.27,
          },
        ],
        charts: [
          {
            type: "line",
            title: "Revenue and Expenses Trend",
            data: {}, // Chart data would be here
          },
          {
            type: "pie",
            title: "Expense Breakdown",
            data: {}, // Chart data would be here
          },
        ],
      };

      (analyticsService.generateCustomReport as jest.Mock).mockResolvedValue(
        mockCustomReport,
      );

      // Act
      const response = await request(app)
        .post("/api/analytics/custom-report")
        .set("Authorization", "Bearer valid_token")
        .send(reportRequest)
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(analyticsService.generateCustomReport).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: new Date(reportRequest.startDate),
          endDate: new Date(reportRequest.endDate),
          metrics: reportRequest.metrics,
          groupBy: reportRequest.groupBy,
          filters: reportRequest.filters,
        }),
      );
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          title: mockCustomReport.title,
          summary: expect.objectContaining({
            totalRevenue: mockCustomReport.summary.totalRevenue,
            totalExpenses: mockCustomReport.summary.totalExpenses,
            profitMargin: mockCustomReport.summary.profitMargin,
          }),
          data: expect.arrayContaining([
            expect.objectContaining({
              period: expect.any(String),
              revenue: expect.any(Number),
              expenses: expect.any(Number),
              profitMargin: expect.any(Number),
            }),
          ]),
        }),
      });
    });

    test("should return 400 when report parameters are invalid", async () => {
      // Arrange
      const invalidReportRequest = {
        startDate: "2025-01-01",
        endDate: "2025-05-31",
        metrics: ["INVALID_METRIC"],
        groupBy: "INVALID_GROUP",
      };

      // Act
      const response = await request(app)
        .post("/api/analytics/custom-report")
        .set("Authorization", "Bearer valid_token")
        .send(invalidReportRequest)
        .expect("Content-Type", /json/)
        .expect(400);

      // Assert
      expect(analyticsService.generateCustomReport).not.toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: expect.stringContaining("Invalid"),
      });
    });
  });
});
