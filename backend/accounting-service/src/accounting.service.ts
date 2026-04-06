import journalEntryModel from "./journal-entry.model";
import ledgerEntryModel from "./ledger-entry.model";
import accountModel from "./account.model";
import { JournalEntryCreateInput, JournalEntry } from "./journal-entry.types";
import { LedgerEntryCreateInput } from "./types/ledger-entry.types";
import { sendMessage } from "../../common/kafka";
import { logger } from "../../common/logger";

class AccountingService {
  /**
   * Create a journal entry with corresponding ledger entries
   * Implements double-entry accounting principles
   */
  async createJournalEntry(
    journalEntryData: JournalEntryCreateInput,
    ledgerEntries: {
      accountId: string;
      amount: number;
      isCredit: boolean;
      description?: string;
    }[],
  ): Promise<JournalEntry> {
    try {
      // Validate double-entry accounting principle: debits must equal credits
      this.validateDoubleEntry(ledgerEntries);

      // Create journal entry
      const journalEntry = await journalEntryModel.create(journalEntryData);

      // Create ledger entries
      const ledgerEntriesData: LedgerEntryCreateInput[] = ledgerEntries.map(
        (entry) => ({
          journalEntryId: journalEntry.id,
          accountId: entry.accountId,
          amount: entry.amount,
          isCredit: entry.isCredit,
          description: entry.description,
        }),
      );

      await ledgerEntryModel.createMany(ledgerEntriesData);

      // Publish accounting event to Kafka
      await this.publishAccountingEvent("journal_entry_created", {
        journalEntryId: journalEntry.id,
        date: journalEntry.date,
        reference: journalEntry.reference,
        description: journalEntry.description,
        amount: this.calculateJournalEntryAmount(ledgerEntries),
        ledgerEntries: ledgerEntries.map((entry) => ({
          accountId: entry.accountId,
          amount: entry.amount,
          isCredit: entry.isCredit,
        })),
      });

      return journalEntry;
    } catch (error) {
      logger.error(`Error creating journal entry: ${error}`);
      throw error;
    }
  }

  /**
   * Validate that debits equal credits in a set of ledger entries
   */
  private validateDoubleEntry(
    ledgerEntries: { accountId: string; amount: number; isCredit: boolean }[],
  ): void {
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of ledgerEntries) {
      if (entry.isCredit) {
        totalCredits += entry.amount;
      } else {
        totalDebits += entry.amount;
      }
    }

    // Check if debits equal credits (allowing for small floating point differences)
    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      throw new Error(
        `Double-entry accounting principle violated: debits (${totalDebits}) do not equal credits (${totalCredits})`,
      );
    }
  }

  /**
   * Calculate the total amount of a journal entry (sum of all debits or credits)
   */
  private calculateJournalEntryAmount(
    ledgerEntries: { amount: number; isCredit: boolean }[],
  ): number {
    // Sum all debits (or credits, they should be equal)
    return ledgerEntries
      .filter((entry) => !entry.isCredit)
      .reduce((sum, entry) => sum + entry.amount, 0);
  }

  /**
   * Generate a trial balance report
   */
  async generateTrialBalance(): Promise<any> {
    try {
      const trialBalance = await accountModel.getTrialBalance();

      // Calculate totals
      let totalDebits = 0;
      let totalCredits = 0;

      trialBalance.forEach((entry) => {
        totalDebits += entry.debitBalance;
        totalCredits += entry.creditBalance;
      });

      return {
        entries: trialBalance,
        totalDebits,
        totalCredits,
        isBalanced: Math.abs(totalDebits - totalCredits) <= 0.001,
      };
    } catch (error) {
      logger.error(`Error generating trial balance: ${error}`);
      throw error;
    }
  }

  /**
   * Generate an income statement for a specific period
   */
  async generateIncomeStatement(startDate: Date, endDate: Date): Promise<any> {
    try {
      // Get all revenue and expense accounts
      const revenueAccounts = await accountModel.findByType("REVENUE");
      const expenseAccounts = await accountModel.findByType("EXPENSE");

      // Calculate revenue
      const revenueItems = [];
      let totalRevenue = 0;

      for (const account of revenueAccounts) {
        const balance = await this.getAccountBalanceForPeriod(
          account.id,
          startDate,
          endDate,
        );
        if (balance !== 0) {
          revenueItems.push({
            accountId: account.id,
            accountCode: account.code,
            accountName: account.name,
            amount: balance,
          });
          totalRevenue += balance;
        }
      }

      // Calculate expenses
      const expenseItems = [];
      let totalExpenses = 0;

      for (const account of expenseAccounts) {
        const balance = await this.getAccountBalanceForPeriod(
          account.id,
          startDate,
          endDate,
        );
        if (balance !== 0) {
          expenseItems.push({
            accountId: account.id,
            accountCode: account.code,
            accountName: account.name,
            amount: balance,
          });
          totalExpenses += balance;
        }
      }

      // Calculate net income
      const netIncome = totalRevenue - totalExpenses;

      return {
        startDate,
        endDate,
        revenueItems,
        totalRevenue,
        expenseItems,
        totalExpenses,
        netIncome,
      };
    } catch (error) {
      logger.error(`Error generating income statement: ${error}`);
      throw error;
    }
  }

  /**
   * Generate a balance sheet as of a specific date
   */
  async generateBalanceSheet(asOfDate: Date): Promise<any> {
    try {
      // Get all asset, liability, and equity accounts
      const assetAccounts = await accountModel.findByType("ASSET");
      const liabilityAccounts = await accountModel.findByType("LIABILITY");
      const equityAccounts = await accountModel.findByType("EQUITY");

      // Calculate assets
      const assetItems = [];
      let totalAssets = 0;

      for (const account of assetAccounts) {
        const balance = await this.getAccountBalanceAsOf(account.id, asOfDate);
        if (balance !== 0) {
          assetItems.push({
            accountId: account.id,
            accountCode: account.code,
            accountName: account.name,
            amount: balance,
          });
          totalAssets += balance;
        }
      }

      // Calculate liabilities
      const liabilityItems = [];
      let totalLiabilities = 0;

      for (const account of liabilityAccounts) {
        const balance = await this.getAccountBalanceAsOf(account.id, asOfDate);
        if (balance !== 0) {
          liabilityItems.push({
            accountId: account.id,
            accountCode: account.code,
            accountName: account.name,
            amount: balance,
          });
          totalLiabilities += balance;
        }
      }

      // Calculate equity
      const equityItems = [];
      let totalEquity = 0;

      for (const account of equityAccounts) {
        const balance = await this.getAccountBalanceAsOf(account.id, asOfDate);
        if (balance !== 0) {
          equityItems.push({
            accountId: account.id,
            accountCode: account.code,
            accountName: account.name,
            amount: balance,
          });
          totalEquity += balance;
        }
      }

      // Calculate retained earnings (if not already included in equity accounts)
      // This would typically involve calculating net income from all previous periods

      return {
        asOfDate,
        assetItems,
        totalAssets,
        liabilityItems,
        totalLiabilities,
        equityItems,
        totalEquity,
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      };
    } catch (error) {
      logger.error(`Error generating balance sheet: ${error}`);
      throw error;
    }
  }

  /**
   * Generate a cash flow statement for a specific period
   */
  async generateCashFlowStatement(
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    try {
      // This is a simplified implementation
      // A complete implementation would categorize cash flows into operating, investing, and financing activities

      // Get cash accounts
      const cashAccounts = await accountModel.findByType("ASSET");
      const cashAccountIds = cashAccounts
        .filter((account) => account.code.startsWith("101")) // Assuming cash accounts start with 101
        .map((account) => account.id);

      if (cashAccountIds.length === 0) {
        throw new Error("No cash accounts found");
      }

      // Get all ledger entries for cash accounts within the date range
      const cashFlows = [];
      let netCashFlow = 0;

      for (const accountId of cashAccountIds) {
        const ledgerEntries = await ledgerEntryModel.findByAccountId(accountId);

        // Filter entries by date range and include journal entry details
        const filteredEntries = ledgerEntries.filter((entry) => {
          const entryDate = new Date(entry.journalEntry.date);
          return entryDate >= startDate && entryDate <= endDate;
        });

        // Calculate cash flow for this account
        let accountCashFlow = 0;

        for (const entry of filteredEntries) {
          const amount = entry.isCredit ? -entry.amount : entry.amount;
          accountCashFlow += amount;

          cashFlows.push({
            date: entry.journalEntry.date,
            description: entry.journalEntry.description,
            reference: entry.journalEntry.reference,
            amount,
          });
        }

        netCashFlow += accountCashFlow;
      }

      return {
        startDate,
        endDate,
        cashFlows: cashFlows.sort(
          (a, b) => a.date.getTime() - b.date.getTime(),
        ),
        netCashFlow,
      };
    } catch (error) {
      logger.error(`Error generating cash flow statement: ${error}`);
      throw error;
    }
  }

  /**
   * Get account balance for a specific period
   */
  private async getAccountBalanceForPeriod(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    try {
      const account = await accountModel.findById(accountId);
      if (!account) {
        throw new Error(`Account with ID ${accountId} not found`);
      }

      // Get all ledger entries for this account within the date range
      const ledgerEntries = await ledgerEntryModel.findByAccountId(accountId);

      // Filter entries by date range
      const filteredEntries = ledgerEntries.filter((entry) => {
        const entryDate = new Date(entry.journalEntry.date);
        return entryDate >= startDate && entryDate <= endDate;
      });

      // Calculate balance based on account type and transactions
      let balance = 0;

      for (const entry of filteredEntries) {
        if (entry.isCredit) {
          // For asset and expense accounts, credits decrease the balance
          // For liability, equity, and revenue accounts, credits increase the balance
          if (account.type === "ASSET" || account.type === "EXPENSE") {
            balance -= entry.amount;
          } else {
            balance += entry.amount;
          }
        } else {
          // For asset and expense accounts, debits increase the balance
          // For liability, equity, and revenue accounts, debits decrease the balance
          if (account.type === "ASSET" || account.type === "EXPENSE") {
            balance += entry.amount;
          } else {
            balance -= entry.amount;
          }
        }
      }

      return balance;
    } catch (error) {
      logger.error(`Error getting account balance for period: ${error}`);
      throw error;
    }
  }

  /**
   * Get account balance as of a specific date
   */
  private async getAccountBalanceAsOf(
    accountId: string,
    asOfDate: Date,
  ): Promise<number> {
    try {
      const account = await accountModel.findById(accountId);
      if (!account) {
        throw new Error(`Account with ID ${accountId} not found`);
      }

      // Get all ledger entries for this account
      const ledgerEntries = await ledgerEntryModel.findByAccountId(accountId);

      // Filter entries by date
      const filteredEntries = ledgerEntries.filter((entry) => {
        const entryDate = new Date(entry.journalEntry.date);
        return entryDate <= asOfDate;
      });

      // Calculate balance based on account type and transactions
      let balance = 0;

      for (const entry of filteredEntries) {
        if (entry.isCredit) {
          // For asset and expense accounts, credits decrease the balance
          // For liability, equity, and revenue accounts, credits increase the balance
          if (account.type === "ASSET" || account.type === "EXPENSE") {
            balance -= entry.amount;
          } else {
            balance += entry.amount;
          }
        } else {
          // For asset and expense accounts, debits increase the balance
          // For liability, equity, and revenue accounts, debits decrease the balance
          if (account.type === "ASSET" || account.type === "EXPENSE") {
            balance += entry.amount;
          } else {
            balance -= entry.amount;
          }
        }
      }

      return balance;
    } catch (error) {
      logger.error(`Error getting account balance as of date: ${error}`);
      throw error;
    }
  }

  /**
   * Publish accounting event to Kafka
   */
  private async publishAccountingEvent(
    eventType: string,
    data: any,
  ): Promise<void> {
    try {
      await sendMessage(`accounting_${eventType}`, {
        timestamp: new Date(),
        ...data,
      });
    } catch (error) {
      logger.error(`Error publishing accounting event: ${error}`);
      // Don't throw error, just log it
    }
  }

  async getAllJournalEntries(): Promise<any[]> {
    try {
      return await journalEntryModel.findAll();
    } catch (error) {
      logger.error("Error getting all journal entries: " + error);
      throw error;
    }
  }

  async getAccountBalance(
    accountId: string,
    asOfDate: Date = new Date(),
  ): Promise<any> {
    try {
      const account = await accountModel.findById(accountId);
      if (!account) return null;
      const ledgerSummary = await ledgerEntryModel.getAccountBalanceByDate(
        accountId,
        asOfDate,
      );
      const balance = ledgerSummary.totalDebit - ledgerSummary.totalCredit;
      return { accountId, account, balance, ledgerSummary, asOfDate };
    } catch (error) {
      logger.error("Error getting account balance: " + error);
      throw error;
    }
  }
}

export default new AccountingService();
