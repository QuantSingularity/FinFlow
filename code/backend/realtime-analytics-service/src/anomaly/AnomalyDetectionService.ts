import { Server as SocketIOServer } from "socket.io";
import { EventEmitter } from "events";
import Redis from "ioredis";
import { Pool } from "pg";
import { MongoClient, Db, Collection } from "mongodb";
import winston from "winston";
import * as cron from "node-cron";

import { config } from "../config/config";
import { logger } from "../config/logger";
import {
  AnalyticsMetrics,
  AnomalyAlert,
  AnomalyModel,
  StatisticalThreshold,
  IsolationForestModel,
  AnomalyScore,
  RiskProfile,
} from "../types/analytics";

export class AnomalyDetectionService extends EventEmitter {
  private redis: Redis;
  private pgPool: Pool;
  private mongodb: Db;
  private io: SocketIOServer;

  private isInitialized: boolean = false;
  private models: Map<string, AnomalyModel> = new Map();

  // Statistical models
  private statisticalThresholds: Map<string, StatisticalThreshold> = new Map();
  private isolationForests: Map<string, IsolationForestModel> = new Map();

  // Data windows for analysis
  private dataWindows: Map<string, AnalyticsMetrics[]> = new Map();
  private userProfiles: Map<string, RiskProfile> = new Map();

  // Alert management
  private activeAlerts: Map<string, AnomalyAlert> = new Map();
  private alertCooldowns: Map<string, number> = new Map();

  constructor(io: SocketIOServer) {
    super();
    this.io = io;
    this.initializeComponents();
  }

  private initializeComponents(): void {
    // Initialize Redis
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      keyPrefix: config.redis.keyPrefix + "anomaly:",
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
  }

  public async initialize(): Promise<void> {
    try {
      logger.info("Initializing Anomaly Detection Service...");

      // Connect to MongoDB
      const mongoClient = new MongoClient(
        config.database.mongodb.uri,
        config.database.mongodb.options,
      );
      await mongoClient.connect();
      this.mongodb = mongoClient.db();

      // Initialize anomaly detection models
      await this.initializeModels();

      // Load existing user profiles
      await this.loadUserProfiles();

      // Setup periodic tasks
      this.initializePeriodicTasks();

      // Setup event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      logger.info("Anomaly Detection Service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Anomaly Detection Service:", error);
      throw error;
    }
  }

  private async initializeModels(): Promise<void> {
    try {
      // Initialize statistical threshold models
      await this.initializeStatisticalModels();

      // Initialize isolation forest models
      await this.initializeIsolationForestModels();

      // Load pre-trained models if available
      await this.loadPretrainedModels();

      logger.info("Anomaly detection models initialized");
    } catch (error) {
      logger.error("Error initializing anomaly detection models:", error);
      throw error;
    }
  }

  private async initializeStatisticalModels(): Promise<void> {
    const modelTypes = [
      "transaction_amount",
      "transaction_frequency",
      "payment_velocity",
      "user_behavior",
    ];

    for (const modelType of modelTypes) {
      const threshold: StatisticalThreshold = {
        modelType,
        mean: 0,
        standardDeviation: 0,
        zScoreThreshold:
          config.anomalyDetection.models.statisticalThreshold.zScoreThreshold,
        movingAverageWindow:
          config.anomalyDetection.models.statisticalThreshold
            .movingAverageWindow,
        dataPoints: [],
        lastUpdated: Date.now(),
        isCalibrated: false,
      };

      this.statisticalThresholds.set(modelType, threshold);
    }
  }

  private async initializeIsolationForestModels(): Promise<void> {
    const modelTypes = [
      "transaction_patterns",
      "payment_patterns",
      "user_patterns",
    ];

    for (const modelType of modelTypes) {
      const model: IsolationForestModel = {
        modelType,
        contamination:
          config.anomalyDetection.models.isolationForest.contamination,
        nEstimators: config.anomalyDetection.models.isolationForest.nEstimators,
        maxSamples: config.anomalyDetection.models.isolationForest.maxSamples,
        features: this.getModelFeatures(modelType),
        trainingData: [],
        isTrained: false,
        lastTrained: 0,
      };

      this.isolationForests.set(modelType, model);
    }
  }

  private getModelFeatures(modelType: string): string[] {
    switch (modelType) {
      case "transaction_patterns":
        return [
          "amount",
          "hour_of_day",
          "day_of_week",
          "merchant_category",
          "location_distance",
        ];
      case "payment_patterns":
        return [
          "amount",
          "payment_method",
          "gateway",
          "processing_time",
          "retry_count",
        ];
      case "user_patterns":
        return [
          "session_duration",
          "page_views",
          "transaction_count",
          "login_frequency",
        ];
      default:
        return [];
    }
  }

  private async loadPretrainedModels(): Promise<void> {
    try {
      // Load models from database or file system
      const modelsCollection = this.mongodb.collection("anomaly_models");
      const savedModels = await modelsCollection.find({}).toArray();

      for (const savedModel of savedModels) {
        if (savedModel.type === "statistical") {
          this.statisticalThresholds.set(savedModel.modelType, savedModel.data);
        } else if (savedModel.type === "isolation_forest") {
          this.isolationForests.set(savedModel.modelType, savedModel.data);
        }
      }

      logger.info(`Loaded ${savedModels.length} pre-trained models`);
    } catch (error) {
      logger.warn("No pre-trained models found, starting with fresh models");
    }
  }

  private async loadUserProfiles(): Promise<void> {
    try {
      const profilesCollection = this.mongodb.collection("user_risk_profiles");
      const profiles = await profilesCollection.find({}).toArray();

      for (const profile of profiles) {
        this.userProfiles.set(profile.userId, profile);
      }

      logger.info(`Loaded ${profiles.size} user risk profiles`);
    } catch (error) {
      logger.warn("No user profiles found, starting fresh");
    }
  }

  public async analyzeTransaction(
    metrics: AnalyticsMetrics,
  ): Promise<AnomalyScore[]> {
    if (!this.isInitialized) {
      throw new Error("Anomaly Detection Service not initialized");
    }

    const anomalyScores: AnomalyScore[] = [];

    try {
      // Add to data window for analysis
      this.addToDataWindow(metrics);

      // Update user profile
      await this.updateUserProfile(metrics);

      // Run different anomaly detection algorithms
      const amountAnomaly = await this.detectAmountAnomaly(metrics);
      if (amountAnomaly) anomalyScores.push(amountAnomaly);

      const frequencyAnomaly = await this.detectFrequencyAnomaly(metrics);
      if (frequencyAnomaly) anomalyScores.push(frequencyAnomaly);

      const patternAnomaly = await this.detectPatternAnomaly(metrics);
      if (patternAnomaly) anomalyScores.push(patternAnomaly);

      const velocityAnomaly = await this.detectVelocityAnomaly(metrics);
      if (velocityAnomaly) anomalyScores.push(velocityAnomaly);

      const behaviorAnomaly = await this.detectBehaviorAnomaly(metrics);
      if (behaviorAnomaly) anomalyScores.push(behaviorAnomaly);

      // Generate alerts for high-risk anomalies
      await this.processAnomalyScores(metrics, anomalyScores);

      return anomalyScores;
    } catch (error) {
      logger.error("Error analyzing transaction for anomalies:", error);
      return [];
    }
  }

  private addToDataWindow(metrics: AnalyticsMetrics): void {
    const windowKey = `${metrics.userId}_${metrics.type}`;

    if (!this.dataWindows.has(windowKey)) {
      this.dataWindows.set(windowKey, []);
    }

    const window = this.dataWindows.get(windowKey)!;
    window.push(metrics);

    // Keep only recent data points
    const maxWindowSize = config.anomalyDetection.windowSize;
    if (window.length > maxWindowSize) {
      window.splice(0, window.length - maxWindowSize);
    }
  }

  private async updateUserProfile(metrics: AnalyticsMetrics): Promise<void> {
    let profile = this.userProfiles.get(metrics.userId);

    if (!profile) {
      profile = {
        userId: metrics.userId,
        riskScore: 0.5, // Neutral risk
        transactionHistory: {
          totalTransactions: 0,
          totalAmount: 0,
          averageAmount: 0,
          currencies: new Set(),
          merchants: new Set(),
          locations: new Set(),
        },
        behaviorPatterns: {
          preferredHours: new Map(),
          preferredDays: new Map(),
          averageSessionDuration: 0,
          loginFrequency: 0,
        },
        anomalyHistory: [],
        lastUpdated: Date.now(),
        createdAt: Date.now(),
      };

      this.userProfiles.set(metrics.userId, profile);
    }

    // Update transaction history
    profile.transactionHistory.totalTransactions++;
    profile.transactionHistory.totalAmount += metrics.amount;
    profile.transactionHistory.averageAmount =
      profile.transactionHistory.totalAmount /
      profile.transactionHistory.totalTransactions;

    profile.transactionHistory.currencies.add(metrics.currency);

    if (metrics.merchantId) {
      profile.transactionHistory.merchants.add(metrics.merchantId);
    }

    if (metrics.location) {
      profile.transactionHistory.locations.add(
        JSON.stringify(metrics.location),
      );
    }

    // Update behavior patterns
    const hour = new Date(metrics.timestamp).getHours();
    const day = new Date(metrics.timestamp).getDay();

    profile.behaviorPatterns.preferredHours.set(
      hour,
      (profile.behaviorPatterns.preferredHours.get(hour) || 0) + 1,
    );

    profile.behaviorPatterns.preferredDays.set(
      day,
      (profile.behaviorPatterns.preferredDays.get(day) || 0) + 1,
    );

    profile.lastUpdated = Date.now();

    // Cache updated profile
    await this.cacheUserProfile(profile);
  }

  private async cacheUserProfile(profile: RiskProfile): Promise<void> {
    try {
      const key = `profile:${profile.userId}`;
      await this.redis.setex(key, 3600, JSON.stringify(profile)); // Cache for 1 hour
    } catch (error) {
      logger.error("Error caching user profile:", error);
    }
  }

  private async detectAmountAnomaly(
    metrics: AnalyticsMetrics,
  ): Promise<AnomalyScore | null> {
    const model = this.statisticalThresholds.get("transaction_amount");
    if (!model || !model.isCalibrated) {
      return null;
    }

    const zScore = Math.abs(
      (metrics.amount - model.mean) / model.standardDeviation,
    );

    if (zScore > model.zScoreThreshold) {
      return {
        type: "amount_anomaly",
        score: Math.min(zScore / model.zScoreThreshold, 1.0),
        severity: this.calculateSeverity(zScore / model.zScoreThreshold),
        description: `Transaction amount ${metrics.amount} is ${zScore.toFixed(2)} standard deviations from normal`,
        features: {
          amount: metrics.amount,
          mean: model.mean,
          standardDeviation: model.standardDeviation,
          zScore,
        },
        timestamp: Date.now(),
        confidence: Math.min((zScore / model.zScoreThreshold) * 0.8, 0.95),
      };
    }

    return null;
  }

  private async detectFrequencyAnomaly(
    metrics: AnalyticsMetrics,
  ): Promise<AnomalyScore | null> {
    const windowKey = `${metrics.userId}_${metrics.type}`;
    const window = this.dataWindows.get(windowKey) || [];

    if (window.length < config.anomalyDetection.minDataPoints) {
      return null;
    }

    // Calculate transaction frequency in the last hour
    const oneHourAgo = Date.now() - 3600000;
    const recentTransactions = window.filter((t) => t.timestamp > oneHourAgo);
    const frequency = recentTransactions.length;

    // Get user's historical frequency pattern
    const profile = this.userProfiles.get(metrics.userId);
    if (!profile) return null;

    const averageHourlyFrequency =
      profile.transactionHistory.totalTransactions /
      Math.max(1, Math.floor((Date.now() - profile.createdAt) / 3600000));

    const frequencyRatio = frequency / Math.max(1, averageHourlyFrequency);

    if (frequencyRatio > 3.0) {
      // 3x normal frequency
      return {
        type: "frequency_anomaly",
        score: Math.min(frequencyRatio / 3.0, 1.0),
        severity: this.calculateSeverity(frequencyRatio / 3.0),
        description: `Transaction frequency ${frequency}/hour is ${frequencyRatio.toFixed(2)}x higher than normal`,
        features: {
          currentFrequency: frequency,
          averageFrequency: averageHourlyFrequency,
          ratio: frequencyRatio,
        },
        timestamp: Date.now(),
        confidence: Math.min((frequencyRatio / 3.0) * 0.7, 0.9),
      };
    }

    return null;
  }

  private async detectPatternAnomaly(
    metrics: AnalyticsMetrics,
  ): Promise<AnomalyScore | null> {
    const model = this.isolationForests.get("transaction_patterns");
    if (!model || !model.isTrained) {
      return null;
    }

    // Extract features for pattern analysis
    const features = this.extractPatternFeatures(metrics);

    // Simulate isolation forest scoring (in real implementation, use actual ML library)
    const anomalyScore = await this.calculateIsolationScore(features, model);

    if (anomalyScore > config.anomalyDetection.alertThreshold) {
      return {
        type: "pattern_anomaly",
        score: anomalyScore,
        severity: this.calculateSeverity(anomalyScore),
        description: `Unusual transaction pattern detected`,
        features,
        timestamp: Date.now(),
        confidence: anomalyScore * 0.85,
      };
    }

    return null;
  }

  private async detectVelocityAnomaly(
    metrics: AnalyticsMetrics,
  ): Promise<AnomalyScore | null> {
    const windowKey = `${metrics.userId}_velocity`;
    const window = this.dataWindows.get(windowKey) || [];

    if (window.length < 2) return null;

    // Calculate velocity metrics
    const recentTransactions = window.slice(-10); // Last 10 transactions
    const timeSpans = [];
    const amounts = [];

    for (let i = 1; i < recentTransactions.length; i++) {
      const timeDiff =
        recentTransactions[i].timestamp - recentTransactions[i - 1].timestamp;
      timeSpans.push(timeDiff);
      amounts.push(recentTransactions[i].amount);
    }

    const averageTimeSpan =
      timeSpans.reduce((a, b) => a + b, 0) / timeSpans.length;
    const totalAmount = amounts.reduce((a, b) => a + b, 0);
    const velocity = totalAmount / (averageTimeSpan / 1000); // Amount per second

    // Compare with user's historical velocity
    const profile = this.userProfiles.get(metrics.userId);
    if (!profile) return null;

    const historicalVelocity = profile.transactionHistory.averageAmount / 3600; // Rough estimate
    const velocityRatio = velocity / Math.max(1, historicalVelocity);

    if (velocityRatio > 5.0) {
      // 5x normal velocity
      return {
        type: "velocity_anomaly",
        score: Math.min(velocityRatio / 5.0, 1.0),
        severity: this.calculateSeverity(velocityRatio / 5.0),
        description: `Transaction velocity ${velocity.toFixed(2)}/sec is ${velocityRatio.toFixed(2)}x higher than normal`,
        features: {
          currentVelocity: velocity,
          historicalVelocity,
          ratio: velocityRatio,
          recentTransactionCount: recentTransactions.length,
        },
        timestamp: Date.now(),
        confidence: Math.min((velocityRatio / 5.0) * 0.75, 0.9),
      };
    }

    return null;
  }

  private async detectBehaviorAnomaly(
    metrics: AnalyticsMetrics,
  ): Promise<AnomalyScore | null> {
    const profile = this.userProfiles.get(metrics.userId);
    if (!profile) return null;

    const anomalies = [];

    // Check time-based behavior
    const hour = new Date(metrics.timestamp).getHours();
    const day = new Date(metrics.timestamp).getDay();

    const hourFrequency =
      profile.behaviorPatterns.preferredHours.get(hour) || 0;
    const dayFrequency = profile.behaviorPatterns.preferredDays.get(day) || 0;

    const totalTransactions = profile.transactionHistory.totalTransactions;
    const hourProbability = hourFrequency / totalTransactions;
    const dayProbability = dayFrequency / totalTransactions;

    // Unusual time anomaly
    if (hourProbability < 0.05 && totalTransactions > 50) {
      // Less than 5% of transactions at this hour
      anomalies.push({
        type: "unusual_time",
        score: 1 - hourProbability * 20, // Scale to 0-1
        reason: `Transaction at unusual hour: ${hour}:00`,
      });
    }

    // Location anomaly (if location data available)
    if (metrics.location && profile.transactionHistory.locations.size > 5) {
      const locationKey = JSON.stringify(metrics.location);
      const isNewLocation =
        !profile.transactionHistory.locations.has(locationKey);

      if (isNewLocation) {
        anomalies.push({
          type: "new_location",
          score: 0.7,
          reason: "Transaction from new location",
        });
      }
    }

    // Merchant anomaly
    if (metrics.merchantId && profile.transactionHistory.merchants.size > 10) {
      const isNewMerchant = !profile.transactionHistory.merchants.has(
        metrics.merchantId,
      );

      if (isNewMerchant) {
        anomalies.push({
          type: "new_merchant",
          score: 0.5,
          reason: "Transaction with new merchant",
        });
      }
    }

    if (anomalies.length > 0) {
      const maxAnomaly = anomalies.reduce((max, current) =>
        current.score > max.score ? current : max,
      );

      return {
        type: "behavior_anomaly",
        score: maxAnomaly.score,
        severity: this.calculateSeverity(maxAnomaly.score),
        description: `Behavioral anomaly: ${maxAnomaly.reason}`,
        features: {
          anomalies,
          hourProbability,
          dayProbability,
          isNewLocation: anomalies.some((a) => a.type === "new_location"),
          isNewMerchant: anomalies.some((a) => a.type === "new_merchant"),
        },
        timestamp: Date.now(),
        confidence: maxAnomaly.score * 0.8,
      };
    }

    return null;
  }

  private extractPatternFeatures(
    metrics: AnalyticsMetrics,
  ): Record<string, number> {
    const date = new Date(metrics.timestamp);

    return {
      amount: metrics.amount,
      hour_of_day: date.getHours(),
      day_of_week: date.getDay(),
      merchant_category: this.hashString(metrics.category || "unknown") % 100,
      location_distance: this.calculateLocationDistance(metrics.location),
      amount_rounded: metrics.amount % 1 === 0 ? 1 : 0, // Is round number
      weekend: date.getDay() === 0 || date.getDay() === 6 ? 1 : 0,
    };
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private calculateLocationDistance(location: any): number {
    if (!location || !location.latitude || !location.longitude) {
      return 0;
    }

    // Calculate distance from user's typical location (simplified)
    // In real implementation, use user's location history
    const typicalLat = 40.7128; // Example: NYC
    const typicalLng = -74.006;

    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(location.latitude - typicalLat);
    const dLng = this.toRadians(location.longitude - typicalLng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(typicalLat)) *
        Math.cos(this.toRadians(location.latitude)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private async calculateIsolationScore(
    features: Record<string, number>,
    model: IsolationForestModel,
  ): Promise<number> {
    // Simplified isolation forest scoring
    // In real implementation, use actual ML library like scikit-learn via Python bridge

    const featureValues = Object.values(features);
    const mean =
      featureValues.reduce((a, b) => a + b, 0) / featureValues.length;
    const variance =
      featureValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
      featureValues.length;

    // Simulate anomaly score based on feature variance
    const normalizedVariance = Math.min(variance / 1000, 1); // Normalize to 0-1

    return normalizedVariance;
  }

  private calculateSeverity(
    score: number,
  ): "low" | "medium" | "high" | "critical" {
    if (score >= 0.9) return "critical";
    if (score >= 0.7) return "high";
    if (score >= 0.5) return "medium";
    return "low";
  }

  private async processAnomalyScores(
    metrics: AnalyticsMetrics,
    scores: AnomalyScore[],
  ): Promise<void> {
    for (const score of scores) {
      if (score.score >= config.anomalyDetection.alertThreshold) {
        await this.generateAlert(metrics, score);
      }
    }

    // Update user risk score
    await this.updateUserRiskScore(metrics.userId, scores);
  }

  private async generateAlert(
    metrics: AnalyticsMetrics,
    anomalyScore: AnomalyScore,
  ): Promise<void> {
    const alertId = `${metrics.userId}_${anomalyScore.type}_${Date.now()}`;

    // Check cooldown to prevent alert spam
    const cooldownKey = `${metrics.userId}_${anomalyScore.type}`;
    const lastAlert = this.alertCooldowns.get(cooldownKey) || 0;
    const cooldownPeriod = 300000; // 5 minutes

    if (Date.now() - lastAlert < cooldownPeriod) {
      return; // Skip alert due to cooldown
    }

    const alert: AnomalyAlert = {
      id: alertId,
      userId: metrics.userId,
      transactionId: metrics.transactionId || metrics.paymentId,
      anomalyType: anomalyScore.type,
      severity: anomalyScore.severity,
      score: anomalyScore.score,
      confidence: anomalyScore.confidence,
      description: anomalyScore.description,
      features: anomalyScore.features,
      timestamp: Date.now(),
      status: "active",
      investigationRequired:
        anomalyScore.severity === "high" ||
        anomalyScore.severity === "critical",
      metadata: {
        originalMetrics: metrics,
        detectionModel: anomalyScore.type,
        alertGenerated: Date.now(),
      },
    };

    // Store alert
    this.activeAlerts.set(alertId, alert);
    await this.storeAlert(alert);

    // Set cooldown
    this.alertCooldowns.set(cooldownKey, Date.now());

    // Emit alert to connected clients
    this.io.emit("anomaly_alert", alert);

    // Send to external alerting systems
    await this.sendExternalAlert(alert);

    logger.warn("Anomaly alert generated", {
      alertId,
      userId: metrics.userId,
      type: anomalyScore.type,
      severity: anomalyScore.severity,
      score: anomalyScore.score,
    });
  }

  private async storeAlert(alert: AnomalyAlert): Promise<void> {
    try {
      // Store in MongoDB
      await this.mongodb.collection("anomaly_alerts").insertOne(alert);

      // Cache in Redis for quick access
      await this.redis.setex(`alert:${alert.id}`, 86400, JSON.stringify(alert)); // 24 hours

      // Add to user's alert list
      await this.redis.lpush(`user_alerts:${alert.userId}`, alert.id);
      await this.redis.ltrim(`user_alerts:${alert.userId}`, 0, 99); // Keep last 100 alerts
    } catch (error) {
      logger.error("Error storing anomaly alert:", error);
    }
  }

  private async sendExternalAlert(alert: AnomalyAlert): Promise<void> {
    try {
      if (config.monitoring.alerting.enabled) {
        // Send to webhook if configured
        if (config.monitoring.alerting.webhookUrl) {
          // Implementation for webhook notification
          logger.info(`Would send alert to webhook: ${alert.id}`);
        }

        // Send to Slack if configured
        if (config.monitoring.alerting.slackToken) {
          // Implementation for Slack notification
          logger.info(`Would send alert to Slack: ${alert.id}`);
        }
      }
    } catch (error) {
      logger.error("Error sending external alert:", error);
    }
  }

  private async updateUserRiskScore(
    userId: string,
    scores: AnomalyScore[],
  ): Promise<void> {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;

    // Calculate new risk score based on recent anomalies
    const recentAnomalies = scores.filter((s) => s.score >= 0.5);

    if (recentAnomalies.length > 0) {
      const maxScore = Math.max(...recentAnomalies.map((s) => s.score));
      const avgScore =
        recentAnomalies.reduce((sum, s) => sum + s.score, 0) /
        recentAnomalies.length;

      // Weighted combination of current risk and new anomalies
      const newRiskScore =
        profile.riskScore * 0.7 + maxScore * 0.2 + avgScore * 0.1;
      profile.riskScore = Math.min(newRiskScore, 1.0);

      // Add to anomaly history
      profile.anomalyHistory.push({
        timestamp: Date.now(),
        scores: recentAnomalies,
        riskScore: profile.riskScore,
      });

      // Keep only recent history
      if (profile.anomalyHistory.length > 100) {
        profile.anomalyHistory = profile.anomalyHistory.slice(-100);
      }

      profile.lastUpdated = Date.now();

      // Cache updated profile
      await this.cacheUserProfile(profile);
    }
  }

  private initializePeriodicTasks(): void {
    // Retrain models daily
    cron.schedule("0 2 * * *", async () => {
      await this.retrainModels();
    });

    // Update statistical thresholds hourly
    cron.schedule("0 * * * *", async () => {
      await this.updateStatisticalThresholds();
    });

    // Cleanup old alerts daily
    cron.schedule("0 3 * * *", async () => {
      await this.cleanupOldAlerts();
    });

    // Save user profiles every 6 hours
    cron.schedule("0 */6 * * *", async () => {
      await this.saveUserProfiles();
    });
  }

  private async retrainModels(): Promise<void> {
    try {
      logger.info("Starting model retraining...");

      // Retrain isolation forest models
      for (const [modelType, model] of this.isolationForests) {
        await this.retrainIsolationForest(modelType, model);
      }

      // Save updated models
      await this.saveModels();

      logger.info("Model retraining completed");
    } catch (error) {
      logger.error("Error during model retraining:", error);
    }
  }

  private async retrainIsolationForest(
    modelType: string,
    model: IsolationForestModel,
  ): Promise<void> {
    try {
      // Get training data from the last 30 days
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

      const trainingData = await this.mongodb
        .collection("analytics_transactions")
        .find({ timestamp: { $gte: thirtyDaysAgo } })
        .limit(10000) // Limit training data size
        .toArray();

      if (trainingData.length < 1000) {
        logger.warn(
          `Insufficient training data for ${modelType}: ${trainingData.length} samples`,
        );
        return;
      }

      // Extract features from training data
      const features = trainingData.map((data) =>
        this.extractPatternFeatures(data),
      );

      // Update model (in real implementation, use actual ML library)
      model.trainingData = features;
      model.isTrained = true;
      model.lastTrained = Date.now();

      logger.info(
        `Retrained ${modelType} model with ${features.length} samples`,
      );
    } catch (error) {
      logger.error(`Error retraining ${modelType} model:`, error);
    }
  }

  private async updateStatisticalThresholds(): Promise<void> {
    try {
      for (const [modelType, threshold] of this.statisticalThresholds) {
        await this.updateThreshold(modelType, threshold);
      }

      logger.info("Statistical thresholds updated");
    } catch (error) {
      logger.error("Error updating statistical thresholds:", error);
    }
  }

  private async updateThreshold(
    modelType: string,
    threshold: StatisticalThreshold,
  ): Promise<void> {
    try {
      // Get recent data for threshold calculation
      const recentData = await this.getRecentDataForModel(modelType);

      if (recentData.length < config.anomalyDetection.minDataPoints) {
        return;
      }

      // Calculate new statistics
      const values = recentData.map((d) =>
        this.extractValueForModel(modelType, d),
      );
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance =
        values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      const standardDeviation = Math.sqrt(variance);

      // Update threshold
      threshold.mean = mean;
      threshold.standardDeviation = standardDeviation;
      threshold.dataPoints = values.slice(-threshold.movingAverageWindow);
      threshold.lastUpdated = Date.now();
      threshold.isCalibrated = true;

      logger.debug(
        `Updated ${modelType} threshold: mean=${mean.toFixed(2)}, std=${standardDeviation.toFixed(2)}`,
      );
    } catch (error) {
      logger.error(`Error updating ${modelType} threshold:`, error);
    }
  }

  private async getRecentDataForModel(modelType: string): Promise<any[]> {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return await this.mongodb
      .collection("analytics_transactions")
      .find({ timestamp: { $gte: oneWeekAgo } })
      .limit(5000)
      .toArray();
  }

  private extractValueForModel(modelType: string, data: any): number {
    switch (modelType) {
      case "transaction_amount":
        return data.amount || 0;
      case "transaction_frequency":
        return 1; // Each transaction counts as 1
      case "payment_velocity":
        return data.amount || 0;
      case "user_behavior":
        return new Date(data.timestamp).getHours();
      default:
        return 0;
    }
  }

  private async cleanupOldAlerts(): Promise<void> {
    try {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

      // Remove old alerts from MongoDB
      const result = await this.mongodb
        .collection("anomaly_alerts")
        .deleteMany({ timestamp: { $lt: thirtyDaysAgo } });

      // Cleanup Redis keys
      const alertKeys = await this.redis.keys("alert:*");
      for (const key of alertKeys) {
        const alert = await this.redis.get(key);
        if (alert) {
          const parsedAlert = JSON.parse(alert);
          if (parsedAlert.timestamp < thirtyDaysAgo) {
            await this.redis.del(key);
          }
        }
      }

      logger.info(`Cleaned up ${result.deletedCount} old alerts`);
    } catch (error) {
      logger.error("Error cleaning up old alerts:", error);
    }
  }

  private async saveUserProfiles(): Promise<void> {
    try {
      const profilesCollection = this.mongodb.collection("user_risk_profiles");

      for (const [userId, profile] of this.userProfiles) {
        await profilesCollection.replaceOne({ userId }, profile, {
          upsert: true,
        });
      }

      logger.info(`Saved ${this.userProfiles.size} user profiles`);
    } catch (error) {
      logger.error("Error saving user profiles:", error);
    }
  }

  private async saveModels(): Promise<void> {
    try {
      const modelsCollection = this.mongodb.collection("anomaly_models");

      // Save statistical models
      for (const [modelType, threshold] of this.statisticalThresholds) {
        await modelsCollection.replaceOne(
          { modelType, type: "statistical" },
          { modelType, type: "statistical", data: threshold },
          { upsert: true },
        );
      }

      // Save isolation forest models
      for (const [modelType, model] of this.isolationForests) {
        await modelsCollection.replaceOne(
          { modelType, type: "isolation_forest" },
          { modelType, type: "isolation_forest", data: model },
          { upsert: true },
        );
      }

      logger.info("Anomaly detection models saved");
    } catch (error) {
      logger.error("Error saving models:", error);
    }
  }

  private setupEventHandlers(): void {
    this.on("error", (error) => {
      logger.error("Anomaly Detection Service error:", error);
    });

    this.redis.on("error", (error) => {
      logger.error("Redis error in anomaly detection:", error);
    });
  }

  public async getActiveAlerts(userId?: string): Promise<AnomalyAlert[]> {
    try {
      const query: any = { status: "active" };
      if (userId) {
        query.userId = userId;
      }

      const alerts = await this.mongodb
        .collection("anomaly_alerts")
        .find(query)
        .sort({ timestamp: -1 })
        .limit(100)
        .toArray();

      return alerts;
    } catch (error) {
      logger.error("Error getting active alerts:", error);
      return [];
    }
  }

  public async getUserRiskProfile(userId: string): Promise<RiskProfile | null> {
    return this.userProfiles.get(userId) || null;
  }

  public async updateAlertStatus(
    alertId: string,
    status: string,
  ): Promise<boolean> {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (alert) {
        alert.status = status;
        await this.mongodb
          .collection("anomaly_alerts")
          .updateOne({ id: alertId }, { $set: { status } });

        if (status !== "active") {
          this.activeAlerts.delete(alertId);
        }

        return true;
      }

      return false;
    } catch (error) {
      logger.error("Error updating alert status:", error);
      return false;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      logger.info("Cleaning up Anomaly Detection Service...");

      // Save current state
      await this.saveUserProfiles();
      await this.saveModels();

      // Disconnect from services
      await this.redis.disconnect();
      await this.pgPool.end();

      logger.info("Anomaly Detection Service cleanup completed");
    } catch (error) {
      logger.error("Error during cleanup:", error);
    }
  }
}
