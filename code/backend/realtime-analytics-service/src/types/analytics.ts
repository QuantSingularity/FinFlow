// Core analytics types
export interface AnalyticsMetrics {
  timestamp: number;
  userId: string;
  transactionId?: string;
  paymentId?: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  merchantId?: string;
  category?: string;
  location?: {
    latitude: number;
    longitude: number;
    country?: string;
    city?: string;
  };
  paymentMethod?: string;
  gateway?: string;
  metadata?: Record<string, any>;
}

// Event types for streaming
export interface TransactionEvent {
  transactionId: string;
  userId: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  merchantId?: string;
  category?: string;
  location?: {
    latitude: number;
    longitude: number;
    country?: string;
    city?: string;
  };
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PaymentEvent {
  paymentId: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  gateway: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// Real-time insights
export interface RealtimeInsight {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  data: any;
  timestamp: number;
}

// Aggregation results
export interface AggregationResult {
  totalCount: number;
  totalAmount: number;
  averageAmount: number;
  uniqueUsers: number;
  currencies: Record<string, number>;
  types: Record<string, number>;
  timeRange: {
    start: number;
    end: number;
  };
}

// Streaming window interface
export interface StreamingWindow {
  name: string;
  interval: number;
  addMetrics(metrics: AnalyticsMetrics): void;
  getAggregatedData(): AggregationResult;
  getUserMetrics(userId: string): AggregationResult;
}

// Anomaly detection types
export interface AnomalyScore {
  type: string;
  score: number; // 0-1 scale
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  features: Record<string, any>;
  timestamp: number;
  confidence: number; // 0-1 scale
}

export interface AnomalyAlert {
  id: string;
  userId: string;
  transactionId?: string;
  anomalyType: string;
  severity: "low" | "medium" | "high" | "critical";
  score: number;
  confidence: number;
  description: string;
  features: Record<string, any>;
  timestamp: number;
  status: "active" | "investigating" | "resolved" | "false_positive";
  investigationRequired: boolean;
  metadata?: Record<string, any>;
}

// Model types for anomaly detection
export interface AnomalyModel {
  modelType: string;
  lastTrained: number;
  isActive: boolean;
}

export interface StatisticalThreshold extends AnomalyModel {
  mean: number;
  standardDeviation: number;
  zScoreThreshold: number;
  movingAverageWindow: number;
  dataPoints: number[];
  lastUpdated: number;
  isCalibrated: boolean;
}

export interface IsolationForestModel extends AnomalyModel {
  contamination: number;
  nEstimators: number;
  maxSamples: number;
  features: string[];
  trainingData: Record<string, number>[];
  isTrained: boolean;
}

// User risk profiling
export interface RiskProfile {
  userId: string;
  riskScore: number; // 0-1 scale
  transactionHistory: {
    totalTransactions: number;
    totalAmount: number;
    averageAmount: number;
    currencies: Set<string>;
    merchants: Set<string>;
    locations: Set<string>;
  };
  behaviorPatterns: {
    preferredHours: Map<number, number>;
    preferredDays: Map<number, number>;
    averageSessionDuration: number;
    loginFrequency: number;
  };
  anomalyHistory: Array<{
    timestamp: number;
    scores: AnomalyScore[];
    riskScore: number;
  }>;
  lastUpdated: number;
  createdAt: number;
}

// API request/response types
export interface RealtimeMetricsRequest {
  userId?: string;
  timeRange?: {
    start: number;
    end: number;
  };
  metrics?: string[];
}

export interface RealtimeMetricsResponse {
  success: boolean;
  data: {
    realtime: AggregationResult;
    minute: AggregationResult;
    hour: AggregationResult;
    day: AggregationResult;
  };
  timestamp: number;
}

export interface HistoricalDataRequest {
  userId?: string;
  startTime: number;
  endTime: number;
  granularity?: "minute" | "hour" | "day";
  metrics?: string[];
}

export interface HistoricalDataResponse {
  success: boolean;
  data: {
    transactions: AnalyticsMetrics[];
    payments: AnalyticsMetrics[];
    summary: AggregationResult;
    aggregations?: Record<string, AggregationResult[]>;
  };
  timestamp: number;
}

export interface AnomalyAnalysisRequest {
  userId?: string;
  timeRange?: {
    start: number;
    end: number;
  };
  severity?: "low" | "medium" | "high" | "critical";
  types?: string[];
}

export interface AnomalyAnalysisResponse {
  success: boolean;
  data: {
    alerts: AnomalyAlert[];
    riskProfile?: RiskProfile;
    summary: {
      totalAlerts: number;
      activealerts: number;
      riskDistribution: Record<string, number>;
    };
  };
  timestamp: number;
}

// WebSocket event types
export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: number;
  userId?: string;
}

export interface SubscriptionRequest {
  userId?: string;
  metrics: string[];
  filters?: Record<string, any>;
}

export interface SubscriptionResponse {
  success: boolean;
  subscriptionId: string;
  message: string;
}

// Dashboard types
export interface DashboardMetrics {
  overview: {
    totalTransactions: number;
    totalVolume: number;
    activeUsers: number;
    averageTransactionValue: number;
    growthRate: number;
  };
  realtime: {
    transactionsPerSecond: number;
    volumePerSecond: number;
    activeConnections: number;
    processingLatency: number;
  };
  anomalies: {
    activeAlerts: number;
    highRiskUsers: number;
    falsePositiveRate: number;
    detectionAccuracy: number;
  };
  performance: {
    systemLoad: number;
    memoryUsage: number;
    kafkaLag: number;
    databaseConnections: number;
  };
}

export interface DashboardWidget {
  id: string;
  type: "chart" | "metric" | "table" | "alert";
  title: string;
  data: any;
  config: {
    refreshInterval?: number;
    autoRefresh?: boolean;
    filters?: Record<string, any>;
  };
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Configuration types
export interface AnalyticsConfig {
  batchSize: number;
  flushInterval: number;
  retentionDays: number;
  aggregationIntervals: {
    realtime: number;
    minute: number;
    hour: number;
    day: number;
  };
}

export interface AnomalyDetectionConfig {
  enabled: boolean;
  sensitivity: number;
  windowSize: number;
  minDataPoints: number;
  alertThreshold: number;
  models: {
    isolationForest: {
      contamination: number;
      nEstimators: number;
      maxSamples: number;
    };
    statisticalThreshold: {
      zScoreThreshold: number;
      movingAverageWindow: number;
    };
  };
}

// Error types
export interface AnalyticsError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  userId?: string;
  transactionId?: string;
}

// Monitoring types
export interface HealthCheck {
  service: string;
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: number;
  details: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    connections: {
      kafka: boolean;
      redis: boolean;
      postgres: boolean;
      mongodb: boolean;
    };
    metrics: {
      messagesProcessed: number;
      errorsCount: number;
      averageProcessingTime: number;
    };
  };
}

export interface ServiceMetrics {
  timestamp: number;
  service: string;
  metrics: {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
    activeConnections: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
  };
}

// Export utility types
export type MetricType = "transaction" | "payment" | "user" | "system";
export type TimeGranularity =
  | "second"
  | "minute"
  | "hour"
  | "day"
  | "week"
  | "month";
export type AggregationType =
  | "sum"
  | "avg"
  | "min"
  | "max"
  | "count"
  | "distinct";
export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type AlertStatus =
  | "active"
  | "investigating"
  | "resolved"
  | "false_positive";

// Utility interfaces
export interface TimeRange {
  start: number;
  end: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total?: number;
}

export interface SortOptions {
  field: string;
  direction: "asc" | "desc";
}

export interface FilterOptions {
  userId?: string;
  transactionId?: string;
  amount?: {
    min?: number;
    max?: number;
  };
  currency?: string[];
  type?: string[];
  status?: string[];
  timeRange?: TimeRange;
}

// Advanced analytics types
export interface TrendAnalysis {
  metric: string;
  timeRange: TimeRange;
  trend: "increasing" | "decreasing" | "stable" | "volatile";
  changeRate: number;
  confidence: number;
  dataPoints: Array<{
    timestamp: number;
    value: number;
  }>;
}

export interface CorrelationAnalysis {
  metrics: string[];
  correlationMatrix: number[][];
  significantCorrelations: Array<{
    metric1: string;
    metric2: string;
    correlation: number;
    pValue: number;
  }>;
}

export interface ForecastResult {
  metric: string;
  timeRange: TimeRange;
  predictions: Array<{
    timestamp: number;
    value: number;
    confidence: number;
  }>;
  accuracy: number;
  model: string;
}

// Machine learning types
export interface MLModel {
  id: string;
  name: string;
  type: "classification" | "regression" | "clustering" | "anomaly_detection";
  version: string;
  features: string[];
  target?: string;
  performance: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    mse?: number;
    rmse?: number;
  };
  trainingData: {
    size: number;
    lastTrained: number;
    dataRange: TimeRange;
  };
  status: "training" | "ready" | "deprecated" | "error";
}

export interface PredictionRequest {
  modelId: string;
  features: Record<string, any>;
  userId?: string;
}

export interface PredictionResponse {
  success: boolean;
  prediction: any;
  confidence: number;
  modelVersion: string;
  timestamp: number;
}

// Data quality types
export interface DataQualityMetrics {
  completeness: number; // 0-1 scale
  accuracy: number; // 0-1 scale
  consistency: number; // 0-1 scale
  timeliness: number; // 0-1 scale
  validity: number; // 0-1 scale
  uniqueness: number; // 0-1 scale
}

export interface DataQualityReport {
  timestamp: number;
  timeRange: TimeRange;
  overall: DataQualityMetrics;
  byField: Record<string, DataQualityMetrics>;
  issues: Array<{
    type: string;
    severity: "low" | "medium" | "high";
    description: string;
    affectedRecords: number;
    suggestions: string[];
  }>;
}

// Export all types
export * from "./analytics";
