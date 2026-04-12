export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  category?: string;
  description?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionCreateInput {
  userId: string;
  amount: number;
  category?: string;
  description?: string;
  date?: Date;
}

export interface TransactionUpdateInput {
  amount?: number;
  category?: string;
  description?: string;
  date?: Date;
}

export interface TransactionResponse {
  id: string;
  userId: string;
  amount: number;
  category?: string;
  description?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}
