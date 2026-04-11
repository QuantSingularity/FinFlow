import { PrismaClient } from "@prisma/client";
import { AccountType } from "./types/account.types";
import {
  Account,
  AccountCreateInput,
  AccountUpdateInput,
} from "./types/account.types";

class AccountModel {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findById(id: string): Promise<Account | null> {
    return this.prisma.account.findUnique({
      where: { id },
    });
  }

  async findByCode(code: string): Promise<Account | null> {
    return this.prisma.account.findUnique({
      where: { code },
    });
  }

  async findByType(type: AccountType): Promise<Account[]> {
    return this.prisma.account.findMany({
      where: { type },
      orderBy: { code: "asc" },
    });
  }

  async create(data: AccountCreateInput): Promise<Account> {
    return this.prisma.account.create({
      data,
    });
  }

  async update(id: string, data: AccountUpdateInput): Promise<Account> {
    return this.prisma.account.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Account> {
    return this.prisma.account.delete({
      where: { id },
    });
  }

  async findAll(): Promise<Account[]> {
    return this.prisma.account.findMany({
      orderBy: { code: "asc" },
    });
  }

  async getAccountBalance(id: string): Promise<number> {
    const account = await this.findById(id);
    if (!account) {
      throw new Error(`Account with ID ${id} not found`);
    }

    // Get all transactions for this account
    const transactions = await this.prisma.ledgerEntry.findMany({
      where: { accountId: id },
    });

    // Calculate balance based on account type and transactions
    let balance = 0;
    for (const transaction of transactions) {
      if (transaction.isCredit) {
        // For asset and expense accounts, credits decrease the balance
        // For liability, equity, and revenue accounts, credits increase the balance
        if (
          account.type === AccountType.ASSET ||
          account.type === AccountType.EXPENSE
        ) {
          balance -= transaction.amount;
        } else {
          balance += transaction.amount;
        }
      } else {
        // For asset and expense accounts, debits increase the balance
        // For liability, equity, and revenue accounts, debits decrease the balance
        if (
          account.type === AccountType.ASSET ||
          account.type === AccountType.EXPENSE
        ) {
          balance += transaction.amount;
        } else {
          balance -= transaction.amount;
        }
      }
    }

    return balance;
  }

  async getTrialBalance(): Promise<
    {
      accountId: string;
      accountCode: string;
      accountName: string;
      debitBalance: number;
      creditBalance: number;
    }[]
  > {
    const accounts = await this.findAll();
    const trialBalance = [];

    for (const account of accounts) {
      const balance = await this.getAccountBalance(account.id);

      // Determine whether to place the balance in debit or credit column based on account type
      let debitBalance = 0;
      let creditBalance = 0;

      if (
        account.type === AccountType.ASSET ||
        account.type === AccountType.EXPENSE
      ) {
        // Asset and expense accounts normally have debit balances
        if (balance >= 0) {
          debitBalance = balance;
        } else {
          creditBalance = -balance;
        }
      } else {
        // Liability, equity, and revenue accounts normally have credit balances
        if (balance >= 0) {
          creditBalance = balance;
        } else {
          debitBalance = -balance;
        }
      }

      trialBalance.push({
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        debitBalance,
        creditBalance,
      });
    }

    return trialBalance;
  }
}

export default new AccountModel();
