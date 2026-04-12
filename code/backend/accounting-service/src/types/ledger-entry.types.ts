export interface LedgerEntry {
  id: string;
  journalEntryId: string;
  accountId: string;
  amount: number;
  isCredit: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  account?: any;
  journalEntry?: any;
}

export interface LedgerEntryCreateInput {
  journalEntryId: string;
  accountId: string;
  amount: number;
  isCredit: boolean;
  description?: string;
}

export interface LedgerEntryUpdateInput {
  amount?: number;
  isCredit?: boolean;
  description?: string;
}

export interface LedgerEntryWithAccount extends LedgerEntry {
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
}
