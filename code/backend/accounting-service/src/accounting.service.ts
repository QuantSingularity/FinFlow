import journalEntryModel from "./journal-entry.model";
import ledgerEntryModel from "./ledger-entry.model";
import accountModel from "./account.model";
import analyticsService from "./analytics.service";
import { JournalEntryCreateInput } from "./journal-entry.types";
import { sendMessage } from "../../common/kafka";
import { logger } from "../../common/logger";

export interface LedgerEntryInput {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

class AccountingService {
  async createJournalEntry(
    journalEntryData: JournalEntryCreateInput,
    ledgerEntries: LedgerEntryInput[],
  ): Promise<{
    journalEntry: import("./journal-entry.types").JournalEntry;
    ledgerEntries: import("./types/ledger-entry.types").LedgerEntry[];
  }> {
    try {
      this.validateDoubleEntry(ledgerEntries);

      const journalEntry = await journalEntryModel.create(journalEntryData);

      const ledgerEntriesData = ledgerEntries.map((entry) => ({
        ...entry,
        journalEntryId: journalEntry.id,
      }));

      const createdLedgerEntries =
        await ledgerEntryModel.createMany(ledgerEntriesData);

      const result = { journalEntry, ledgerEntries: createdLedgerEntries };

      await analyticsService.sendAccountingDataToAnalytics(
        result,
        "JOURNAL_ENTRY",
      );

      await this.publishAccountingEvent("journal_entry_created", {
        journalEntryId: journalEntry.id,
        ledgerEntries: ledgerEntriesData,
      });

      return result;
    } catch (error) {
      logger.error(`Error creating journal entry: ${error}`);
      throw error;
    }
  }

  private validateDoubleEntry(ledgerEntries: LedgerEntryInput[]): void {
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of ledgerEntries) {
      totalDebits += entry.debit || 0;
      totalCredits += entry.credit || 0;
    }

    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      throw new Error("Ledger entries must be balanced");
    }
  }

  async getAllJournalEntries(): Promise<any[]> {
    try {
      const journalEntries = await journalEntryModel.findAll();

      if (journalEntries.length === 0) {
        return [];
      }

      const journalEntryIds = journalEntries.map((je: { id: string }) => je.id);
      const allLedgerEntries =
        await ledgerEntryModel.findByJournalEntryIds(journalEntryIds);

      return journalEntries.map((je: Record<string, unknown>) => ({
        ...je,
        ledgerEntries: allLedgerEntries.filter(
          (le: { journalEntryId: string }) => le.journalEntryId === je.id,
        ),
      }));
    } catch (error) {
      logger.error("Error getting all journal entries: " + error);
      throw error;
    }
  }

  async generateTrialBalance(): Promise<any> {
    try {
      const accounts = await accountModel.findAll();
      const ledgerSummaries = await ledgerEntryModel.getAccountBalances();

      let totalDebit = 0;
      let totalCredit = 0;

      const accountEntries = accounts.map(
        (account: Record<string, unknown>) => {
          const summary = (
            ledgerSummaries as Array<Record<string, unknown>>
          ).find((s: { accountId: string }) => s.accountId === account.id) || {
            totalDebit: 0,
            totalCredit: 0,
          };

          const debit = summary.totalDebit || 0;
          const credit = summary.totalCredit || 0;
          // Balance: for asset/expense debit-normal accounts balance = debit - credit,
          // for liability/equity/revenue credit-normal accounts balance = credit - debit
          const accountType = account.accountType || account.type || "";
          // Balance = debit - credit (positive = net debit, negative = net credit)
          const balance = debit - credit;

          totalDebit += debit;
          totalCredit += credit;

          return {
            id: account.id,
            name: account.name,
            accountCode: account.accountCode || account.code,
            accountType,
            debit,
            credit,
            balance,
          };
        },
      );

      return {
        accounts: accountEntries,
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) <= 0.001,
      };
    } catch (error) {
      logger.error(`Error generating trial balance: ${error}`);
      throw error;
    }
  }

  async generateIncomeStatement(startDate: Date, endDate: Date): Promise<any> {
    try {
      const revenueAccounts = await accountModel.findByType("REVENUE");
      const expenseAccounts = await accountModel.findByType("EXPENSE");

      const revenueAccountIds = revenueAccounts.map(
        (a: { id: string }) => a.id,
      );
      const expenseAccountIds = expenseAccounts.map(
        (a: { id: string }) => a.id,
      );

      const revenueSummaries =
        await ledgerEntryModel.getAccountBalancesByDateRange(
          revenueAccountIds,
          startDate,
          endDate,
        );

      const expenseSummaries =
        await ledgerEntryModel.getAccountBalancesByDateRange(
          expenseAccountIds,
          startDate,
          endDate,
        );

      const revenueItems = revenueAccounts.map(
        (account: Record<string, unknown>) => {
          const summary = (
            revenueSummaries as Array<Record<string, unknown>>
          ).find((s: { accountId: string }) => s.accountId === account.id) || {
            totalDebit: 0,
            totalCredit: 0,
          };
          const amount = summary.totalCredit - summary.totalDebit;
          return {
            accountId: account.id,
            accountCode: account.accountCode || account.code,
            name: account.name,
            amount,
          };
        },
      );

      const expenseItems = expenseAccounts.map(
        (account: Record<string, unknown>) => {
          const summary = (
            expenseSummaries as Array<Record<string, unknown>>
          ).find((s: { accountId: string }) => s.accountId === account.id) || {
            totalDebit: 0,
            totalCredit: 0,
          };
          const amount = summary.totalDebit - summary.totalCredit;
          return {
            accountId: account.id,
            accountCode: account.accountCode || account.code,
            name: account.name,
            amount,
          };
        },
      );

      const totalRevenue = revenueItems.reduce(
        (sum: number, item: { amount: number }) => sum + item.amount,
        0,
      );
      const totalExpenses = expenseItems.reduce(
        (sum: number, item: { amount: number }) => sum + item.amount,
        0,
      );
      const netIncome = totalRevenue - totalExpenses;

      return {
        startDate,
        endDate,
        revenueItems,
        expenseItems,
        totalRevenue,
        totalExpenses,
        netIncome,
      };
    } catch (error) {
      logger.error(`Error generating income statement: ${error}`);
      throw error;
    }
  }

  async getAccountBalance(
    accountId: string,
    asOfDate: Date = new Date(),
  ): Promise<number> {
    try {
      const account = await accountModel.findById(accountId);
      if (!account) {
        throw new Error("Account not found");
      }

      const ledgerSummary = await ledgerEntryModel.getAccountBalanceByDate(
        accountId,
        asOfDate,
      );

      const accountType =
        ((account as Record<string, unknown>)["accountType"] as string) ||
        ((account as Record<string, unknown>)["type"] as string);

      if (accountType === "ASSET" || accountType === "EXPENSE") {
        return ledgerSummary.totalDebit - ledgerSummary.totalCredit;
      } else {
        return ledgerSummary.totalCredit - ledgerSummary.totalDebit;
      }
    } catch (error) {
      logger.error("Error getting account balance: " + error);
      throw error;
    }
  }

  async generateBalanceSheet(asOfDate: Date): Promise<any> {
    try {
      const assetAccounts = await accountModel.findByType("ASSET");
      const liabilityAccounts = await accountModel.findByType("LIABILITY");
      const equityAccounts = await accountModel.findByType("EQUITY");

      const buildItems = async (accounts: Array<Record<string, unknown>>) => {
        const items = [];
        let total = 0;
        for (const account of accounts) {
          const balance = await this.getAccountBalance(account.id, asOfDate);
          if (balance !== 0) {
            items.push({
              accountId: account.id,
              accountCode: account.accountCode || account.code,
              name: account.name,
              amount: balance,
            });
            total += balance;
          }
        }
        return { items, total };
      };

      const { items: assetItems, total: totalAssets } =
        await buildItems(assetAccounts);
      const { items: liabilityItems, total: totalLiabilities } =
        await buildItems(liabilityAccounts);
      const { items: equityItems, total: totalEquity } =
        await buildItems(equityAccounts);

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

  async generateCashFlowStatement(
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    try {
      const cashAccounts = await accountModel.findByType("ASSET");
      const cashAccountIds = cashAccounts
        .filter((account: Record<string, unknown>) => {
          const code = account.code || account.accountCode || "";
          return code.startsWith("101");
        })
        .map((account: Record<string, unknown>) => account["id"] as string);

      if (cashAccountIds.length === 0) {
        throw new Error("No cash accounts found");
      }

      const cashFlows: Array<Record<string, unknown>> = [];
      let netCashFlow = 0;

      for (const accountId of cashAccountIds) {
        const ledgerEntries = await ledgerEntryModel.findByAccountId(accountId);

        const filteredEntries = ledgerEntries.filter(
          (entry: Record<string, unknown>) => {
            const entryDate = new Date(entry.journalEntry.date);
            return entryDate >= startDate && entryDate <= endDate;
          },
        );

        for (const entry of filteredEntries) {
          const amount = entry.isCredit ? -entry.amount : entry.amount;
          netCashFlow += amount;
          cashFlows.push({
            date: entry.journalEntry.date,
            description: entry.journalEntry.description,
            reference: entry.journalEntry.reference,
            amount,
          });
        }
      }

      return {
        startDate,
        endDate,
        cashFlows: cashFlows.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        ),
        netCashFlow,
      };
    } catch (error) {
      logger.error(`Error generating cash flow statement: ${error}`);
      throw error;
    }
  }

  private async publishAccountingEvent(
    eventType: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      await sendMessage(`accounting_${eventType}`, {
        timestamp: new Date(),
        ...data,
      });
    } catch (error) {
      logger.error(`Error publishing accounting event: ${error}`);
    }
  }
}

export default new AccountingService();
