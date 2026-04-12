import { PrismaClient } from "@prisma/client";
import {
  LedgerEntry,
  LedgerEntryCreateInput,
  LedgerEntryUpdateInput,
} from "./types/ledger-entry.types";

class LedgerEntryModel {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findById(id: string): Promise<LedgerEntry | null> {
    return this.prisma.ledgerEntry.findUnique({
      where: { id },
    });
  }

  async findByJournalEntryId(journalEntryId: string): Promise<LedgerEntry[]> {
    return this.prisma.ledgerEntry.findMany({
      where: { journalEntryId },
      include: { account: true },
    });
  }

  async findByJournalEntryIds(
    journalEntryIds: string[],
  ): Promise<LedgerEntry[]> {
    return this.prisma.ledgerEntry.findMany({
      where: { journalEntryId: { in: journalEntryIds } },
      include: { account: true },
    });
  }

  async findByAccountId(accountId: string): Promise<LedgerEntry[]> {
    return this.prisma.ledgerEntry.findMany({
      where: { accountId },
      include: { journalEntry: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: LedgerEntryCreateInput): Promise<LedgerEntry> {
    return this.prisma.ledgerEntry.create({
      data,
      include: { account: true, journalEntry: true },
    });
  }

  async createMany(data: any[]): Promise<any[]> {
    const created: LedgerEntry[] = [];
    for (const entry of data) {
      const result = await this.prisma.ledgerEntry.create({ data: entry });
      created.push(result);
    }
    return created;
  }

  async update(id: string, data: LedgerEntryUpdateInput): Promise<LedgerEntry> {
    return this.prisma.ledgerEntry.update({
      where: { id },
      data,
      include: { account: true, journalEntry: true },
    });
  }

  async delete(id: string): Promise<LedgerEntry> {
    return this.prisma.ledgerEntry.delete({ where: { id } });
  }

  async findAll(): Promise<LedgerEntry[]> {
    return this.prisma.ledgerEntry.findMany({
      include: { account: true, journalEntry: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<LedgerEntry[]> {
    return this.prisma.ledgerEntry.findMany({
      where: {
        journalEntry: {
          date: { gte: startDate, lte: endDate },
        },
      },
      include: { account: true, journalEntry: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Returns an array of {accountId, totalDebit, totalCredit} objects.
   */
  async getAccountBalances(): Promise<
    { accountId: string; totalDebit: number; totalCredit: number }[]
  > {
    const entries = await this.findAll();
    const map: Record<string, { totalDebit: number; totalCredit: number }> = {};

    for (const entry of entries) {
      if (!map[entry.accountId]) {
        map[entry.accountId] = { totalDebit: 0, totalCredit: 0 };
      }
      if ((entry as any).isCredit) {
        map[entry.accountId].totalCredit += entry.amount;
      } else {
        map[entry.accountId].totalDebit += entry.amount;
      }
    }

    return Object.entries(map).map(([accountId, v]) => ({
      accountId,
      totalDebit: v.totalDebit,
      totalCredit: v.totalCredit,
    }));
  }

  /**
   * Returns array of {accountId, totalDebit, totalCredit} for given account IDs in date range.
   */
  async getAccountBalancesByDateRange(
    accountIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<{ accountId: string; totalDebit: number; totalCredit: number }[]> {
    const entries = await this.findByDateRange(startDate, endDate);
    const filtered = entries.filter((e) => accountIds.includes(e.accountId));

    const map: Record<string, { totalDebit: number; totalCredit: number }> = {};
    for (const entry of filtered) {
      if (!map[entry.accountId]) {
        map[entry.accountId] = { totalDebit: 0, totalCredit: 0 };
      }
      if ((entry as any).isCredit) {
        map[entry.accountId].totalCredit += entry.amount;
      } else {
        map[entry.accountId].totalDebit += entry.amount;
      }
    }

    return Object.entries(map).map(([accountId, v]) => ({
      accountId,
      totalDebit: v.totalDebit,
      totalCredit: v.totalCredit,
    }));
  }

  async getAccountBalanceByDate(
    accountId: string,
    asOfDate: Date,
  ): Promise<{ accountId: string; totalDebit: number; totalCredit: number }> {
    const entries = await this.findByDateRange(
      new Date("1970-01-01"),
      asOfDate,
    );
    const accountEntries = entries.filter((e) => e.accountId === accountId);

    const totalDebit = accountEntries
      .filter((e: any) => !e.isCredit)
      .reduce((sum, e) => sum + e.amount, 0);

    const totalCredit = accountEntries
      .filter((e: any) => e.isCredit)
      .reduce((sum, e) => sum + e.amount, 0);

    return { accountId, totalDebit, totalCredit };
  }
}

export default new LedgerEntryModel();
