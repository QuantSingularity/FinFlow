export interface XeroConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  tenantId?: string;
}

export interface XeroTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  idToken?: string;
  scope?: string;
  createdAt?: Date;
}

export interface XeroOrganisation {
  tenantId: string;
  tenantName: string;
  tenantType: string;
  baseCurrency?: string;
  countryCode?: string;
  isDemoCompany?: boolean;
}

export interface XeroContact {
  contactId: string;
  name: string;
  emailAddress?: string;
  phones?: any[];
  isCustomer?: boolean;
  isSupplier?: boolean;
  balances?: any;
}

export interface XeroInvoice {
  invoiceId: string;
  invoiceNumber?: string;
  type: "ACCREC" | "ACCPAY";
  contactId: string;
  total: number;
  amountDue: number;
  amountPaid: number;
  status: string;
  dueDate?: string;
  lineItems: any[];
  updatedDateUtc?: string;
}

export interface XeroPayment {
  paymentId: string;
  invoiceId?: string;
  accountId: string;
  amount: number;
  currency: string;
  date: string;
  reference?: string;
  paymentType?: string;
}

export interface XeroAccount {
  accountId: string;
  code?: string;
  name: string;
  type: string;
  bankAccountNumber?: string;
  currencyCode?: string;
  enablePaymentsToAccount?: boolean;
}

export interface XeroTransaction {
  bankTransactionId: string;
  type: string;
  contactId?: string;
  bankAccountId: string;
  total: number;
  date: string;
  reference?: string;
  isReconciled?: boolean;
}

export interface XeroSyncResult {
  success: boolean;
  entityType: string;
  synced: number;
  failed: number;
  errors: string[];
  lastSyncAt: Date;
}
