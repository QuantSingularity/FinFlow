export interface QueryOptimization {
  queryId: string;
  originalQuery: string;
  optimizedQuery?: string;
  estimatedImprovement: number;
  suggestions: string[];
  appliedAt?: Date;
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  indexType: "BTREE" | "HASH" | "GIN" | "GIST";
  reason: string;
  estimatedImpact: number;
  created?: boolean;
}

export interface PartitionStrategy {
  table: string;
  partitionKey: string;
  partitionType: "RANGE" | "LIST" | "HASH";
  partitions: PartitionDefinition[];
}

export interface PartitionDefinition {
  name: string;
  bound: string | number;
}

export interface DatabaseStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  databaseSize: string;
  tableCount: number;
  indexCount: number;
  slowQueryCount: number;
  avgQueryTime: number;
  cacheHitRatio: number;
  collectedAt: Date;
}

export interface QueryPerformance {
  queryId: string;
  query: string;
  executionTime: number;
  rowsAffected: number;
  timestamp: Date;
  parameters?: any[];
  planningTime?: number;
  isSlowQuery: boolean;
}

export interface ConnectionPoolStats {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  maxConnections: number;
  minConnections: number;
}

export interface OptimizationResult {
  success: boolean;
  appliedOptimizations: string[];
  errors: string[];
  performanceGain?: number;
  duration: number;
}
