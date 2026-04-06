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
      include: {
        account: true,
      },
    });
  }

  async findByAccountId(accountId: string): Promise<LedgerEntry[]> {
    return this.prisma.ledgerEntry.findMany({
      where: { accountId },
      include: {
        journalEntry: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: LedgerEntryCreateInput): Promise<LedgerEntry> {
    return this.prisma.ledgerEntry.create({
      data,
      include: {
        account: true,
        journalEntry: true,
      },
    });
  }

  async createMany(data: LedgerEntryCreateInput[]): Promise<number> {
    const result = await this.prisma.ledgerEntry.createMany({
      data,
    });
    return result.count;
  }

  async update(id: string, data: LedgerEntryUpdateInput): Promise<LedgerEntry> {
    return this.prisma.ledgerEntry.update({
      where: { id },
      data,
      include: {
        account: true,
        journalEntry: true,
      },
    });
  }

  async delete(id: string): Promise<LedgerEntry> {
    return this.prisma.ledgerEntry.delete({
      where: { id },
    });
  }

  async findAll(): Promise<LedgerEntry[]> {
    return this.prisma.ledgerEntry.findMany({
      include: {
        account: true,
        journalEntry: true,
      },
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
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        account: true,
        journalEntry: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getAccountBalances(): Promise<Record<string, number>> {
    const entries = await this.findAll();
    const balances: Record<string, number> = {};
    for (const entry of entries) {
      if (!balances[entry.accountId]) balances[entry.accountId] = 0;
      balances[entry.accountId] += entry.isCredit
        ? -entry.amount
        : entry.amount;
    }
    return balances;
  }

  async getAccountBalancesByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, number>> {
    const entries = await this.findByDateRange(startDate, endDate);
    const balances: Record<string, number> = {};
    for (const entry of entries) {
      if (!balances[entry.accountId]) balances[entry.accountId] = 0;
      balances[entry.accountId] += entry.isCredit
        ? -entry.amount
        : entry.amount;
    }
    return balances;
  }

  async getAccountBalanceByDate(
    accountId: string,
    asOfDate: Date,
  ): Promise<{ accountId: string; totalDebit: number; totalCredit: number }> {
    const entries = await this.findByDateRange(
      new Date("1970-01-01"),
      asOfDate,
    );
    const accountEntries = entries.filter(
      (e: any) => e.accountId === accountId,
    );
    const totalDebit = accountEntries
      .filter((e: any) => !e.isCredit)
      .reduce((sum: number, e: any) => sum + e.amount, 0);
    const totalCredit = accountEntries
      .filter((e: any) => e.isCredit)
      .reduce((sum: number, e: any) => sum + e.amount, 0);
    return { accountId, totalDebit, totalCredit };
  }
}

export default new LedgerEntryModel();
