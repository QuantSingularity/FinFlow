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
import { initializeKafka } from "./config/kafka";
import { TenantService } from "./services/TenantService";
import { DataIsolationService } from "./services/DataIsolationService";
import { TenantController } from "./controllers/TenantController";
import { DataIsolationController } from "./controllers/DataIsolationController";
import { tenantMiddleware } from "./middleware/tenantMiddleware";
import { authMiddleware } from "./middleware/authMiddleware";
import { dataIsolationMiddleware } from "./middleware/dataIsolationMiddleware";
import { errorHandler } from "./middleware/errorHandler";
import { metricsMiddleware } from "./middleware/metricsMiddleware";
import { swaggerSetup } from "./config/swagger";

// Load environment variables
dotenv.config();

class MultiTenantApp {
  private app: express.Application;
  private tenantService: TenantService;
  private dataIsolationService: DataIsolationService;

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

    // CORS configuration for multi-tenant
    this.app.use(
      cors({
        origin: (origin, callback) => {
          // Allow requests from tenant-specific domains
          if (!origin || this.isAllowedOrigin(origin)) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        },
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

    // Rate limiting per tenant
    const rateLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: (req) => {
        // Different limits based on tenant tier
        const tenantTier = req.headers["x-tenant-tier"] as string;
        switch (tenantTier) {
          case "enterprise":
            return 10000;
          case "professional":
            return 5000;
          case "basic":
            return 1000;
          default:
            return 100;
        }
      },
      message: "Too many requests from this tenant, please try again later.",
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return `${req.ip}:${req.headers["x-tenant-id"] || "unknown"}`;
      },
    });

    this.app.use(rateLimiter);

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Metrics collection
    this.app.use(metricsMiddleware);

    // Request logging with tenant context
    this.app.use((req, res, next) => {
      const tenantId = req.headers["x-tenant-id"] as string;
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        tenantId: tenantId || "unknown",
        timestamp: new Date().toISOString(),
      });
      next();
    });
  }

  private isAllowedOrigin(origin: string): boolean {
    // Check if origin is from an allowed tenant domain
    const allowedDomains = config.security.allowedDomains || [];
    const allowedPatterns = config.security.allowedOriginPatterns || [];

    // Check exact matches
    if (allowedDomains.includes(origin)) {
      return true;
    }

    // Check pattern matches (e.g., *.finflow.com)
    return allowedPatterns.some((pattern) => {
      const regex = new RegExp(pattern.replace("*", ".*"));
      return regex.test(origin);
    });
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize database connections
      await initializeDatabase();
      await initializeRedis();
      await initializeKafka();

      // Initialize tenant services
      this.tenantService = new TenantService();
      await this.tenantService.initialize();

      // Initialize data isolation service
      this.dataIsolationService = new DataIsolationService();
      await this.dataIsolationService.initialize();

      logger.info("Multi-tenant services initialized successfully");
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
        service: "multi-tenant-service",
        version: process.env.npm_package_version || "1.0.0",
      });
    });

    // API documentation
    swaggerSetup(this.app);

    // Tenant management routes (admin only)
    this.app.use(
      "/api/admin/tenants",
      authMiddleware,
      this.requireAdminRole.bind(this),
      new TenantController(this.tenantService).getRouter(),
    );

    // Data isolation management routes
    this.app.use(
      "/api/admin/isolation",
      authMiddleware,
      this.requireAdminRole.bind(this),
      new DataIsolationController(this.dataIsolationService).getRouter(),
    );

    // Tenant-specific API routes
    this.app.use(
      "/api/tenant",
      tenantMiddleware,
      authMiddleware,
      dataIsolationMiddleware,
      this.getTenantSpecificRoutes(),
    );

    // Multi-tenant data access routes
    this.app.use(
      "/api/data",
      tenantMiddleware,
      authMiddleware,
      dataIsolationMiddleware,
      this.getDataAccessRoutes(),
    );
  }

  private requireAdminRole(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ): void {
    const userRole = req.user?.role;
    if (userRole !== "admin" && userRole !== "super_admin") {
      res.status(403).json({
        error: "Forbidden",
        message: "Admin role required",
      });
      return;
    }
    next();
  }

  private getTenantSpecificRoutes(): express.Router {
    const router = express.Router();

    // Tenant information
    router.get("/info", async (req, res) => {
      const tenantId = req.tenant?.id;
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const tenantInfo = await this.tenantService.getTenantInfo(tenantId);
      res.json(tenantInfo);
    });

    // Tenant settings
    router.get("/settings", async (req, res) => {
      const tenantId = req.tenant?.id;
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const settings = await this.tenantService.getTenantSettings(tenantId);
      res.json(settings);
    });

    router.put("/settings", async (req, res) => {
      const tenantId = req.tenant?.id;
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const updatedSettings = await this.tenantService.updateTenantSettings(
        tenantId,
        req.body,
      );
      res.json(updatedSettings);
    });

    // Tenant users management
    router.get("/users", async (req, res) => {
      const tenantId = req.tenant?.id;
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const users = await this.tenantService.getTenantUsers(tenantId);
      res.json(users);
    });

    // Tenant analytics
    router.get("/analytics", async (req, res) => {
      const tenantId = req.tenant?.id;
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const analytics = await this.tenantService.getTenantAnalytics(tenantId);
      res.json(analytics);
    });

    return router;
  }

  private getDataAccessRoutes(): express.Router {
    const router = express.Router();

    // Generic data access with automatic tenant isolation
    router.get("/:resource", async (req, res) => {
      const tenantId = req.tenant?.id;
      const resource = req.params.resource;
      const filters = req.query;

      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const data = await this.dataIsolationService.getData(
        tenantId,
        resource,
        filters,
      );
      res.json(data);
    });

    router.post("/:resource", async (req, res) => {
      const tenantId = req.tenant?.id;
      const resource = req.params.resource;
      const data = req.body;

      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const result = await this.dataIsolationService.createData(
        tenantId,
        resource,
        data,
      );
      res.status(201).json(result);
    });

    router.put("/:resource/:id", async (req, res) => {
      const tenantId = req.tenant?.id;
      const resource = req.params.resource;
      const id = req.params.id;
      const data = req.body;

      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const result = await this.dataIsolationService.updateData(
        tenantId,
        resource,
        id,
        data,
      );
      res.json(result);
    });

    router.delete("/:resource/:id", async (req, res) => {
      const tenantId = req.tenant?.id;
      const resource = req.params.resource;
      const id = req.params.id;

      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      await this.dataIsolationService.deleteData(tenantId, resource, id);
      res.status(204).send();
    });

    // Bulk operations
    router.post("/:resource/bulk", async (req, res) => {
      const tenantId = req.tenant?.id;
      const resource = req.params.resource;
      const operations = req.body.operations;

      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const results = await this.dataIsolationService.bulkOperations(
        tenantId,
        resource,
        operations,
      );
      res.json(results);
    });

    // Data export
    router.get("/:resource/export", async (req, res) => {
      const tenantId = req.tenant?.id;
      const resource = req.params.resource;
      const format = (req.query.format as string) || "json";

      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const exportData = await this.dataIsolationService.exportData(
        tenantId,
        resource,
        format,
      );

      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${resource}-${tenantId}.csv"`,
        );
      } else {
        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${resource}-${tenantId}.json"`,
        );
      }

      res.send(exportData);
    });

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
    const port = config.port || 3009;

    this.app.listen(port, "0.0.0.0", () => {
      logger.info(`Multi-Tenant Service running on port ${port}`);
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
      if (this.tenantService) {
        await this.tenantService.cleanup();
      }

      if (this.dataIsolationService) {
        await this.dataIsolationService.cleanup();
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
const app = new MultiTenantApp();
app.start().catch((error) => {
  logger.error("Failed to start application:", error);
  process.exit(1);
});

export default app;
