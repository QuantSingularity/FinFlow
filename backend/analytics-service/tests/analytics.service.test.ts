import { describe, expect, test, jest, beforeEach } from "@jest/globals";
import analyticsService from "../src/analytics.service";
import forecastModel from "../src/forecast.model";
import axios from "axios";
import { logger } from "../../common/logger";

// Mock dependencies
jest.mock("../src/forecast.model");
jest.mock("../../common/kafka", () => ({
  sendMessage: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("axios");
jest.mock("../../common/logger");

describe("AnalyticsService", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe("calculateFinancialMetrics", () => {
    test("should calculate financial metrics from income statement and balance sheet", async () => {
      // Arrange
      const incomeStatement = {
        totalRevenue: 100000,
        totalExpenses: 70000,
        netIncome: 30000,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-05-31"),
        revenueItems: [],
        expenseItems: [],
      };

      const balanceSheet = {
        asOfDate: new Date("2025-05-31"),
        assetItems: [
          {
            accountId: "account_1",
            accountCode: "1000",
            name: "Cash",
            amount: 50000,
          },
          {
            accountId: "account_2",
            accountCode: "1100",
            name: "Accounts Receivable",
            amount: 30000,
          },
          {
            accountId: "account_3",
            accountCode: "1200",
            name: "Inventory",
            amount: 20000,
          },
        ],
        liabilityItems: [
          {
            accountId: "account_4",
            accountCode: "2000",
            name: "Accounts Payable",
            amount: 15000,
          },
          {
            accountId: "account_5",
            accountCode: "2100",
            name: "Loans Payable",
            amount: 25000,
          },
        ],
        equityItems: [
          {
            accountId: "account_6",
            accountCode: "3000",
            name: "Common Stock",
            amount: 30000,
          },
          {
            accountId: "account_7",
            accountCode: "3100",
            name: "Retained Earnings",
            amount: 30000,
          },
        ],
        totalAssets: 100000,
        totalLiabilities: 40000,
        totalEquity: 60000,
      };

      const mockApiResponse = {
        data: {
          returnOnAssets: 30,
          returnOnEquity: 50,
          profitMargin: 30,
          debtToEquityRatio: 0.67,
          currentRatio: 6.67,
          quickRatio: 5.33,
          assetTurnover: 1,
          inventoryTurnover: 3.5,
          daysReceivable: 54.75,
          daysPayable: 39.11,
        },
      };

      // Mock axios to return successful response
      (axios.post as jest.Mock).mockResolvedValue(mockApiResponse);

      // Act
      const result = await analyticsService.calculateFinancialMetrics(
        incomeStatement,
        balanceSheet,
      );

      // Assert
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/financial-metrics"),
        {
          incomeStatement,
          balanceSheet,
        },
      );
      expect(result).toEqual(mockApiResponse.data);
    });

    test("should calculate basic metrics locally when API call fails", async () => {
      // Arrange
      const incomeStatement = {
        totalRevenue: 100000,
        totalExpenses: 70000,
        netIncome: 30000,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-05-31"),
        revenueItems: [],
        expenseItems: [],
      };

      const balanceSheet = {
        asOfDate: new Date("2025-05-31"),
        assetItems: [
          {
            accountId: "account_1",
            accountCode: "1000",
            name: "Cash",
            amount: 50000,
          },
          {
            accountId: "account_2",
            accountCode: "1100",
            name: "Accounts Receivable",
            amount: 30000,
          },
          {
            accountId: "account_3",
            accountCode: "1200",
            name: "Inventory",
            amount: 20000,
          },
        ],
        liabilityItems: [
          {
            accountId: "account_4",
            accountCode: "2000",
            name: "Accounts Payable",
            amount: 15000,
          },
          {
            accountId: "account_5",
            accountCode: "2100",
            name: "Loans Payable",
            amount: 25000,
          },
        ],
        equityItems: [
          {
            accountId: "account_6",
            accountCode: "3000",
            name: "Common Stock",
            amount: 30000,
          },
          {
            accountId: "account_7",
            accountCode: "3100",
            name: "Retained Earnings",
            amount: 30000,
          },
        ],
        totalAssets: 100000,
        totalLiabilities: 40000,
        totalEquity: 60000,
      };

      // Mock axios to throw error
      const apiError = new Error("API unavailable");
      (axios.post as jest.Mock).mockRejectedValue(apiError);

      // Act
      const result = await analyticsService.calculateFinancialMetrics(
        incomeStatement,
        balanceSheet,
      );

      // Assert
      expect(axios.post).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error calculating financial metrics"),
      );
      expect(result).toEqual(
        expect.objectContaining({
          returnOnAssets: expect.any(Number),
          returnOnEquity: expect.any(Number),
          profitMargin: expect.any(Number),
          debtToEquityRatio: expect.any(Number),
          currentRatio: expect.any(Number),
          calculatedLocally: true,
        }),
      );
    });
  });

  describe("generateTransactionSummary", () => {
    test("should generate transaction summary from transaction data", async () => {
      // Arrange
      const transactions = [
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

      const mockApiResponse = {
        data: {
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
        },
      };

      // Mock axios to return successful response
      (axios.post as jest.Mock).mockResolvedValue(mockApiResponse);

      // Act
      const result =
        await analyticsService.generateTransactionSummary(transactions);

      // Assert
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/transaction-summary"),
        { transactions },
      );
      expect(result).toEqual(mockApiResponse.data);
    });

    test("should generate basic summary locally when API call fails", async () => {
      // Arrange
      const transactions = [
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

      // Mock axios to throw error
      const apiError = new Error("API unavailable");
      (axios.post as jest.Mock).mockRejectedValue(apiError);

      // Act
      const result =
        await analyticsService.generateTransactionSummary(transactions);

      // Assert
      expect(axios.post).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error generating transaction summary"),
      );
      expect(result).toEqual(
        expect.objectContaining({
          totalTransactions: 3,
          totalAmount: 1800,
          averageAmount: 600,
          categorySummary: expect.arrayContaining([
            expect.objectContaining({ category: "Sales", amount: 1500 }),
            expect.objectContaining({ category: "Expenses", amount: 300 }),
          ]),
          calculatedLocally: true,
        }),
      );
    });
  });

  describe("sendAccountingDataToAnalytics", () => {
    test("should send accounting data to analytics service", async () => {
      // Arrange
      const data = {
        journalEntry: { id: "journal_1", description: "Test entry" },
        ledgerEntries: [
          { id: "ledger_1", accountId: "account_1", debit: 1000, credit: 0 },
          { id: "ledger_2", accountId: "account_2", debit: 0, credit: 1000 },
        ],
      };
      const dataType = "JOURNAL_ENTRY";

      // Mock axios to return successful response
      (axios.post as jest.Mock).mockResolvedValue({ status: 200 });

      // Act
      await analyticsService.sendAccountingDataToAnalytics(data, dataType);

      // Assert
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/accounting-data"),
        {
          dataType,
          data,
        },
      );
    });

    test("should log error but not throw when API call fails", async () => {
      // Arrange
      const data = {
        journalEntry: { id: "journal_1", description: "Test entry" },
        ledgerEntries: [
          { id: "ledger_1", accountId: "account_1", debit: 1000, credit: 0 },
          { id: "ledger_2", accountId: "account_2", debit: 0, credit: 1000 },
        ],
      };
      const dataType = "JOURNAL_ENTRY";

      // Mock axios to throw error
      const apiError = new Error("API unavailable");
      (axios.post as jest.Mock).mockRejectedValue(apiError);

      // Act & Assert
      // Should not throw error
      await expect(
        analyticsService.sendAccountingDataToAnalytics(data, dataType),
      ).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error sending accounting data to analytics"),
      );
    });
  });

  describe("generateForecast", () => {
    test("should generate financial forecast based on historical data", async () => {
      // Arrange
      const startDate = new Date("2025-06-01");
      const endDate = new Date("2025-08-31");
      const forecastType = "REVENUE";

      const historicalData = [
        { date: new Date("2025-01-01"), amount: 10000 },
        { date: new Date("2025-02-01"), amount: 12000 },
        { date: new Date("2025-03-01"), amount: 11500 },
        { date: new Date("2025-04-01"), amount: 13000 },
        { date: new Date("2025-05-01"), amount: 14000 },
      ];

      const forecastData = [
        { date: new Date("2025-06-01"), amount: 14500, confidence: 0.9 },
        { date: new Date("2025-07-01"), amount: 15000, confidence: 0.85 },
        { date: new Date("2025-08-01"), amount: 15500, confidence: 0.8 },
      ];

      // Mock implementations
      (forecastModel.getHistoricalData as jest.Mock).mockResolvedValue(
        historicalData,
      );
      (forecastModel.generateForecast as jest.Mock).mockResolvedValue(
        forecastData,
      );

      // Act
      const result = await analyticsService.generateForecast(
        startDate,
        endDate,
        forecastType,
      );

      // Assert
      expect(forecastModel.getHistoricalData).toHaveBeenCalledWith(
        forecastType,
      );
      expect(forecastModel.generateForecast).toHaveBeenCalledWith(
        historicalData,
        startDate,
        endDate,
      );
      expect(result).toEqual({
        forecastType,
        startDate,
        endDate,
        historicalData,
        forecastData,
        averageGrowth: expect.any(Number),
        confidenceLevel: expect.any(Number),
      });
    });

    test("should throw error when insufficient historical data", async () => {
      // Arrange
      const startDate = new Date("2025-06-01");
      const endDate = new Date("2025-08-31");
      const forecastType = "REVENUE";

      // Mock implementation to return insufficient data
      (forecastModel.getHistoricalData as jest.Mock).mockResolvedValue([
        { date: new Date("2025-05-01"), amount: 14000 }, // Only one data point
      ]);

      // Act & Assert
      await expect(
        analyticsService.generateForecast(startDate, endDate, forecastType),
      ).rejects.toThrow("Insufficient historical data for forecast");
      expect(forecastModel.generateForecast).not.toHaveBeenCalled();
    });

    test("should handle errors during forecast generation", async () => {
      // Arrange
      const startDate = new Date("2025-06-01");
      const endDate = new Date("2025-08-31");
      const forecastType = "REVENUE";

      const historicalData = [
        { date: new Date("2025-01-01"), amount: 10000 },
        { date: new Date("2025-02-01"), amount: 12000 },
        { date: new Date("2025-03-01"), amount: 11500 },
        { date: new Date("2025-04-01"), amount: 13000 },
        { date: new Date("2025-05-01"), amount: 14000 },
      ];

      // Mock implementations
      (forecastModel.getHistoricalData as jest.Mock).mockResolvedValue(
        historicalData,
      );

      const forecastError = new Error("Forecast calculation error");
      (forecastModel.generateForecast as jest.Mock).mockRejectedValue(
        forecastError,
      );

      // Act & Assert
      await expect(
        analyticsService.generateForecast(startDate, endDate, forecastType),
      ).rejects.toThrow("Forecast calculation error");
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
