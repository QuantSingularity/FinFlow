export interface QuickBooksConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: "sandbox" | "production";
  companyId?: string;
}

export interface QuickBooksTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  xRefreshTokenExpiresIn: number;
  idToken?: string;
  createdAt?: Date;
}

export interface QuickBooksCompany {
  id: string;
  name: string;
  legalName?: string;
  country?: string;
  currency?: string;
  fiscalYearStart?: string;
}

export interface QuickBooksCustomer {
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
  balance?: number;
  active: boolean;
}

export interface QuickBooksInvoice {
  id: string;
  docNumber?: string;
  customerId: string;
  totalAmount: number;
  balance: number;
  dueDate?: string;
  status: string;
  lineItems: any[];
  createdAt?: string;
  updatedAt?: string;
}

export interface QuickBooksPayment {
  id: string;
  customerId: string;
  totalAmount: number;
  currency: string;
  paymentMethodRef?: string;
  depositToAccountRef?: string;
  transactionDate?: string;
}

export interface QuickBooksItem {
  id: string;
  name: string;
  description?: string;
  unitPrice?: number;
  type: string;
  active: boolean;
}

export interface QuickBooksAccount {
  id: string;
  name: string;
  accountType: string;
  accountSubType?: string;
  currentBalance?: number;
  currency?: string;
  active: boolean;
}

export interface QuickBooksTransaction {
  id: string;
  txnDate: string;
  amount: number;
  type: string;
  description?: string;
  accountId?: string;
}

export interface QuickBooksSyncResult {
  success: boolean;
  entityType: string;
  synced: number;
  failed: number;
  errors: string[];
  lastSyncAt: Date;
}
