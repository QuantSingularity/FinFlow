import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";
import winston from "winston";

import { config } from "./config/config";
import { logger } from "./config/logger";
import { connectDatabase } from "./config/database";
import { connectRedis } from "./config/redis";
import { initializeKafka } from "./config/kafka";
import { StreamingAnalyticsService } from "./streaming/StreamingAnalyticsService";
import { AnomalyDetectionService } from "./anomaly/AnomalyDetectionService";
import { RealtimeController } from "./controllers/RealtimeController";
import { errorHandler } from "./middleware/errorHandler";
import { authMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { metricsMiddleware } from "./middleware/metrics";
import { swaggerSetup } from "./config/swagger";

// Load environment variables
dotenv.config();

class RealtimeAnalyticsApp {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private streamingService: StreamingAnalyticsService;
  private anomalyService: AnomalyDetectionService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeServices();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
          },
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
      }),
    );

    // CORS configuration
    this.app.use(
      cors({
        origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      }),
    );

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Rate limiting
    this.app.use(rateLimitMiddleware);

    // Metrics collection
    this.app.use(metricsMiddleware);

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date().toISOString(),
      });
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get("/health", (req, res) => {
      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "realtime-analytics-service",
        version: process.env.npm_package_version || "1.0.0",
      });
    });

    // API documentation
    swaggerSetup(this.app);

    // Protected routes
    this.app.use("/api/realtime", authMiddleware);

    // Realtime analytics routes
    const realtimeController = new RealtimeController(this.io);
    this.app.use("/api/realtime", realtimeController.getRouter());

    // WebSocket connection handling
    this.io.on("connection", (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on("subscribe_analytics", (data) => {
        realtimeController.handleSubscription(socket, data);
      });

      socket.on("unsubscribe_analytics", (data) => {
        realtimeController.handleUnsubscription(socket, data);
      });

      socket.on("disconnect", () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use("*", (req, res) => {
      res.status(404).json({
        error: "Not Found",
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
      });
    });

    // Global error handler
    this.app.use(errorHandler);
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize database connections
      await connectDatabase();
      await connectRedis();

      // Initialize Kafka
      await initializeKafka();

      // Initialize streaming analytics service
      this.streamingService = new StreamingAnalyticsService(this.io);
      await this.streamingService.initialize();

      // Initialize anomaly detection service
      this.anomalyService = new AnomalyDetectionService(this.io);
      await this.anomalyService.initialize();

      logger.info("All services initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize services:", error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    const port = config.port || 3008;

    this.server.listen(port, "0.0.0.0", () => {
      logger.info(`Realtime Analytics Service running on port ${port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`API Documentation: http://localhost:${port}/api-docs`);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => this.gracefulShutdown());
    process.on("SIGINT", () => this.gracefulShutdown());
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info("Starting graceful shutdown...");

    try {
      // Close server
      this.server.close(() => {
        logger.info("HTTP server closed");
      });

      // Close WebSocket connections
      this.io.close(() => {
        logger.info("WebSocket server closed");
      });

      // Cleanup services
      if (this.streamingService) {
        await this.streamingService.cleanup();
      }

      if (this.anomalyService) {
        await this.anomalyService.cleanup();
      }

      logger.info("Graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      logger.error("Error during graceful shutdown:", error);
      process.exit(1);
    }
  }
}

// Start the application
const app = new RealtimeAnalyticsApp();
app.start().catch((error) => {
  logger.error("Failed to start application:", error);
  process.exit(1);
});

export default app;
