import { Server as SocketIOServer } from "socket.io";
import { Kafka, Consumer, Producer, EachMessagePayload } from "kafkajs";
import Redis from "ioredis";
import { Pool } from "pg";
import { MongoClient, Db, Collection } from "mongodb";
import winston from "winston";
import { EventEmitter } from "events";
import * as cron from "node-cron";

import { config } from "../config/config";
import { logger } from "../config/logger";
import {
  TransactionEvent,
  PaymentEvent,
  AnalyticsMetrics,
  StreamingWindow,
  AggregationResult,
  RealtimeInsight,
} from "../types/analytics";

export class StreamingAnalyticsService extends EventEmitter {
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private redis: Redis;
  private pgPool: Pool;
  private mongodb: Db;
  private io: SocketIOServer;

  private isInitialized: boolean = false;
  private isProcessing: boolean = false;

  // Streaming windows for different time intervals
  private realtimeWindow: StreamingWindow;
  private minuteWindow: StreamingWindow;
  private hourWindow: StreamingWindow;
  private dayWindow: StreamingWindow;

  // Metrics aggregation
  private metricsBuffer: Map<string, AnalyticsMetrics[]> = new Map();
  private lastFlushTime: number = Date.now();

  constructor(io: SocketIOServer) {
    super();
    this.io = io;
    this.initializeComponents();
  }

  private initializeComponents(): void {
    // Initialize Kafka
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.consumer = this.kafka.consumer({
      groupId: config.kafka.groupId,
      sessionTimeout: config.kafka.consumer.sessionTimeout,
      rebalanceTimeout: config.kafka.consumer.rebalanceTimeout,
      heartbeatInterval: config.kafka.consumer.heartbeatInterval,
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: config.kafka.producer.maxInFlightRequests,
      idempotent: config.kafka.producer.idempotent,
      transactionTimeout: config.kafka.producer.transactionTimeout,
    });

    // Initialize Redis
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      keyPrefix: config.redis.keyPrefix,
      maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
      retryDelayOnFailover: config.redis.retryDelayOnFailover,
      enableReadyCheck: config.redis.enableReadyCheck,
      lazyConnect: config.redis.lazyConnect,
    });

    // Initialize PostgreSQL pool
    this.pgPool = new Pool({
      host: config.database.postgres.host,
      port: config.database.postgres.port,
      user: config.database.postgres.username,
      password: config.database.postgres.password,
      database: config.database.postgres.database,
      ssl: config.database.postgres.ssl,
      max: config.database.postgres.maxConnections,
      idleTimeoutMillis: config.database.postgres.idleTimeoutMillis,
      connectionTimeoutMillis: config.database.postgres.connectionTimeoutMillis,
    });

    // Initialize streaming windows
    this.initializeStreamingWindows();
  }

  private initializeStreamingWindows(): void {
    this.realtimeWindow = new StreamingWindow(
      "realtime",
      config.analytics.aggregationIntervals.realtime,
    );
    this.minuteWindow = new StreamingWindow(
      "minute",
      config.analytics.aggregationIntervals.minute,
    );
    this.hourWindow = new StreamingWindow(
      "hour",
      config.analytics.aggregationIntervals.hour,
    );
    this.dayWindow = new StreamingWindow(
      "day",
      config.analytics.aggregationIntervals.day,
    );
  }

  public async initialize(): Promise<void> {
    try {
      logger.info("Initializing Streaming Analytics Service...");

      // Connect to MongoDB
      const mongoClient = new MongoClient(
        config.database.mongodb.uri,
        config.database.mongodb.options,
      );
      await mongoClient.connect();
      this.mongodb = mongoClient.db();

      // Connect Kafka components
      await this.producer.connect();
      await this.consumer.connect();

      // Subscribe to topics
      await this.consumer.subscribe({
        topics: [
          config.kafka.topics.transactions,
          config.kafka.topics.payments,
          config.kafka.topics.userEvents,
        ],
        fromBeginning: false,
      });

      // Start consuming messages
      await this.startMessageConsumption();

      // Initialize periodic tasks
      this.initializePeriodicTasks();

      // Setup event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      logger.info("Streaming Analytics Service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Streaming Analytics Service:", error);
      throw error;
    }
  }

  private async startMessageConsumption(): Promise<void> {
    this.isProcessing = true;

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        try {
          await this.processMessage(payload);
        } catch (error) {
          logger.error("Error processing message:", error);
          // Implement dead letter queue logic here
          await this.handleMessageError(payload, error);
        }
      },
    });
  }

  private async processMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    if (!message.value) {
      logger.warn("Received message with no value");
      return;
    }

    const messageData = JSON.parse(message.value.toString());
    const timestamp = Date.now();

    logger.debug(`Processing message from topic: ${topic}`, {
      partition,
      offset: message.offset,
      timestamp,
    });

    switch (topic) {
      case config.kafka.topics.transactions:
        await this.processTransactionEvent(
          messageData as TransactionEvent,
          timestamp,
        );
        break;

      case config.kafka.topics.payments:
        await this.processPaymentEvent(messageData as PaymentEvent, timestamp);
        break;

      case config.kafka.topics.userEvents:
        await this.processUserEvent(messageData, timestamp);
        break;

      default:
        logger.warn(`Unknown topic: ${topic}`);
    }
  }

  private async processTransactionEvent(
    event: TransactionEvent,
    timestamp: number,
  ): Promise<void> {
    try {
      // Create analytics metrics from transaction event
      const metrics: AnalyticsMetrics = {
        timestamp,
        userId: event.userId,
        transactionId: event.transactionId,
        amount: event.amount,
        currency: event.currency,
        type: event.type,
        status: event.status,
        merchantId: event.merchantId,
        category: event.category,
        location: event.location,
        metadata: event.metadata,
      };

      // Add to streaming windows
      this.realtimeWindow.addMetrics(metrics);
      this.minuteWindow.addMetrics(metrics);
      this.hourWindow.addMetrics(metrics);
      this.dayWindow.addMetrics(metrics);

      // Buffer for batch processing
      this.addToBuffer("transactions", metrics);

      // Generate real-time insights
      const insights = await this.generateRealtimeInsights(metrics);

      // Emit to connected clients
      this.io.emit("transaction_analytics", {
        metrics,
        insights,
        timestamp,
      });

      // Cache recent metrics in Redis
      await this.cacheMetrics("transaction", metrics);

      logger.debug("Transaction event processed successfully", {
        transactionId: event.transactionId,
        amount: event.amount,
        userId: event.userId,
      });
    } catch (error) {
      logger.error("Error processing transaction event:", error);
      throw error;
    }
  }

  private async processPaymentEvent(
    event: PaymentEvent,
    timestamp: number,
  ): Promise<void> {
    try {
      // Create analytics metrics from payment event
      const metrics: AnalyticsMetrics = {
        timestamp,
        userId: event.userId,
        paymentId: event.paymentId,
        amount: event.amount,
        currency: event.currency,
        type: "payment",
        status: event.status,
        paymentMethod: event.paymentMethod,
        gateway: event.gateway,
        metadata: event.metadata,
      };

      // Add to streaming windows
      this.realtimeWindow.addMetrics(metrics);
      this.minuteWindow.addMetrics(metrics);
      this.hourWindow.addMetrics(metrics);
      this.dayWindow.addMetrics(metrics);

      // Buffer for batch processing
      this.addToBuffer("payments", metrics);

      // Generate payment-specific insights
      const insights = await this.generatePaymentInsights(metrics);

      // Emit to connected clients
      this.io.emit("payment_analytics", {
        metrics,
        insights,
        timestamp,
      });

      // Cache recent metrics in Redis
      await this.cacheMetrics("payment", metrics);

      logger.debug("Payment event processed successfully", {
        paymentId: event.paymentId,
        amount: event.amount,
        userId: event.userId,
      });
    } catch (error) {
      logger.error("Error processing payment event:", error);
      throw error;
    }
  }

  private async processUserEvent(event: any, timestamp: number): Promise<void> {
    try {
      // Process user behavior events for analytics
      const userMetrics = {
        timestamp,
        userId: event.userId,
        eventType: event.eventType,
        sessionId: event.sessionId,
        metadata: event.metadata,
      };

      // Cache user activity
      await this.cacheUserActivity(userMetrics);

      // Emit user analytics
      this.io.emit("user_analytics", {
        metrics: userMetrics,
        timestamp,
      });

      logger.debug("User event processed successfully", {
        userId: event.userId,
        eventType: event.eventType,
      });
    } catch (error) {
      logger.error("Error processing user event:", error);
      throw error;
    }
  }

  private async generateRealtimeInsights(
    metrics: AnalyticsMetrics,
  ): Promise<RealtimeInsight[]> {
    const insights: RealtimeInsight[] = [];

    try {
      // Volume insights
      const recentVolume = await this.calculateRecentVolume(metrics.userId);
      if (recentVolume.isSignificant) {
        insights.push({
          type: "volume_spike",
          severity: "medium",
          message: `Transaction volume increased by ${recentVolume.percentageIncrease}% in the last hour`,
          data: recentVolume,
          timestamp: Date.now(),
        });
      }

      // Velocity insights
      const velocity = await this.calculateTransactionVelocity(metrics.userId);
      if (velocity.isHigh) {
        insights.push({
          type: "high_velocity",
          severity: "high",
          message: `High transaction velocity detected: ${velocity.transactionsPerMinute} transactions/minute`,
          data: velocity,
          timestamp: Date.now(),
        });
      }

      // Pattern insights
      const patterns = await this.detectTransactionPatterns(metrics);
      patterns.forEach((pattern) => {
        insights.push({
          type: "pattern_detection",
          severity: pattern.severity,
          message: pattern.description,
          data: pattern,
          timestamp: Date.now(),
        });
      });

      return insights;
    } catch (error) {
      logger.error("Error generating real-time insights:", error);
      return [];
    }
  }

  private async generatePaymentInsights(
    metrics: AnalyticsMetrics,
  ): Promise<RealtimeInsight[]> {
    const insights: RealtimeInsight[] = [];

    try {
      // Payment method analysis
      const methodAnalysis = await this.analyzePaymentMethod(metrics);
      if (methodAnalysis.hasInsight) {
        insights.push({
          type: "payment_method_insight",
          severity: "low",
          message: methodAnalysis.message,
          data: methodAnalysis,
          timestamp: Date.now(),
        });
      }

      // Gateway performance
      const gatewayPerformance = await this.analyzeGatewayPerformance(metrics);
      if (gatewayPerformance.hasIssue) {
        insights.push({
          type: "gateway_performance",
          severity: "medium",
          message: `Gateway ${metrics.gateway} showing performance issues`,
          data: gatewayPerformance,
          timestamp: Date.now(),
        });
      }

      return insights;
    } catch (error) {
      logger.error("Error generating payment insights:", error);
      return [];
    }
  }

  private addToBuffer(type: string, metrics: AnalyticsMetrics): void {
    if (!this.metricsBuffer.has(type)) {
      this.metricsBuffer.set(type, []);
    }

    const buffer = this.metricsBuffer.get(type)!;
    buffer.push(metrics);

    // Check if buffer needs flushing
    if (
      buffer.length >= config.analytics.batchSize ||
      Date.now() - this.lastFlushTime >= config.analytics.flushInterval
    ) {
      this.flushBuffer(type);
    }
  }

  private async flushBuffer(type: string): Promise<void> {
    const buffer = this.metricsBuffer.get(type);
    if (!buffer || buffer.length === 0) return;

    try {
      // Clear buffer first to prevent duplicate processing
      this.metricsBuffer.set(type, []);
      this.lastFlushTime = Date.now();

      // Batch insert to MongoDB
      const collection = this.mongodb.collection(`analytics_${type}`);
      await collection.insertMany(buffer);

      // Update aggregated metrics in PostgreSQL
      await this.updateAggregatedMetrics(type, buffer);

      logger.debug(`Flushed ${buffer.length} ${type} metrics to storage`);
    } catch (error) {
      logger.error(`Error flushing ${type} buffer:`, error);
      // Re-add to buffer for retry
      const currentBuffer = this.metricsBuffer.get(type) || [];
      this.metricsBuffer.set(type, [...buffer, ...currentBuffer]);
    }
  }

  private async updateAggregatedMetrics(
    type: string,
    metrics: AnalyticsMetrics[],
  ): Promise<void> {
    const client = await this.pgPool.connect();

    try {
      await client.query("BEGIN");

      for (const metric of metrics) {
        // Update hourly aggregations
        await client.query(
          `
          INSERT INTO analytics_hourly (
            hour_timestamp, user_id, transaction_count, total_amount, 
            avg_amount, currency, type, created_at
          ) VALUES (
            date_trunc('hour', to_timestamp($1::bigint / 1000)), $2, 1, $3, 
            $3, $4, $5, NOW()
          )
          ON CONFLICT (hour_timestamp, user_id, currency, type) 
          DO UPDATE SET
            transaction_count = analytics_hourly.transaction_count + 1,
            total_amount = analytics_hourly.total_amount + $3,
            avg_amount = (analytics_hourly.total_amount + $3) / (analytics_hourly.transaction_count + 1),
            updated_at = NOW()
        `,
          [
            metric.timestamp,
            metric.userId,
            metric.amount,
            metric.currency,
            metric.type,
          ],
        );

        // Update daily aggregations
        await client.query(
          `
          INSERT INTO analytics_daily (
            day_timestamp, user_id, transaction_count, total_amount, 
            avg_amount, currency, type, created_at
          ) VALUES (
            date_trunc('day', to_timestamp($1::bigint / 1000)), $2, 1, $3, 
            $3, $4, $5, NOW()
          )
          ON CONFLICT (day_timestamp, user_id, currency, type) 
          DO UPDATE SET
            transaction_count = analytics_daily.transaction_count + 1,
            total_amount = analytics_daily.total_amount + $3,
            avg_amount = (analytics_daily.total_amount + $3) / (analytics_daily.transaction_count + 1),
            updated_at = NOW()
        `,
          [
            metric.timestamp,
            metric.userId,
            metric.amount,
            metric.currency,
            metric.type,
          ],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async cacheMetrics(
    type: string,
    metrics: AnalyticsMetrics,
  ): Promise<void> {
    try {
      const key = `metrics:${type}:${metrics.userId}:${Date.now()}`;
      await this.redis.setex(key, 3600, JSON.stringify(metrics)); // Cache for 1 hour

      // Update user's recent metrics list
      const userKey = `user_metrics:${metrics.userId}`;
      await this.redis.lpush(userKey, key);
      await this.redis.ltrim(userKey, 0, 99); // Keep last 100 metrics
      await this.redis.expire(userKey, 86400); // Expire in 24 hours
    } catch (error) {
      logger.error("Error caching metrics:", error);
    }
  }

  private async cacheUserActivity(userMetrics: any): Promise<void> {
    try {
      const key = `user_activity:${userMetrics.userId}:${Date.now()}`;
      await this.redis.setex(key, 1800, JSON.stringify(userMetrics)); // Cache for 30 minutes
    } catch (error) {
      logger.error("Error caching user activity:", error);
    }
  }

  private async calculateRecentVolume(userId: string): Promise<any> {
    // Implementation for volume calculation
    const currentHourKey = `volume:${userId}:${Math.floor(Date.now() / 3600000)}`;
    const previousHourKey = `volume:${userId}:${Math.floor(Date.now() / 3600000) - 1}`;

    const currentVolume = (await this.redis.get(currentHourKey)) || "0";
    const previousVolume = (await this.redis.get(previousHourKey)) || "0";

    const current = parseFloat(currentVolume);
    const previous = parseFloat(previousVolume);

    const percentageIncrease =
      previous > 0 ? ((current - previous) / previous) * 100 : 0;

    return {
      current,
      previous,
      percentageIncrease,
      isSignificant: percentageIncrease > 50, // 50% increase threshold
    };
  }

  private async calculateTransactionVelocity(userId: string): Promise<any> {
    // Implementation for velocity calculation
    const oneMinuteAgo = Date.now() - 60000;
    const userMetricsKey = `user_metrics:${userId}`;

    const recentMetrics = await this.redis.lrange(userMetricsKey, 0, -1);
    let recentCount = 0;

    for (const metricKey of recentMetrics) {
      const metric = await this.redis.get(metricKey);
      if (metric) {
        const parsedMetric = JSON.parse(metric);
        if (parsedMetric.timestamp > oneMinuteAgo) {
          recentCount++;
        }
      }
    }

    return {
      transactionsPerMinute: recentCount,
      isHigh: recentCount > 10, // 10 transactions per minute threshold
    };
  }

  private async detectTransactionPatterns(
    metrics: AnalyticsMetrics,
  ): Promise<any[]> {
    // Implementation for pattern detection
    const patterns = [];

    // Check for round number amounts
    if (metrics.amount % 100 === 0 && metrics.amount >= 1000) {
      patterns.push({
        type: "round_amount",
        severity: "low",
        description: `Round amount transaction detected: ${metrics.amount} ${metrics.currency}`,
      });
    }

    // Check for repeated amounts
    const userMetricsKey = `user_metrics:${metrics.userId}`;
    const recentMetrics = await this.redis.lrange(userMetricsKey, 0, 9); // Last 10 transactions

    let sameAmountCount = 0;
    for (const metricKey of recentMetrics) {
      const metric = await this.redis.get(metricKey);
      if (metric) {
        const parsedMetric = JSON.parse(metric);
        if (parsedMetric.amount === metrics.amount) {
          sameAmountCount++;
        }
      }
    }

    if (sameAmountCount >= 3) {
      patterns.push({
        type: "repeated_amount",
        severity: "medium",
        description: `Repeated amount pattern detected: ${sameAmountCount} transactions of ${metrics.amount} ${metrics.currency}`,
      });
    }

    return patterns;
  }

  private async analyzePaymentMethod(metrics: AnalyticsMetrics): Promise<any> {
    // Implementation for payment method analysis
    return {
      hasInsight: false,
      message: "",
    };
  }

  private async analyzeGatewayPerformance(
    metrics: AnalyticsMetrics,
  ): Promise<any> {
    // Implementation for gateway performance analysis
    return {
      hasIssue: false,
    };
  }

  private initializePeriodicTasks(): void {
    // Flush buffers every minute
    cron.schedule("* * * * *", async () => {
      for (const [type] of this.metricsBuffer) {
        await this.flushBuffer(type);
      }
    });

    // Generate hourly reports
    cron.schedule("0 * * * *", async () => {
      await this.generateHourlyReport();
    });

    // Cleanup old data daily
    cron.schedule("0 2 * * *", async () => {
      await this.cleanupOldData();
    });
  }

  private async generateHourlyReport(): Promise<void> {
    try {
      logger.info("Generating hourly analytics report...");

      const report = await this.createHourlyReport();

      // Emit report to connected clients
      this.io.emit("hourly_report", report);

      // Store report in database
      await this.mongodb.collection("hourly_reports").insertOne(report);

      logger.info("Hourly report generated successfully");
    } catch (error) {
      logger.error("Error generating hourly report:", error);
    }
  }

  private async createHourlyReport(): Promise<any> {
    const endTime = Date.now();
    const startTime = endTime - 3600000; // 1 hour ago

    // Aggregate data from streaming windows
    const realtimeData = this.hourWindow.getAggregatedData();

    return {
      timestamp: endTime,
      period: {
        start: startTime,
        end: endTime,
      },
      metrics: realtimeData,
      summary: {
        totalTransactions: realtimeData.totalCount,
        totalVolume: realtimeData.totalAmount,
        averageAmount: realtimeData.averageAmount,
        uniqueUsers: realtimeData.uniqueUsers,
      },
    };
  }

  private async cleanupOldData(): Promise<void> {
    try {
      logger.info("Starting data cleanup...");

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - config.analytics.retentionDays);

      // Cleanup MongoDB collections
      await this.mongodb.collection("analytics_transactions").deleteMany({
        timestamp: { $lt: cutoffDate.getTime() },
      });

      await this.mongodb.collection("analytics_payments").deleteMany({
        timestamp: { $lt: cutoffDate.getTime() },
      });

      // Cleanup Redis keys
      const pattern = `${config.redis.keyPrefix}metrics:*`;
      const keys = await this.redis.keys(pattern);

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) {
          // No expiration set
          await this.redis.expire(key, 86400); // Set 24 hour expiration
        }
      }

      logger.info("Data cleanup completed");
    } catch (error) {
      logger.error("Error during data cleanup:", error);
    }
  }

  private setupEventHandlers(): void {
    this.on("error", (error) => {
      logger.error("Streaming Analytics Service error:", error);
    });

    this.redis.on("error", (error) => {
      logger.error("Redis error:", error);
    });

    this.redis.on("connect", () => {
      logger.info("Redis connected");
    });

    this.redis.on("disconnect", () => {
      logger.warn("Redis disconnected");
    });
  }

  private async handleMessageError(
    payload: EachMessagePayload,
    error: any,
  ): Promise<void> {
    logger.error("Message processing error:", {
      topic: payload.topic,
      partition: payload.partition,
      offset: payload.message.offset,
      error: error.message,
    });

    // Implement dead letter queue logic
    try {
      await this.producer.send({
        topic: `${payload.topic}.dlq`,
        messages: [
          {
            key: payload.message.key,
            value: payload.message.value,
            headers: {
              ...payload.message.headers,
              "error-message": error.message,
              "error-timestamp": Date.now().toString(),
              "original-topic": payload.topic,
            },
          },
        ],
      });
    } catch (dlqError) {
      logger.error("Failed to send message to DLQ:", dlqError);
    }
  }

  public async getRealtimeMetrics(userId?: string): Promise<any> {
    if (userId) {
      return this.realtimeWindow.getUserMetrics(userId);
    }
    return this.realtimeWindow.getAggregatedData();
  }

  public async getHistoricalData(
    startTime: number,
    endTime: number,
    userId?: string,
  ): Promise<any> {
    const query: any = {
      timestamp: {
        $gte: startTime,
        $lte: endTime,
      },
    };

    if (userId) {
      query.userId = userId;
    }

    const transactions = await this.mongodb
      .collection("analytics_transactions")
      .find(query)
      .sort({ timestamp: 1 })
      .toArray();

    const payments = await this.mongodb
      .collection("analytics_payments")
      .find(query)
      .sort({ timestamp: 1 })
      .toArray();

    return {
      transactions,
      payments,
      summary: this.calculateSummary([...transactions, ...payments]),
    };
  }

  private calculateSummary(data: any[]): any {
    return {
      totalCount: data.length,
      totalAmount: data.reduce((sum, item) => sum + item.amount, 0),
      averageAmount:
        data.length > 0
          ? data.reduce((sum, item) => sum + item.amount, 0) / data.length
          : 0,
      uniqueUsers: new Set(data.map((item) => item.userId)).size,
    };
  }

  public async cleanup(): Promise<void> {
    try {
      logger.info("Cleaning up Streaming Analytics Service...");

      this.isProcessing = false;

      // Flush remaining buffers
      for (const [type] of this.metricsBuffer) {
        await this.flushBuffer(type);
      }

      // Disconnect from services
      await this.consumer.disconnect();
      await this.producer.disconnect();
      await this.redis.disconnect();
      await this.pgPool.end();

      logger.info("Streaming Analytics Service cleanup completed");
    } catch (error) {
      logger.error("Error during cleanup:", error);
    }
  }
}

// Streaming Window class for time-based aggregations
class StreamingWindow {
  private name: string;
  private interval: number;
  private data: Map<string, AnalyticsMetrics[]> = new Map();
  private lastCleanup: number = Date.now();

  constructor(name: string, interval: number) {
    this.name = name;
    this.interval = interval;
  }

  public addMetrics(metrics: AnalyticsMetrics): void {
    const windowKey = this.getWindowKey(metrics.timestamp);

    if (!this.data.has(windowKey)) {
      this.data.set(windowKey, []);
    }

    this.data.get(windowKey)!.push(metrics);

    // Cleanup old windows periodically
    if (Date.now() - this.lastCleanup > this.interval * 10) {
      this.cleanupOldWindows();
    }
  }

  public getAggregatedData(): AggregationResult {
    const allMetrics: AnalyticsMetrics[] = [];

    for (const metrics of this.data.values()) {
      allMetrics.push(...metrics);
    }

    return this.aggregateMetrics(allMetrics);
  }

  public getUserMetrics(userId: string): AggregationResult {
    const userMetrics: AnalyticsMetrics[] = [];

    for (const metrics of this.data.values()) {
      userMetrics.push(...metrics.filter((m) => m.userId === userId));
    }

    return this.aggregateMetrics(userMetrics);
  }

  private getWindowKey(timestamp: number): string {
    const windowStart = Math.floor(timestamp / this.interval) * this.interval;
    return `${this.name}_${windowStart}`;
  }

  private aggregateMetrics(metrics: AnalyticsMetrics[]): AggregationResult {
    if (metrics.length === 0) {
      return {
        totalCount: 0,
        totalAmount: 0,
        averageAmount: 0,
        uniqueUsers: 0,
        currencies: {},
        types: {},
        timeRange: {
          start: 0,
          end: 0,
        },
      };
    }

    const totalAmount = metrics.reduce((sum, m) => sum + m.amount, 0);
    const uniqueUsers = new Set(metrics.map((m) => m.userId)).size;

    const currencies: Record<string, number> = {};
    const types: Record<string, number> = {};

    metrics.forEach((m) => {
      currencies[m.currency] = (currencies[m.currency] || 0) + m.amount;
      types[m.type] = (types[m.type] || 0) + 1;
    });

    const timestamps = metrics.map((m) => m.timestamp);

    return {
      totalCount: metrics.length,
      totalAmount,
      averageAmount: totalAmount / metrics.length,
      uniqueUsers,
      currencies,
      types,
      timeRange: {
        start: Math.min(...timestamps),
        end: Math.max(...timestamps),
      },
    };
  }

  private cleanupOldWindows(): void {
    const cutoffTime = Date.now() - this.interval * 100; // Keep last 100 windows

    for (const [key] of this.data) {
      const windowTime = parseInt(key.split("_")[1]);
      if (windowTime < cutoffTime) {
        this.data.delete(key);
      }
    }

    this.lastCleanup = Date.now();
  }
}
