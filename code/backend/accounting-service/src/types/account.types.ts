export type AccountType =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "EXPENSE";

export interface Account {
  id: string;
  code: string;
  name: string;
  description: string;
  type: AccountType;
  isActive: boolean;
  parentAccountId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountCreateInput {
  code: string;
  name: string;
  description: string;
  type: AccountType;
  isActive?: boolean;
  parentAccountId?: string | null;
}

export interface AccountUpdateInput {
  code?: string;
  name?: string;
  description?: string;
  type?: AccountType;
  isActive?: boolean;
  parentAccountId?: string | null;
}

export interface AccountBalanceResponse {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  balance: number;
}

export interface TrialBalanceEntry {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalanceResponse {
  entries: TrialBalanceEntry[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}
