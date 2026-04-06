import { describe, expect, test, jest, beforeEach } from "@jest/globals";
import accountingService from "../src/accounting.service";
import journalEntryModel from "../src/journal-entry.model";
import ledgerEntryModel from "../src/ledger-entry.model";
import accountModel from "../src/account.model";
import analyticsService from "../src/analytics.service";
import { logger } from "../../common/logger";

// Mock dependencies
jest.mock("../src/journal-entry.model");
jest.mock("../src/ledger-entry.model");
jest.mock("../src/account.model");
jest.mock("../src/analytics.service");
jest.mock("../../common/logger");
jest.mock("../../common/kafka", () => ({
  sendMessage: jest.fn().mockResolvedValue(undefined),
}));

describe("AccountingService", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe("createJournalEntry", () => {
    test("should create journal entry with balanced ledger entries", async () => {
      // Arrange
      const journalEntry = {
        date: new Date("2025-05-20"),
        reference: "INV-001",
        description: "Sale of goods",
        createdBy: "user_123",
      };

      const ledgerEntries = [
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
      ];

      const createdJournalEntry = {
        id: "journal_123",
        ...journalEntry,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createdLedgerEntries = ledgerEntries.map((entry, index) => ({
        id: `ledger_${index}`,
        journalEntryId: createdJournalEntry.id,
        ...entry,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Mock implementations
      (journalEntryModel.create as jest.Mock).mockResolvedValue(
        createdJournalEntry,
      );
      (ledgerEntryModel.createMany as jest.Mock).mockResolvedValue(
        createdLedgerEntries,
      );

      // Act
      const result = await accountingService.createJournalEntry(
        journalEntry,
        ledgerEntries,
      );

      // Assert
      expect(journalEntryModel.create).toHaveBeenCalledWith(journalEntry);
      expect(ledgerEntryModel.createMany).toHaveBeenCalledWith(
        expect.arrayContaining(
          ledgerEntries.map((entry) => ({
            ...entry,
            journalEntryId: createdJournalEntry.id,
          })),
        ),
      );
      expect(
        analyticsService.sendAccountingDataToAnalytics,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          journalEntry: createdJournalEntry,
          ledgerEntries: createdLedgerEntries,
        }),
        "JOURNAL_ENTRY",
      );
      expect(result).toEqual({
        journalEntry: createdJournalEntry,
        ledgerEntries: createdLedgerEntries,
      });
    });

    test("should throw error when ledger entries are not balanced", async () => {
      // Arrange
      const journalEntry = {
        date: new Date("2025-05-20"),
        reference: "INV-001",
        description: "Sale of goods",
        createdBy: "user_123",
      };

      const unbalancedLedgerEntries = [
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
      ];

      // Act & Assert
      await expect(
        accountingService.createJournalEntry(
          journalEntry,
          unbalancedLedgerEntries,
        ),
      ).rejects.toThrow("Ledger entries must be balanced");
      expect(journalEntryModel.create).not.toHaveBeenCalled();
      expect(ledgerEntryModel.createMany).not.toHaveBeenCalled();
    });

    test("should throw error when database operation fails", async () => {
      // Arrange
      const journalEntry = {
        date: new Date("2025-05-20"),
        reference: "INV-001",
        description: "Sale of goods",
        createdBy: "user_123",
      };

      const ledgerEntries = [
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
      ];

      const dbError = new Error("Database error");
      (journalEntryModel.create as jest.Mock).mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        accountingService.createJournalEntry(journalEntry, ledgerEntries),
      ).rejects.toThrow("Database error");
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("getAllJournalEntries", () => {
    test("should return all journal entries with their ledger entries", async () => {
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
        },
        {
          id: "journal_2",
          date: new Date("2025-05-21"),
          reference: "INV-002",
          description: "Purchase of supplies",
          createdBy: "user_123",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockLedgerEntries = [
        {
          id: "ledger_1",
          journalEntryId: "journal_1",
          accountId: "account_1",
          debit: 1000.0,
          credit: 0,
          description: "Cash received",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "ledger_2",
          journalEntryId: "journal_1",
          accountId: "account_2",
          debit: 0,
          credit: 1000.0,
          description: "Revenue recorded",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock implementations
      (journalEntryModel.findAll as jest.Mock).mockResolvedValue(
        mockJournalEntries,
      );
      (ledgerEntryModel.findByJournalEntryIds as jest.Mock).mockResolvedValue(
        mockLedgerEntries,
      );

      // Act
      const result = await accountingService.getAllJournalEntries();

      // Assert
      expect(journalEntryModel.findAll).toHaveBeenCalled();
      expect(ledgerEntryModel.findByJournalEntryIds).toHaveBeenCalledWith(
        expect.arrayContaining(["journal_1", "journal_2"]),
      );
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ...mockJournalEntries[0],
            ledgerEntries: expect.arrayContaining([
              expect.objectContaining(mockLedgerEntries[0]),
              expect.objectContaining(mockLedgerEntries[1]),
            ]),
          }),
          expect.objectContaining({
            ...mockJournalEntries[1],
            ledgerEntries: [],
          }),
        ]),
      );
    });

    test("should handle empty result set", async () => {
      // Arrange
      (journalEntryModel.findAll as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await accountingService.getAllJournalEntries();

      // Assert
      expect(result).toEqual([]);
      expect(ledgerEntryModel.findByJournalEntryIds).not.toHaveBeenCalled();
    });
  });

  describe("generateTrialBalance", () => {
    test("should generate trial balance correctly", async () => {
      // Arrange
      const mockAccounts = [
        {
          id: "account_1",
          name: "Cash",
          accountCode: "1000",
          accountType: "ASSET",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "account_2",
          name: "Revenue",
          accountCode: "4000",
          accountType: "REVENUE",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockLedgerSummary = [
        {
          accountId: "account_1",
          totalDebit: 5000.0,
          totalCredit: 2000.0,
        },
        {
          accountId: "account_2",
          totalDebit: 0,
          totalCredit: 3000.0,
        },
      ];

      // Mock implementations
      (accountModel.findAll as jest.Mock).mockResolvedValue(mockAccounts);
      (ledgerEntryModel.getAccountBalances as jest.Mock).mockResolvedValue(
        mockLedgerSummary,
      );

      // Act
      const result = await accountingService.generateTrialBalance();

      // Assert
      expect(accountModel.findAll).toHaveBeenCalled();
      expect(ledgerEntryModel.getAccountBalances).toHaveBeenCalled();
      expect(result).toEqual({
        accounts: expect.arrayContaining([
          expect.objectContaining({
            id: "account_1",
            name: "Cash",
            accountCode: "1000",
            accountType: "ASSET",
            debit: 5000.0,
            credit: 2000.0,
            balance: 3000.0,
          }),
          expect.objectContaining({
            id: "account_2",
            name: "Revenue",
            accountCode: "4000",
            accountType: "REVENUE",
            debit: 0,
            credit: 3000.0,
            balance: -3000.0,
          }),
        ]),
        totalDebit: 5000.0,
        totalCredit: 5000.0,
        isBalanced: true,
      });
    });

    test("should handle unbalanced trial balance", async () => {
      // Arrange
      const mockAccounts = [
        {
          id: "account_1",
          name: "Cash",
          accountCode: "1000",
          accountType: "ASSET",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "account_2",
          name: "Revenue",
          accountCode: "4000",
          accountType: "REVENUE",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockLedgerSummary = [
        {
          accountId: "account_1",
          totalDebit: 5000.0,
          totalCredit: 2000.0,
        },
        {
          accountId: "account_2",
          totalDebit: 0,
          totalCredit: 2500.0, // Not balanced with debits
        },
      ];

      // Mock implementations
      (accountModel.findAll as jest.Mock).mockResolvedValue(mockAccounts);
      (ledgerEntryModel.getAccountBalances as jest.Mock).mockResolvedValue(
        mockLedgerSummary,
      );

      // Act
      const result = await accountingService.generateTrialBalance();

      // Assert
      expect(result.totalDebit).toBe(5000.0);
      expect(result.totalCredit).toBe(4500.0);
      expect(result.isBalanced).toBe(false);
    });
  });

  describe("generateIncomeStatement", () => {
    test("should generate income statement correctly", async () => {
      // Arrange
      const startDate = new Date("2025-01-01");
      const endDate = new Date("2025-05-31");

      const mockRevenueAccounts = [
        {
          id: "account_1",
          name: "Sales Revenue",
          accountCode: "4000",
          accountType: "REVENUE",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockExpenseAccounts = [
        {
          id: "account_2",
          name: "Rent Expense",
          accountCode: "5000",
          accountType: "EXPENSE",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "account_3",
          name: "Utilities Expense",
          accountCode: "5100",
          accountType: "EXPENSE",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockRevenueSummary = [
        {
          accountId: "account_1",
          totalDebit: 1000.0,
          totalCredit: 11000.0,
        },
      ];

      const mockExpenseSummary = [
        {
          accountId: "account_2",
          totalDebit: 3000.0,
          totalCredit: 0,
        },
        {
          accountId: "account_3",
          totalDebit: 1500.0,
          totalCredit: 0,
        },
      ];

      // Mock implementations
      (accountModel.findByType as jest.Mock).mockImplementation((type) => {
        if (type === "REVENUE") return Promise.resolve(mockRevenueAccounts);
        if (type === "EXPENSE") return Promise.resolve(mockExpenseAccounts);
        return Promise.resolve([]);
      });

      (
        ledgerEntryModel.getAccountBalancesByDateRange as jest.Mock
      ).mockImplementation((accountIds) => {
        if (accountIds.includes("account_1"))
          return Promise.resolve(mockRevenueSummary);
        if (accountIds.includes("account_2"))
          return Promise.resolve(mockExpenseSummary);
        return Promise.resolve([]);
      });

      // Act
      const result = await accountingService.generateIncomeStatement(
        startDate,
        endDate,
      );

      // Assert
      expect(accountModel.findByType).toHaveBeenCalledWith("REVENUE");
      expect(accountModel.findByType).toHaveBeenCalledWith("EXPENSE");
      expect(
        ledgerEntryModel.getAccountBalancesByDateRange,
      ).toHaveBeenCalledWith(["account_1"], startDate, endDate);
      expect(
        ledgerEntryModel.getAccountBalancesByDateRange,
      ).toHaveBeenCalledWith(["account_2", "account_3"], startDate, endDate);
      expect(result).toEqual({
        startDate,
        endDate,
        revenueItems: [
          {
            accountId: "account_1",
            accountCode: "4000",
            name: "Sales Revenue",
            amount: 10000.0, // credit - debit
          },
        ],
        expenseItems: [
          {
            accountId: "account_2",
            accountCode: "5000",
            name: "Rent Expense",
            amount: 3000.0, // debit - credit
          },
          {
            accountId: "account_3",
            accountCode: "5100",
            name: "Utilities Expense",
            amount: 1500.0, // debit - credit
          },
        ],
        totalRevenue: 10000.0,
        totalExpenses: 4500.0,
        netIncome: 5500.0,
      });
    });

    test("should handle negative net income (loss)", async () => {
      // Arrange
      const startDate = new Date("2025-01-01");
      const endDate = new Date("2025-05-31");

      const mockRevenueAccounts = [
        {
          id: "account_1",
          name: "Sales Revenue",
          accountCode: "4000",
          accountType: "REVENUE",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockExpenseAccounts = [
        {
          id: "account_2",
          name: "Rent Expense",
          accountCode: "5000",
          accountType: "EXPENSE",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockRevenueSummary = [
        {
          accountId: "account_1",
          totalDebit: 0,
          totalCredit: 5000.0,
        },
      ];

      const mockExpenseSummary = [
        {
          accountId: "account_2",
          totalDebit: 8000.0,
          totalCredit: 0,
        },
      ];

      // Mock implementations
      (accountModel.findByType as jest.Mock).mockImplementation((type) => {
        if (type === "REVENUE") return Promise.resolve(mockRevenueAccounts);
        if (type === "EXPENSE") return Promise.resolve(mockExpenseAccounts);
        return Promise.resolve([]);
      });

      (
        ledgerEntryModel.getAccountBalancesByDateRange as jest.Mock
      ).mockImplementation((accountIds) => {
        if (accountIds.includes("account_1"))
          return Promise.resolve(mockRevenueSummary);
        if (accountIds.includes("account_2"))
          return Promise.resolve(mockExpenseSummary);
        return Promise.resolve([]);
      });

      // Act
      const result = await accountingService.generateIncomeStatement(
        startDate,
        endDate,
      );

      // Assert
      expect(result.totalRevenue).toBe(5000.0);
      expect(result.totalExpenses).toBe(8000.0);
      expect(result.netIncome).toBe(-3000.0); // Loss
    });
  });

  describe("getAccountBalance", () => {
    test("should return correct account balance", async () => {
      // Arrange
      const accountId = "account_1";
      const asOfDate = new Date("2025-05-31");

      const mockAccount = {
        id: accountId,
        name: "Cash",
        accountCode: "1000",
        accountType: "ASSET",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockLedgerSummary = {
        accountId,
        totalDebit: 10000.0,
        totalCredit: 4000.0,
      };

      // Mock implementations
      (accountModel.findById as jest.Mock).mockResolvedValue(mockAccount);
      (ledgerEntryModel.getAccountBalanceByDate as jest.Mock).mockResolvedValue(
        mockLedgerSummary,
      );

      // Act
      const result = await accountingService.getAccountBalance(
        accountId,
        asOfDate,
      );

      // Assert
      expect(accountModel.findById).toHaveBeenCalledWith(accountId);
      expect(ledgerEntryModel.getAccountBalanceByDate).toHaveBeenCalledWith(
        accountId,
        asOfDate,
      );
      expect(result).toBe(6000.0); // debit - credit for asset account
    });

    test("should handle different account types correctly", async () => {
      // Arrange
      const accountId = "account_2";
      const asOfDate = new Date("2025-05-31");

      const mockAccount = {
        id: accountId,
        name: "Revenue",
        accountCode: "4000",
        accountType: "REVENUE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockLedgerSummary = {
        accountId,
        totalDebit: 1000.0,
        totalCredit: 8000.0,
      };

      // Mock implementations
      (accountModel.findById as jest.Mock).mockResolvedValue(mockAccount);
      (ledgerEntryModel.getAccountBalanceByDate as jest.Mock).mockResolvedValue(
        mockLedgerSummary,
      );

      // Act
      const result = await accountingService.getAccountBalance(
        accountId,
        asOfDate,
      );

      // Assert
      expect(result).toBe(7000.0); // credit - debit for revenue account
    });

    test("should throw error when account not found", async () => {
      // Arrange
      const accountId = "nonexistent_account";
      const asOfDate = new Date("2025-05-31");

      // Mock implementations
      (accountModel.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        accountingService.getAccountBalance(accountId, asOfDate),
      ).rejects.toThrow("Account not found");
      expect(ledgerEntryModel.getAccountBalanceByDate).not.toHaveBeenCalled();
    });
  });
});
