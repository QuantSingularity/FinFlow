export enum DataIsolationStrategy {
  SHARED_DATABASE = "SHARED_DATABASE",
  SHARED_SCHEMA = "SHARED_SCHEMA",
  ISOLATED_DATABASE = "ISOLATED_DATABASE",
  ISOLATED_SCHEMA = "ISOLATED_SCHEMA",
}

export interface TenantDataAccess {
  tenantId: string;
  schemaName?: string;
  databaseName?: string;
  connectionString?: string;
  isolationStrategy: DataIsolationStrategy;
}

export interface BulkOperation {
  operationId: string;
  tenantId: string;
  operationType: string;
  data: any[];
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface DataExportOptions {
  tenantId: string;
  format: "JSON" | "CSV" | "XLSX";
  entities?: string[];
  startDate?: Date;
  endDate?: Date;
  includeMetadata?: boolean;
}

export interface DataValidationRule {
  ruleId: string;
  entity: string;
  field: string;
  validationType: string;
  params?: Record<string, any>;
  errorMessage: string;
}

export interface DataEncryption {
  tenantId: string;
  algorithm: string;
  keyId: string;
  encryptedFields: string[];
}
