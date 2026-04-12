export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

export interface Invoice {
  id: string;
  userId: string;
  client: string;
  amount: number;
  dueDate: Date;
  status: InvoiceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceCreateInput {
  userId: string;
  client: string;
  amount: number;
  dueDate: Date;
  status?: InvoiceStatus;
}

export interface InvoiceUpdateInput {
  client?: string;
  amount?: number;
  dueDate?: Date;
  status?: InvoiceStatus;
}

export interface InvoiceResponse {
  id: string;
  userId: string;
  client: string;
  amount: number;
  dueDate: Date;
  status: InvoiceStatus;
  createdAt: Date;
  updatedAt: Date;
}
