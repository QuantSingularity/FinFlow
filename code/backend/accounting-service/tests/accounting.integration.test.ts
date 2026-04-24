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
import accountingService from "../src/accounting.service";
import analyticsService from "../src/analytics.service";
import jwt from "jsonwebtoken";

// Mock dependencies
jest.mock("../src/accounting.service");
jest.mock("../src/analytics.service");
jest.mock("../../common/kafka", () => ({
  sendMessage: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("jsonwebtoken", () => ({
  verify: jest.fn().mockReturnValue({ sub: "user_123", role: "admin" }),
  sign: jest.fn().mockReturnValue("mock_access_token"),
  decode: jest.fn().mockReturnValue({ sub: "user_123", role: "admin" }),
}));

describe("Accounting API Integration Tests", () => {
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
    // Allow any pending async operations to settle
    await new Promise<void>((resolve) => setImmediate(resolve));
  });

  describe("POST /api/accounting/journal-entries", () => {
    test("should create journal entry successfully", async () => {
      // Arrange
      const journalEntryRequest = {
        date: "2025-05-20",
        reference: "INV-001",
        description: "Sale of goods",
        ledgerEntries: [
          {
            accountId: "account_1",
            debit: 1000.0,
            credit: 0,
            description: "Cash received",
          },
          {
            accountId: "account_2",
            debit: 0,
            credit: 1000.0,
            description: "Revenue recorded",
          },
        ],
      };

      const mockResponse = {
        journalEntry: {
          id: "journal_123",
          date: new Date("2025-05-20"),
          reference: "INV-001",
          description: "Sale of goods",
          createdBy: "user_123",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        ledgerEntries: [
          {
            id: "ledger_1",
            journalEntryId: "journal_123",
            accountId: "account_1",
            debit: 1000.0,
            credit: 0,
            description: "Cash received",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "ledger_2",
            journalEntryId: "journal_123",
            accountId: "account_2",
            debit: 0,
            credit: 1000.0,
            description: "Revenue recorded",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      (accountingService.createJournalEntry as jest.Mock).mockResolvedValue(
        mockResponse,
      );

      // Act
      const response = await request(app)
        .post("/api/accounting/journal-entries")
        .set("Authorization", "Bearer valid_token")
        .send(journalEntryRequest)
        .expect("Content-Type", /json/)
        .expect(201);

      // Assert
      expect(accountingService.createJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.any(Date),
          reference: journalEntryRequest.reference,
          description: journalEntryRequest.description,
          createdBy: "user_123",
        }),
        journalEntryRequest.ledgerEntries,
      );
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          journalEntry: expect.objectContaining({
            id: mockResponse.journalEntry.id,
            reference: mockResponse.journalEntry.reference,
          }),
          ledgerEntries: expect.arrayContaining([
            expect.objectContaining({
              id: mockResponse.ledgerEntries[0].id,
              accountId: mockResponse.ledgerEntries[0].accountId,
            }),
            expect.objectContaining({
              id: mockResponse.ledgerEntries[1].id,
              accountId: mockResponse.ledgerEntries[1].accountId,
            }),
          ]),
        }),
      });
    });

    test("should return 400 when ledger entries are not balanced", async () => {
      // Arrange
      const unbalancedJournalEntryRequest = {
        date: "2025-05-20",
        reference: "INV-001",
        description: "Sale of goods",
        ledgerEntries: [
          {
            accountId: "account_1",
            debit: 1000.0,
            credit: 0,
            description: "Cash received",
          },
          {
            accountId: "account_2",
            debit: 0,
            credit: 900.0, // Not balanced with debit
            description: "Revenue recorded",
          },
        ],
      };

      const error = new Error("Ledger entries must be balanced");
      (accountingService.createJournalEntry as jest.Mock).mockRejectedValue(
        error,
      );

      // Act
      const response = await request(app)
        .post("/api/accounting/journal-entries")
        .set("Authorization", "Bearer valid_token")
        .send(unbalancedJournalEntryRequest)
        .expect("Content-Type", /json/)
        .expect(400);

      // Assert
      expect(accountingService.createJournalEntry).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: "Ledger entries must be balanced",
      });
    });

    test("should return 401 when not authenticated", async () => {
      // Arrange
      const journalEntryRequest = {
        date: "2025-05-20",
        reference: "INV-001",
        description: "Sale of goods",
        ledgerEntries: [],
      };

      // Act
      const response = await request(app)
        .post("/api/accounting/journal-entries")
        .send(journalEntryRequest)
        .expect("Content-Type", /json/)
        .expect(401);

      // Assert
      expect(accountingService.createJournalEntry).not.toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: "Authentication required",
      });
    });
  });

  describe("GET /api/accounting/journal-entries", () => {
    test("should get all journal entries", async () => {
      // Arrange
      const mockJournalEntries = [
        {
          id: "journal_1",
          date: new Date("2025-05-20"),
          reference: "INV-001",
          description: "Sale of goods",
          createdBy: "user_123",
          createdAt: new Date(),
          updatedAt: new Date(),
          ledgerEntries: [
            {
              id: "ledger_1",
              journalEntryId: "journal_1",
              accountId: "account_1",
              debit: 1000.0,
              credit: 0,
              description: "Cash received",
            },
            {
              id: "ledger_2",
              journalEntryId: "journal_1",
              accountId: "account_2",
              debit: 0,
              credit: 1000.0,
              description: "Revenue recorded",
            },
          ],
        },
        {
          id: "journal_2",
          date: new Date("2025-05-21"),
          reference: "INV-002",
          description: "Purchase of supplies",
          createdBy: "user_123",
          createdAt: new Date(),
          updatedAt: new Date(),
          ledgerEntries: [
            {
              id: "ledger_3",
              journalEntryId: "journal_2",
              accountId: "account_3",
              debit: 500.0,
              credit: 0,
              description: "Supplies expense",
            },
            {
              id: "ledger_4",
              journalEntryId: "journal_2",
              accountId: "account_1",
              debit: 0,
              credit: 500.0,
              description: "Cash paid",
            },
          ],
        },
      ];

      (accountingService.getAllJournalEntries as jest.Mock).mockResolvedValue(
        mockJournalEntries,
      );

      // Act
      const response = await request(app)
        .get("/api/accounting/journal-entries")
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(accountingService.getAllJournalEntries).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: mockJournalEntries[0].id,
            reference: mockJournalEntries[0].reference,
            ledgerEntries: expect.arrayContaining([
              expect.objectContaining({
                id: mockJournalEntries[0].ledgerEntries[0].id,
              }),
            ]),
          }),
          expect.objectContaining({
            id: mockJournalEntries[1].id,
            reference: mockJournalEntries[1].reference,
            ledgerEntries: expect.arrayContaining([
              expect.objectContaining({
                id: mockJournalEntries[1].ledgerEntries[0].id,
              }),
            ]),
          }),
        ]),
      });
    });

    test("should return empty array when no journal entries exist", async () => {
      // Arrange
      (accountingService.getAllJournalEntries as jest.Mock).mockResolvedValue(
        [],
      );

      // Act
      const response = await request(app)
        .get("/api/accounting/journal-entries")
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(accountingService.getAllJournalEntries).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: true,
        data: [],
      });
    });
  });

  describe("GET /api/accounting/trial-balance", () => {
    test("should generate trial balance successfully", async () => {
      // Arrange
      const mockTrialBalance = {
        accounts: [
          {
            id: "account_1",
            name: "Cash",
            accountCode: "1000",
            accountType: "ASSET",
            debit: 5000.0,
            credit: 2000.0,
            balance: 3000.0,
          },
          {
            id: "account_2",
            name: "Revenue",
            accountCode: "4000",
            accountType: "REVENUE",
            debit: 0,
            credit: 3000.0,
            balance: -3000.0,
          },
        ],
        totalDebit: 5000.0,
        totalCredit: 5000.0,
        isBalanced: true,
      };

      (accountingService.generateTrialBalance as jest.Mock).mockResolvedValue(
        mockTrialBalance,
      );

      // Act
      const response = await request(app)
        .get("/api/accounting/trial-balance")
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(accountingService.generateTrialBalance).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          accounts: expect.arrayContaining([
            expect.objectContaining({
              id: mockTrialBalance.accounts[0].id,
              balance: mockTrialBalance.accounts[0].balance,
            }),
            expect.objectContaining({
              id: mockTrialBalance.accounts[1].id,
              balance: mockTrialBalance.accounts[1].balance,
            }),
          ]),
          totalDebit: mockTrialBalance.totalDebit,
          totalCredit: mockTrialBalance.totalCredit,
          isBalanced: mockTrialBalance.isBalanced,
        }),
      });
    });
  });

  describe("GET /api/accounting/income-statement", () => {
    test("should generate income statement successfully", async () => {
      // Arrange
      const startDate = "2025-01-01";
      const endDate = "2025-05-31";

      const mockIncomeStatement = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        revenueItems: [
          {
            accountId: "account_1",
            accountCode: "4000",
            name: "Sales Revenue",
            amount: 10000.0,
          },
        ],
        expenseItems: [
          {
            accountId: "account_2",
            accountCode: "5000",
            name: "Rent Expense",
            amount: 3000.0,
          },
          {
            accountId: "account_3",
            accountCode: "5100",
            name: "Utilities Expense",
            amount: 1500.0,
          },
        ],
        totalRevenue: 10000.0,
        totalExpenses: 4500.0,
        netIncome: 5500.0,
      };

      (
        accountingService.generateIncomeStatement as jest.Mock
      ).mockResolvedValue(mockIncomeStatement);

      // Act
      const response = await request(app)
        .get(
          `/api/accounting/income-statement?startDate=${startDate}&endDate=${endDate}`,
        )
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(accountingService.generateIncomeStatement).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
      );
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          totalRevenue: mockIncomeStatement.totalRevenue,
          totalExpenses: mockIncomeStatement.totalExpenses,
          netIncome: mockIncomeStatement.netIncome,
          revenueItems: expect.arrayContaining([
            expect.objectContaining({
              accountId: mockIncomeStatement.revenueItems[0].accountId,
              amount: mockIncomeStatement.revenueItems[0].amount,
            }),
          ]),
          expenseItems: expect.arrayContaining([
            expect.objectContaining({
              accountId: mockIncomeStatement.expenseItems[0].accountId,
              amount: mockIncomeStatement.expenseItems[0].amount,
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
          `/api/accounting/income-statement?startDate=${invalidStartDate}&endDate=${endDate}`,
        )
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(400);

      // Assert
      expect(accountingService.generateIncomeStatement).not.toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: expect.stringContaining("Invalid date"),
      });
    });
  });

  describe("GET /api/accounting/account/:id/balance", () => {
    test("should get account balance successfully", async () => {
      // Arrange
      const accountId = "account_1";
      const asOfDate = "2025-05-31";
      const mockBalance = 5000.0;

      (accountingService.getAccountBalance as jest.Mock).mockResolvedValue(
        mockBalance,
      );

      // Act
      const response = await request(app)
        .get(
          `/api/accounting/account/${accountId}/balance?asOfDate=${asOfDate}`,
        )
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(accountingService.getAccountBalance).toHaveBeenCalledWith(
        accountId,
        new Date(asOfDate),
      );
      expect(response.body).toEqual({
        success: true,
        data: {
          accountId,
          balance: mockBalance,
          asOfDate: expect.any(String),
        },
      });
    });

    test("should return 404 when account not found", async () => {
      // Arrange
      const nonExistentAccountId = "non_existent_account";
      const asOfDate = "2025-05-31";

      const error = new Error("Account not found");
      error.name = "NotFoundError";
      (accountingService.getAccountBalance as jest.Mock).mockRejectedValue(
        error,
      );

      // Act
      const response = await request(app)
        .get(
          `/api/accounting/account/${nonExistentAccountId}/balance?asOfDate=${asOfDate}`,
        )
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(404);

      // Assert
      expect(accountingService.getAccountBalance).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: false,
        error: "Account not found",
      });
    });
  });

  describe("GET /api/accounting/financial-metrics", () => {
    test("should calculate financial metrics successfully", async () => {
      // Arrange
      const startDate = "2025-01-01";
      const endDate = "2025-05-31";

      const mockIncomeStatement = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalRevenue: 100000,
        totalExpenses: 70000,
        netIncome: 30000,
        revenueItems: [],
        expenseItems: [],
      };

      const mockBalanceSheet = {
        asOfDate: new Date(endDate),
        assetItems: [],
        liabilityItems: [],
        equityItems: [],
        totalAssets: 100000,
        totalLiabilities: 40000,
        totalEquity: 60000,
      };

      const mockFinancialMetrics = {
        returnOnAssets: 30,
        returnOnEquity: 50,
        profitMargin: 30,
        debtToEquityRatio: 0.67,
        currentRatio: 6.67,
        quickRatio: 5.33,
      };

      (
        accountingService.generateIncomeStatement as jest.Mock
      ).mockResolvedValue(mockIncomeStatement);
      (accountingService.generateBalanceSheet as jest.Mock).mockResolvedValue(
        mockBalanceSheet,
      );
      (
        analyticsService.calculateFinancialMetrics as jest.Mock
      ).mockResolvedValue(mockFinancialMetrics);

      // Act
      const response = await request(app)
        .get(
          `/api/accounting/financial-metrics?startDate=${startDate}&endDate=${endDate}`,
        )
        .set("Authorization", "Bearer valid_token")
        .expect("Content-Type", /json/)
        .expect(200);

      // Assert
      expect(accountingService.generateIncomeStatement).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
      );
      expect(accountingService.generateBalanceSheet).toHaveBeenCalledWith(
        new Date(endDate),
      );
      expect(analyticsService.calculateFinancialMetrics).toHaveBeenCalledWith(
        mockIncomeStatement,
        mockBalanceSheet,
      );
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          returnOnAssets: mockFinancialMetrics.returnOnAssets,
          returnOnEquity: mockFinancialMetrics.returnOnEquity,
          profitMargin: mockFinancialMetrics.profitMargin,
          debtToEquityRatio: mockFinancialMetrics.debtToEquityRatio,
          currentRatio: mockFinancialMetrics.currentRatio,
          quickRatio: mockFinancialMetrics.quickRatio,
        }),
      });
    });
  });
});
