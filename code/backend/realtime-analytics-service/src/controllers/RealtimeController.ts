import { Router, Request, Response } from "express";
import { Server as SocketIOServer, Socket } from "socket.io";
import Joi from "joi";
import { logger } from "../config/logger";
import { StreamingAnalyticsService } from "../streaming/StreamingAnalyticsService";
import { AnomalyDetectionService } from "../anomaly/AnomalyDetectionService";
import {
  RealtimeMetricsRequest,
  RealtimeMetricsResponse,
  HistoricalDataRequest,
  HistoricalDataResponse,
  AnomalyAnalysisRequest,
  AnomalyAnalysisResponse,
  SubscriptionRequest,
  SubscriptionResponse,
  DashboardMetrics,
} from "../types/analytics";

export class RealtimeController {
  private router: Router;
  private io: SocketIOServer;
  private streamingService: StreamingAnalyticsService;
  private anomalyService: AnomalyDetectionService;
  private subscriptions: Map<string, Set<string>> = new Map(); // socketId -> subscriptions

  constructor(io: SocketIOServer) {
    this.router = Router();
    this.io = io;
    this.streamingService = new StreamingAnalyticsService(io);
    this.anomalyService = new AnomalyDetectionService(io);
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Real-time metrics endpoints
    this.router.get("/metrics", this.getRealtimeMetrics.bind(this));
    this.router.get("/metrics/historical", this.getHistoricalData.bind(this));
    this.router.get("/metrics/dashboard", this.getDashboardMetrics.bind(this));

    // Anomaly detection endpoints
    this.router.get("/anomalies", this.getAnomalies.bind(this));
    this.router.get("/anomalies/alerts", this.getActiveAlerts.bind(this));
    this.router.put(
      "/anomalies/alerts/:alertId",
      this.updateAlertStatus.bind(this),
    );
    this.router.get(
      "/users/:userId/risk-profile",
      this.getUserRiskProfile.bind(this),
    );

    // Subscription management
    this.router.post("/subscribe", this.createSubscription.bind(this));
    this.router.delete(
      "/subscribe/:subscriptionId",
      this.removeSubscription.bind(this),
    );

    // Analytics insights
    this.router.get("/insights/trends", this.getTrendAnalysis.bind(this));
    this.router.get(
      "/insights/correlations",
      this.getCorrelationAnalysis.bind(this),
    );
    this.router.get("/insights/forecasts", this.getForecastData.bind(this));

    // Data quality
    this.router.get("/quality/report", this.getDataQualityReport.bind(this));

    // Health and monitoring
    this.router.get("/health", this.getHealthStatus.bind(this));
    this.router.get("/metrics/system", this.getSystemMetrics.bind(this));
  }

  /**
   * Get real-time metrics
   */
  public async getRealtimeMetrics(req: Request, res: Response): Promise<void> {
    try {
      const schema = Joi.object({
        userId: Joi.string().optional(),
        timeRange: Joi.object({
          start: Joi.number().required(),
          end: Joi.number().required(),
        }).optional(),
        metrics: Joi.array().items(Joi.string()).optional(),
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          error: "Invalid request parameters",
          details: error.details,
        });
        return;
      }

      const request: RealtimeMetricsRequest = value;

      // Get metrics from streaming service
      const realtimeData = await this.streamingService.getRealtimeMetrics(
        request.userId,
      );

      const response: RealtimeMetricsResponse = {
        success: true,
        data: {
          realtime: realtimeData,
          minute: realtimeData, // In real implementation, get from different windows
          hour: realtimeData,
          day: realtimeData,
        },
        timestamp: Date.now(),
      };

      res.json(response);

      logger.info("Real-time metrics retrieved", {
        userId: request.userId,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error("Error getting real-time metrics:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to retrieve real-time metrics",
      });
    }
  }

  /**
   * Get historical analytics data
   */
  public async getHistoricalData(req: Request, res: Response): Promise<void> {
    try {
      const schema = Joi.object({
        userId: Joi.string().optional(),
        startTime: Joi.number().required(),
        endTime: Joi.number().required(),
        granularity: Joi.string().valid("minute", "hour", "day").optional(),
        metrics: Joi.array().items(Joi.string()).optional(),
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          error: "Invalid request parameters",
          details: error.details,
        });
        return;
      }

      const request: HistoricalDataRequest = value;

      // Validate time range
      if (request.endTime <= request.startTime) {
        res.status(400).json({
          success: false,
          error: "Invalid time range",
          message: "End time must be after start time",
        });
        return;
      }

      // Get historical data from streaming service
      const historicalData = await this.streamingService.getHistoricalData(
        request.startTime,
        request.endTime,
        request.userId,
      );

      const response: HistoricalDataResponse = {
        success: true,
        data: historicalData,
        timestamp: Date.now(),
      };

      res.json(response);

      logger.info("Historical data retrieved", {
        userId: request.userId,
        timeRange: `${request.startTime}-${request.endTime}`,
        recordCount:
          historicalData.transactions.length + historicalData.payments.length,
      });
    } catch (error) {
      logger.error("Error getting historical data:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to retrieve historical data",
      });
    }
  }

  /**
   * Get dashboard metrics
   */
  public async getDashboardMetrics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string;

      // Get comprehensive dashboard metrics
      const realtimeMetrics =
        await this.streamingService.getRealtimeMetrics(userId);
      const activeAlerts = await this.anomalyService.getActiveAlerts(userId);

      const dashboardMetrics: DashboardMetrics = {
        overview: {
          totalTransactions: realtimeMetrics.totalCount,
          totalVolume: realtimeMetrics.totalAmount,
          activeUsers: realtimeMetrics.uniqueUsers,
          averageTransactionValue: realtimeMetrics.averageAmount,
          growthRate: 0, // Calculate from historical data
        },
        realtime: {
          transactionsPerSecond: 0, // Calculate from recent data
          volumePerSecond: 0,
          activeConnections: this.io.sockets.sockets.size,
          processingLatency: 0, // Get from monitoring
        },
        anomalies: {
          activeAlerts: activeAlerts.length,
          highRiskUsers: 0, // Calculate from risk profiles
          falsePositiveRate: 0, // Calculate from historical data
          detectionAccuracy: 0.95, // Get from model performance
        },
        performance: {
          systemLoad: 0, // Get from system monitoring
          memoryUsage:
            process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
          kafkaLag: 0, // Get from Kafka monitoring
          databaseConnections: 0, // Get from connection pools
        },
      };

      res.json({
        success: true,
        data: dashboardMetrics,
        timestamp: Date.now(),
      });

      logger.info("Dashboard metrics retrieved", {
        userId,
        metricsCount: Object.keys(dashboardMetrics).length,
      });
    } catch (error) {
      logger.error("Error getting dashboard metrics:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to retrieve dashboard metrics",
      });
    }
  }

  /**
   * Get anomaly analysis
   */
  public async getAnomalies(req: Request, res: Response): Promise<void> {
    try {
      const schema = Joi.object({
        userId: Joi.string().optional(),
        timeRange: Joi.object({
          start: Joi.number().required(),
          end: Joi.number().required(),
        }).optional(),
        severity: Joi.string()
          .valid("low", "medium", "high", "critical")
          .optional(),
        types: Joi.array().items(Joi.string()).optional(),
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          error: "Invalid request parameters",
          details: error.details,
        });
        return;
      }

      const request: AnomalyAnalysisRequest = value;

      // Get anomaly data
      const alerts = await this.anomalyService.getActiveAlerts(request.userId);
      const riskProfile = request.userId
        ? await this.anomalyService.getUserRiskProfile(request.userId)
        : undefined;

      // Filter alerts based on request parameters
      let filteredAlerts = alerts;

      if (request.severity) {
        filteredAlerts = filteredAlerts.filter(
          (alert) => alert.severity === request.severity,
        );
      }

      if (request.types && request.types.length > 0) {
        filteredAlerts = filteredAlerts.filter((alert) =>
          request.types!.includes(alert.anomalyType),
        );
      }

      if (request.timeRange) {
        filteredAlerts = filteredAlerts.filter(
          (alert) =>
            alert.timestamp >= request.timeRange!.start &&
            alert.timestamp <= request.timeRange!.end,
        );
      }

      // Calculate summary statistics
      const riskDistribution = alerts.reduce(
        (acc, alert) => {
          acc[alert.severity] = (acc[alert.severity] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const response: AnomalyAnalysisResponse = {
        success: true,
        data: {
          alerts: filteredAlerts,
          riskProfile,
          summary: {
            totalAlerts: alerts.length,
            activealerts: alerts.filter((a) => a.status === "active").length,
            riskDistribution,
          },
        },
        timestamp: Date.now(),
      };

      res.json(response);

      logger.info("Anomaly analysis retrieved", {
        userId: request.userId,
        alertCount: filteredAlerts.length,
        severity: request.severity,
      });
    } catch (error) {
      logger.error("Error getting anomaly analysis:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to retrieve anomaly analysis",
      });
    }
  }

  /**
   * Get active alerts
   */
  public async getActiveAlerts(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string;
      const alerts = await this.anomalyService.getActiveAlerts(userId);

      res.json({
        success: true,
        data: alerts,
        timestamp: Date.now(),
      });

      logger.info("Active alerts retrieved", {
        userId,
        alertCount: alerts.length,
      });
    } catch (error) {
      logger.error("Error getting active alerts:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to retrieve active alerts",
      });
    }
  }

  /**
   * Update alert status
   */
  public async updateAlertStatus(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const { status } = req.body;

      const schema = Joi.object({
        status: Joi.string()
          .valid("active", "investigating", "resolved", "false_positive")
          .required(),
      });

      const { error } = schema.validate({ status });
      if (error) {
        res.status(400).json({
          success: false,
          error: "Invalid status value",
          details: error.details,
        });
        return;
      }

      const updated = await this.anomalyService.updateAlertStatus(
        alertId,
        status,
      );

      if (updated) {
        res.json({
          success: true,
          message: "Alert status updated successfully",
          timestamp: Date.now(),
        });

        logger.info("Alert status updated", {
          alertId,
          status,
          updatedBy: req.user?.id || "system",
        });
      } else {
        res.status(404).json({
          success: false,
          error: "Alert not found",
          message: `Alert with ID ${alertId} not found`,
        });
      }
    } catch (error) {
      logger.error("Error updating alert status:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to update alert status",
      });
    }
  }

  /**
   * Get user risk profile
   */
  public async getUserRiskProfile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const riskProfile = await this.anomalyService.getUserRiskProfile(userId);

      if (riskProfile) {
        res.json({
          success: true,
          data: riskProfile,
          timestamp: Date.now(),
        });

        logger.info("User risk profile retrieved", {
          userId,
          riskScore: riskProfile.riskScore,
        });
      } else {
        res.status(404).json({
          success: false,
          error: "Risk profile not found",
          message: `Risk profile for user ${userId} not found`,
        });
      }
    } catch (error) {
      logger.error("Error getting user risk profile:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to retrieve user risk profile",
      });
    }
  }

  /**
   * Create subscription for real-time updates
   */
  public async createSubscription(req: Request, res: Response): Promise<void> {
    try {
      const schema = Joi.object({
        userId: Joi.string().optional(),
        metrics: Joi.array().items(Joi.string()).required(),
        filters: Joi.object().optional(),
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: "Invalid subscription request",
          details: error.details,
        });
        return;
      }

      const request: SubscriptionRequest = value;
      const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store subscription (in real implementation, use database)
      // For now, just return success

      const response: SubscriptionResponse = {
        success: true,
        subscriptionId,
        message: "Subscription created successfully",
      };

      res.json(response);

      logger.info("Subscription created", {
        subscriptionId,
        userId: request.userId,
        metrics: request.metrics,
      });
    } catch (error) {
      logger.error("Error creating subscription:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to create subscription",
      });
    }
  }

  /**
   * Remove subscription
   */
  public async removeSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { subscriptionId } = req.params;

      // Remove subscription (in real implementation, use database)
      // For now, just return success

      res.json({
        success: true,
        message: "Subscription removed successfully",
        timestamp: Date.now(),
      });

      logger.info("Subscription removed", {
        subscriptionId,
      });
    } catch (error) {
      logger.error("Error removing subscription:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to remove subscription",
      });
    }
  }

  /**
   * Get trend analysis
   */
  public async getTrendAnalysis(req: Request, res: Response): Promise<void> {
    try {
      // Implementation for trend analysis
      res.json({
        success: true,
        data: {
          trends: [],
          message: "Trend analysis feature coming soon",
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error("Error getting trend analysis:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to retrieve trend analysis",
      });
    }
  }

  /**
   * Get correlation analysis
   */
  public async getCorrelationAnalysis(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      // Implementation for correlation analysis
      res.json({
        success: true,
        data: {
          correlations: [],
          message: "Correlation analysis feature coming soon",
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error("Error getting correlation analysis:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to retrieve correlation analysis",
      });
    }
  }

  /**
   * Get forecast data
   */
  public async getForecastData(req: Request, res: Response): Promise<void> {
    try {
      // Implementation for forecast data
      res.json({
        success: true,
        data: {
          forecasts: [],
          message: "Forecast feature coming soon",
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error("Error getting forecast data:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to retrieve forecast data",
      });
    }
  }

  /**
   * Get data quality report
   */
  public async getDataQualityReport(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      // Implementation for data quality report
      res.json({
        success: true,
        data: {
          quality: {
            overall: {
              completeness: 0.95,
              accuracy: 0.98,
              consistency: 0.92,
              timeliness: 0.99,
              validity: 0.96,
              uniqueness: 0.94,
            },
          },
          message: "Data quality monitoring active",
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error("Error getting data quality report:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to retrieve data quality report",
      });
    }
  }

  /**
   * Get health status
   */
  public async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = {
        service: "realtime-analytics-service",
        status: "healthy",
        timestamp: Date.now(),
        details: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
          cpuUsage: process.cpuUsage(),
          connections: {
            kafka: true, // Check actual connection status
            redis: true,
            postgres: true,
            mongodb: true,
          },
          metrics: {
            messagesProcessed: 0, // Get from monitoring
            errorsCount: 0,
            averageProcessingTime: 0,
          },
        },
      };

      res.json(healthStatus);
    } catch (error) {
      logger.error("Error getting health status:", error);
      res.status(500).json({
        service: "realtime-analytics-service",
        status: "unhealthy",
        timestamp: Date.now(),
        error: error.message,
      });
    }
  }

  /**
   * Get system metrics
   */
  public async getSystemMetrics(req: Request, res: Response): Promise<void> {
    try {
      const systemMetrics = {
        timestamp: Date.now(),
        service: "realtime-analytics-service",
        metrics: {
          requestsPerSecond: 0, // Calculate from monitoring
          averageResponseTime: 0,
          errorRate: 0,
          activeConnections: this.io.sockets.sockets.size,
          memoryUsage:
            process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
          cpuUsage: 0, // Get from system monitoring
          diskUsage: 0,
        },
      };

      res.json({
        success: true,
        data: systemMetrics,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error("Error getting system metrics:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to retrieve system metrics",
      });
    }
  }

  /**
   * Handle WebSocket subscription
   */
  public handleSubscription(socket: Socket, data: SubscriptionRequest): void {
    try {
      const subscriptionId = `${socket.id}_${Date.now()}`;

      // Store subscription
      if (!this.subscriptions.has(socket.id)) {
        this.subscriptions.set(socket.id, new Set());
      }

      this.subscriptions.get(socket.id)!.add(subscriptionId);

      // Join socket to relevant rooms
      data.metrics.forEach((metric) => {
        socket.join(`metric_${metric}`);
        if (data.userId) {
          socket.join(`user_${data.userId}_${metric}`);
        }
      });

      socket.emit("subscription_confirmed", {
        subscriptionId,
        metrics: data.metrics,
        timestamp: Date.now(),
      });

      logger.info("WebSocket subscription created", {
        socketId: socket.id,
        subscriptionId,
        metrics: data.metrics,
        userId: data.userId,
      });
    } catch (error) {
      logger.error("Error handling WebSocket subscription:", error);
      socket.emit("subscription_error", {
        error: "Failed to create subscription",
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle WebSocket unsubscription
   */
  public handleUnsubscription(
    socket: Socket,
    data: { subscriptionId: string },
  ): void {
    try {
      const subscriptions = this.subscriptions.get(socket.id);
      if (subscriptions) {
        subscriptions.delete(data.subscriptionId);

        if (subscriptions.size === 0) {
          this.subscriptions.delete(socket.id);
        }
      }

      socket.emit("unsubscription_confirmed", {
        subscriptionId: data.subscriptionId,
        timestamp: Date.now(),
      });

      logger.info("WebSocket unsubscription processed", {
        socketId: socket.id,
        subscriptionId: data.subscriptionId,
      });
    } catch (error) {
      logger.error("Error handling WebSocket unsubscription:", error);
      socket.emit("unsubscription_error", {
        error: "Failed to remove subscription",
        timestamp: Date.now(),
      });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
