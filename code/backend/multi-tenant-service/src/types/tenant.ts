export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: "ACTIVE" | "SUSPENDED" | "CANCELLED" | "TRIAL";
  settings?: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSettings {
  tenantId: string;
  maxUsers: number;
  maxStorageGb: number;
  features: string[];
  customDomain?: string;
  ssoEnabled: boolean;
  mfaRequired: boolean;
  ipWhitelist?: string[];
  dataRetentionDays: number;
  webhookUrl?: string;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  userId: string;
  role: string;
  permissions: string[];
  joinedAt: Date;
  lastActiveAt?: Date;
}

export interface TenantAnalytics {
  tenantId: string;
  activeUsers: number;
  totalUsers: number;
  storageUsedGb: number;
  apiCallsThisMonth: number;
  lastActivityAt?: Date;
  period: { start: Date; end: Date };
}

export interface TenantCreationRequest {
  name: string;
  slug: string;
  plan: string;
  adminEmail: string;
  adminName?: string;
  settings?: Partial<TenantSettings>;
}

export interface TenantUpdateRequest {
  name?: string;
  plan?: string;
  status?: Tenant["status"];
  settings?: Partial<TenantSettings>;
}

export interface TenantSubscription {
  id: string;
  tenantId: string;
  plan: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId?: string;
}

export interface TenantBilling {
  tenantId: string;
  currentBalance: number;
  currency: string;
  nextInvoiceDate?: Date;
  nextInvoiceAmount?: number;
  paymentMethod?: { type: string; last4?: string; brand?: string };
}
