import { Request, Response } from "express";
import accountingService from "./accounting.service";
import analyticsService from "./analytics.service";
import { logger } from "../../common/logger";

class AccountingController {
  /**
   * Create a new journal entry with ledger entries
   */
  async createJournalEntry(req: Request, res: Response): Promise<void> {
    try {
      const { journalEntry, ledgerEntries } = req.body;

      const result = await accountingService.createJournalEntry(
        journalEntry,
        ledgerEntries,
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(`Error creating journal entry: ${error}`);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get all journal entries
   */
  async getAllJournalEntries(req: Request, res: Response): Promise<void> {
    try {
      const journalEntries = await accountingService.getAllJournalEntries();

      res.status(200).json({
        success: true,
        data: journalEntries,
      });
    } catch (error) {
      logger.error(`Error getting journal entries: ${error}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get journal entry by ID
   */
  async getJournalEntryById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const journalEntry = await accountingService.getJournalEntryById(id);

      if (!journalEntry) {
        res.status(404).json({
          success: false,
          error: "Journal entry not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: journalEntry,
      });
    } catch (error) {
      logger.error(`Error getting journal entry: ${error}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get trial balance report
   */
  async getTrialBalance(req: Request, res: Response): Promise<void> {
    try {
      const trialBalance = await accountingService.generateTrialBalance();

      res.status(200).json({
        success: true,
        data: trialBalance,
      });
    } catch (error) {
      logger.error(`Error generating trial balance: ${error}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get income statement for a period
   */
  async getIncomeStatement(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const incomeStatement = await accountingService.generateIncomeStatement(
        new Date(startDate as string),
        new Date(endDate as string),
      );

      res.status(200).json({
        success: true,
        data: incomeStatement,
      });
    } catch (error) {
      logger.error(`Error generating income statement: ${error}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get balance sheet as of a date
   */
  async getBalanceSheet(req: Request, res: Response): Promise<void> {
    try {
      const { asOfDate } = req.query;

      const balanceSheet = await accountingService.generateBalanceSheet(
        new Date((asOfDate as string) || new Date()),
      );

      res.status(200).json({
        success: true,
        data: balanceSheet,
      });
    } catch (error) {
      logger.error(`Error generating balance sheet: ${error}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get cash flow statement for a period
   */
  async getCashFlowStatement(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const cashFlowStatement =
        await accountingService.generateCashFlowStatement(
          new Date(startDate as string),
          new Date(endDate as string),
        );

      res.status(200).json({
        success: true,
        data: cashFlowStatement,
      });
    } catch (error) {
      logger.error(`Error generating cash flow statement: ${error}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get all accounts
   */
  async getAllAccounts(req: Request, res: Response): Promise<void> {
    try {
      const accounts = await accountingService.getAllAccounts();

      res.status(200).json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      logger.error(`Error getting accounts: ${error}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get account by ID
   */
  async getAccountById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const account = await accountingService.getAccountById(id);

      if (!account) {
        res.status(404).json({
          success: false,
          error: "Account not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: account,
      });
    } catch (error) {
      logger.error(`Error getting account: ${error}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { asOfDate } = req.query;

      const balance = await accountingService.getAccountBalance(
        id,
        asOfDate ? new Date(asOfDate as string) : new Date(),
      );

      res.status(200).json({
        success: true,
        data: {
          accountId: id,
          balance,
          asOfDate: asOfDate || new Date(),
        },
      });
    } catch (error) {
      logger.error(`Error getting account balance: ${error}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get financial metrics for analytics
   */
  async getFinancialMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      // Get financial data from accounting service
      const incomeStatement = await accountingService.generateIncomeStatement(
        new Date(startDate as string),
        new Date(endDate as string),
      );

      const balanceSheet = await accountingService.generateBalanceSheet(
        new Date(endDate as string),
      );

      // Send data to analytics service for processing
      const financialMetrics = await analyticsService.calculateFinancialMetrics(
        incomeStatement,
        balanceSheet,
      );

      res.status(200).json({
        success: true,
        data: financialMetrics,
      });
    } catch (error) {
      logger.error(`Error getting financial metrics: ${error}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get transaction summary for analytics
   */
  async getTransactionSummary(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      // Get transaction data from accounting service
      const transactions = await accountingService.getTransactionsForPeriod(
        new Date(startDate as string),
        new Date(endDate as string),
      );

      // Send data to analytics service for processing
      const transactionSummary =
        await analyticsService.generateTransactionSummary(transactions);

      res.status(200).json({
        success: true,
        data: transactionSummary,
      });
    } catch (error) {
      logger.error(`Error getting transaction summary: ${error}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default new AccountingController();
