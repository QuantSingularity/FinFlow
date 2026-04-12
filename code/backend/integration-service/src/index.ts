import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import winston from "winston";
import "express-async-errors";

import { config } from "./config/config";
import { logger } from "./config/logger";
import { initializeDatabase } from "./config/database";
import { initializeRedis } from "./config/redis";
import { initializeQueue } from "./config/queue";
import { QuickBooksService } from "./integrations/quickbooks/QuickBooksService";
import { XeroService } from "./integrations/xero/XeroService";
import { BankingService } from "./integrations/banking/BankingService";
import { PlaidService } from "./integrations/plaid/PlaidService";
import { SyncService } from "./services/SyncService";
import { WebhookService } from "./services/WebhookService";
import { IntegrationController } from "./controllers/IntegrationController";
import { WebhookController } from "./controllers/WebhookController";
import { SyncController } from "./controllers/SyncController";
import { authMiddleware } from "./middleware/authMiddleware";
import { tenantMiddleware } from "./middleware/tenantMiddleware";
import { errorHandler } from "./middleware/errorHandler";
import { metricsMiddleware } from "./middleware/metricsMiddleware";
import { swaggerSetup } from "./config/swagger";

// Load environment variables
dotenv.config();

class IntegrationApp {
  private app: express.Application;
  private quickbooksService: QuickBooksService;
  private xeroService: XeroService;
  private bankingService: BankingService;
  private plaidService: PlaidService;
  private syncService: SyncService;
  private webhookService: WebhookService;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeServices();
    this.initializeRoutes();
    this.initializeErrorHandling();
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
        origin: true,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Tenant-ID",
          "X-Requested-With",
        ],
      }),
    );

    // Rate limiting
    const rateLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: "Too many requests from this IP, please try again later.",
      standardHeaders: true,
      legacyHeaders: false,
    });

    this.app.use(rateLimiter);

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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

  private async initializeServices(): Promise<void> {
    try {
      logger.info("Initializing Integration Services...");

      // Initialize database and cache
      await initializeDatabase();
      await initializeRedis();
      await initializeQueue();

      // Initialize integration services
      this.quickbooksService = new QuickBooksService();
      await this.quickbooksService.initialize();

      this.xeroService = new XeroService();
      await this.xeroService.initialize();

      this.bankingService = new BankingService();
      await this.bankingService.initialize();

      this.plaidService = new PlaidService();
      await this.plaidService.initialize();

      // Initialize sync and webhook services
      this.syncService = new SyncService({
        quickbooks: this.quickbooksService,
        xero: this.xeroService,
        banking: this.bankingService,
        plaid: this.plaidService,
      });
      await this.syncService.initialize();

      this.webhookService = new WebhookService({
        quickbooks: this.quickbooksService,
        xero: this.xeroService,
        banking: this.bankingService,
        plaid: this.plaidService,
      });
      await this.webhookService.initialize();

      logger.info("Integration services initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize services:", error);
      process.exit(1);
    }
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get("/health", (req, res) => {
      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "integration-service",
        version: process.env.npm_package_version || "1.0.0",
      });
    });

    // API documentation
    swaggerSetup(this.app);

    // Integration management routes
    this.app.use(
      "/api/integrations",
      tenantMiddleware,
      authMiddleware,
      new IntegrationController({
        quickbooks: this.quickbooksService,
        xero: this.xeroService,
        banking: this.bankingService,
        plaid: this.plaidService,
      }).getRouter(),
    );

    // Webhook routes (no auth required for external webhooks)
    this.app.use(
      "/api/webhooks",
      new WebhookController(this.webhookService).getRouter(),
    );

    // Sync management routes
    this.app.use(
      "/api/sync",
      tenantMiddleware,
      authMiddleware,
      new SyncController(this.syncService).getRouter(),
    );

    // OAuth callback routes
    this.app.use("/api/oauth", this.getOAuthRoutes());
  }

  private getOAuthRoutes(): express.Router {
    const router = express.Router();

    // QuickBooks OAuth callback
    router.get("/quickbooks/callback", async (req, res) => {
      try {
        const { code, state, realmId } = req.query;
        const result = await this.quickbooksService.handleOAuthCallback(
          code as string,
          state as string,
          realmId as string,
        );

        res.redirect(
          `${config.frontend.baseUrl}/integrations/quickbooks/success?${new URLSearchParams(result)}`,
        );
      } catch (error) {
        logger.error("QuickBooks OAuth callback error:", error);
        res.redirect(
          `${config.frontend.baseUrl}/integrations/quickbooks/error?error=${encodeURIComponent(error.message)}`,
        );
      }
    });

    // Xero OAuth callback
    router.get("/xero/callback", async (req, res) => {
      try {
        const { code, state } = req.query;
        const result = await this.xeroService.handleOAuthCallback(
          code as string,
          state as string,
        );

        res.redirect(
          `${config.frontend.baseUrl}/integrations/xero/success?${new URLSearchParams(result)}`,
        );
      } catch (error) {
        logger.error("Xero OAuth callback error:", error);
        res.redirect(
          `${config.frontend.baseUrl}/integrations/xero/error?error=${encodeURIComponent(error.message)}`,
        );
      }
    });

    // Plaid Link callback
    router.post(
      "/plaid/link",
      tenantMiddleware,
      authMiddleware,
      async (req, res) => {
        try {
          const { public_token, metadata } = req.body;
          const tenantId = req.tenant?.id;
          const userId = req.user?.id;

          if (!tenantId || !userId) {
            return res
              .status(400)
              .json({ error: "Tenant ID and User ID required" });
          }

          const result = await this.plaidService.exchangePublicToken(
            tenantId,
            userId,
            public_token,
            metadata,
          );

          res.json(result);
        } catch (error) {
          logger.error("Plaid Link callback error:", error);
          res.status(500).json({ error: error.message });
        }
      },
    );

    return router;
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

  public async start(): Promise<void> {
    const port = config.port || 3010;

    this.app.listen(port, "0.0.0.0", () => {
      logger.info(`Integration Service running on port ${port}`);
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
      // Cleanup services
      if (this.syncService) {
        await this.syncService.cleanup();
      }

      if (this.webhookService) {
        await this.webhookService.cleanup();
      }

      if (this.quickbooksService) {
        await this.quickbooksService.cleanup();
      }

      if (this.xeroService) {
        await this.xeroService.cleanup();
      }

      if (this.bankingService) {
        await this.bankingService.cleanup();
      }

      if (this.plaidService) {
        await this.plaidService.cleanup();
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
const app = new IntegrationApp();
app.start().catch((error) => {
  logger.error("Failed to start application:", error);
  process.exit(1);
});

export default app;
