export interface JournalEntry {
  id: string;
  invoiceId?: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  date: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalEntryCreateInput {
  invoiceId?: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  date?: Date;
  description?: string;
}

export interface JournalEntryUpdateInput {
  debitAccount?: string;
  creditAccount?: string;
  amount?: number;
  date?: Date;
  description?: string;
}

export interface JournalEntryResponse {
  id: string;
  invoiceId?: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  date: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
