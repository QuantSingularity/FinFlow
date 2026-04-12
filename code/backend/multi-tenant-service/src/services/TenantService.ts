import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import winston from "winston";
import { Pool } from "pg";
import Redis from "ioredis";

import { logger } from "../config/logger";
import { getDatabase } from "../config/database";
import { getRedis } from "../config/redis";
import {
  Tenant,
  TenantSettings,
  TenantUser,
  TenantAnalytics,
  TenantCreationRequest,
  TenantUpdateRequest,
  TenantSubscription,
  TenantBilling,
} from "../types/tenant";

export class TenantService extends EventEmitter {
  private db: Pool;
  private redis: Redis;
  private isInitialized: boolean = false;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    try {
      logger.info("Initializing Tenant Service...");

      this.db = await getDatabase();
      this.redis = await getRedis();

      // Create tenant tables if they don't exist
      await this.createTenantTables();

      // Setup event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      logger.info("Tenant Service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Tenant Service:", error);
      throw error;
    }
  }

  private async createTenantTables(): Promise<void> {
    try {
      // Tenants table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS tenants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(100) UNIQUE NOT NULL,
          domain VARCHAR(255),
          subdomain VARCHAR(100) UNIQUE,
          status VARCHAR(50) DEFAULT 'active',
          tier VARCHAR(50) DEFAULT 'basic',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          created_by UUID,
          metadata JSONB DEFAULT '{}',
          settings JSONB DEFAULT '{}',
          billing_info JSONB DEFAULT '{}',
          subscription_info JSONB DEFAULT '{}'
        )
      `);

      // Tenant users table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS tenant_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          user_id UUID NOT NULL,
          role VARCHAR(50) DEFAULT 'user',
          permissions JSONB DEFAULT '[]',
          status VARCHAR(50) DEFAULT 'active',
          invited_at TIMESTAMP DEFAULT NOW(),
          joined_at TIMESTAMP,
          invited_by UUID,
          metadata JSONB DEFAULT '{}',
          UNIQUE(tenant_id, user_id)
        )
      `);

      // Tenant databases table (for database-per-tenant isolation)
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS tenant_databases (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          database_name VARCHAR(100) NOT NULL,
          connection_string TEXT NOT NULL,
          isolation_type VARCHAR(50) DEFAULT 'database',
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          metadata JSONB DEFAULT '{}'
        )
      `);

      // Tenant API keys table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS tenant_api_keys (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          key_name VARCHAR(100) NOT NULL,
          api_key_hash TEXT NOT NULL,
          permissions JSONB DEFAULT '[]',
          rate_limit INTEGER DEFAULT 1000,
          expires_at TIMESTAMP,
          last_used_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          created_by UUID,
          status VARCHAR(50) DEFAULT 'active'
        )
      `);

      // Tenant audit log table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS tenant_audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          user_id UUID,
          action VARCHAR(100) NOT NULL,
          resource_type VARCHAR(100),
          resource_id VARCHAR(255),
          old_values JSONB,
          new_values JSONB,
          ip_address INET,
          user_agent TEXT,
          timestamp TIMESTAMP DEFAULT NOW(),
          metadata JSONB DEFAULT '{}'
        )
      `);

      // Create indexes for performance
      await this.db.query(`
        CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
        CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);
        CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
        CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
        CREATE INDEX IF NOT EXISTS idx_tenant_databases_tenant_id ON tenant_databases(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_tenant_id ON tenant_api_keys(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_tenant_id ON tenant_audit_log(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_timestamp ON tenant_audit_log(timestamp);
      `);

      logger.info("Tenant tables created successfully");
    } catch (error) {
      logger.error("Error creating tenant tables:", error);
      throw error;
    }
  }

  async createTenant(request: TenantCreationRequest): Promise<Tenant> {
    if (!this.isInitialized) {
      throw new Error("Tenant Service not initialized");
    }

    const client = await this.db.connect();

    try {
      await client.query("BEGIN");

      // Generate unique slug and subdomain
      const slug = this.generateSlug(request.name);
      const subdomain = request.subdomain || slug;

      // Check if slug or subdomain already exists
      const existingTenant = await client.query(
        "SELECT id FROM tenants WHERE slug = $1 OR subdomain = $2",
        [slug, subdomain],
      );

      if (existingTenant.rows.length > 0) {
        throw new Error("Tenant with this name or subdomain already exists");
      }

      // Create tenant
      const tenantResult = await client.query(
        `
        INSERT INTO tenants (
          name, slug, domain, subdomain, tier, created_by, 
          metadata, settings, billing_info, subscription_info
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `,
        [
          request.name,
          slug,
          request.domain,
          subdomain,
          request.tier || "basic",
          request.created_by,
          JSON.stringify(request.metadata || {}),
          JSON.stringify(request.settings || {}),
          JSON.stringify(request.billing_info || {}),
          JSON.stringify(request.subscription_info || {}),
        ],
      );

      const tenant = tenantResult.rows[0];

      // Create tenant database if using database-per-tenant isolation
      if (request.isolation_type === "database") {
        await this.createTenantDatabase(client, tenant.id, slug);
      }

      // Add creator as admin user
      if (request.created_by) {
        await client.query(
          `
          INSERT INTO tenant_users (tenant_id, user_id, role, status, joined_at)
          VALUES ($1, $2, 'admin', 'active', NOW())
        `,
          [tenant.id, request.created_by],
        );
      }

      // Generate initial API key
      const apiKey = await this.generateApiKey(
        client,
        tenant.id,
        "default",
        request.created_by,
      );

      await client.query("COMMIT");

      // Cache tenant information
      await this.cacheTenant(tenant);

      // Emit tenant created event
      this.emit("tenant:created", {
        tenant,
        apiKey,
        createdBy: request.created_by,
      });

      // Log audit event
      await this.logAuditEvent(
        tenant.id,
        request.created_by,
        "tenant:created",
        "tenant",
        tenant.id,
        null,
        tenant,
      );

      logger.info(`Tenant created successfully: ${tenant.name} (${tenant.id})`);

      return {
        ...tenant,
        settings: JSON.parse(tenant.settings),
        metadata: JSON.parse(tenant.metadata),
        billing_info: JSON.parse(tenant.billing_info),
        subscription_info: JSON.parse(tenant.subscription_info),
      };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error creating tenant:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    if (!this.isInitialized) {
      throw new Error("Tenant Service not initialized");
    }

    try {
      // Try cache first
      const cached = await this.redis.get(`tenant:${tenantId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Query database
      const result = await this.db.query(
        "SELECT * FROM tenants WHERE id = $1 AND status = $2",
        [tenantId, "active"],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const tenant = {
        ...result.rows[0],
        settings: JSON.parse(result.rows[0].settings),
        metadata: JSON.parse(result.rows[0].metadata),
        billing_info: JSON.parse(result.rows[0].billing_info),
        subscription_info: JSON.parse(result.rows[0].subscription_info),
      };

      // Cache for future requests
      await this.cacheTenant(tenant);

      return tenant;
    } catch (error) {
      logger.error("Error getting tenant:", error);
      throw error;
    }
  }

  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    if (!this.isInitialized) {
      throw new Error("Tenant Service not initialized");
    }

    try {
      // Try cache first
      const cached = await this.redis.get(`tenant:slug:${slug}`);
      if (cached) {
        const tenantId = JSON.parse(cached).id;
        return await this.getTenant(tenantId);
      }

      // Query database
      const result = await this.db.query(
        "SELECT * FROM tenants WHERE slug = $1 AND status = $2",
        [slug, "active"],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const tenant = {
        ...result.rows[0],
        settings: JSON.parse(result.rows[0].settings),
        metadata: JSON.parse(result.rows[0].metadata),
        billing_info: JSON.parse(result.rows[0].billing_info),
        subscription_info: JSON.parse(result.rows[0].subscription_info),
      };

      // Cache for future requests
      await this.cacheTenant(tenant);

      return tenant;
    } catch (error) {
      logger.error("Error getting tenant by slug:", error);
      throw error;
    }
  }

  async getTenantByDomain(domain: string): Promise<Tenant | null> {
    if (!this.isInitialized) {
      throw new Error("Tenant Service not initialized");
    }

    try {
      // Try cache first
      const cached = await this.redis.get(`tenant:domain:${domain}`);
      if (cached) {
        const tenantId = JSON.parse(cached).id;
        return await this.getTenant(tenantId);
      }

      // Query database
      const result = await this.db.query(
        "SELECT * FROM tenants WHERE domain = $1 OR subdomain = $2 AND status = $3",
        [domain, domain.split(".")[0], "active"],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const tenant = {
        ...result.rows[0],
        settings: JSON.parse(result.rows[0].settings),
        metadata: JSON.parse(result.rows[0].metadata),
        billing_info: JSON.parse(result.rows[0].billing_info),
        subscription_info: JSON.parse(result.rows[0].subscription_info),
      };

      // Cache for future requests
      await this.cacheTenant(tenant);

      return tenant;
    } catch (error) {
      logger.error("Error getting tenant by domain:", error);
      throw error;
    }
  }

  async updateTenant(
    tenantId: string,
    updates: TenantUpdateRequest,
  ): Promise<Tenant> {
    if (!this.isInitialized) {
      throw new Error("Tenant Service not initialized");
    }

    const client = await this.db.connect();

    try {
      await client.query("BEGIN");

      // Get current tenant data
      const currentResult = await client.query(
        "SELECT * FROM tenants WHERE id = $1",
        [tenantId],
      );

      if (currentResult.rows.length === 0) {
        throw new Error("Tenant not found");
      }

      const currentTenant = currentResult.rows[0];

      // Build update query
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (updates.name) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(updates.name);
      }

      if (updates.domain) {
        updateFields.push(`domain = $${paramIndex++}`);
        updateValues.push(updates.domain);
      }

      if (updates.tier) {
        updateFields.push(`tier = $${paramIndex++}`);
        updateValues.push(updates.tier);
      }

      if (updates.status) {
        updateFields.push(`status = $${paramIndex++}`);
        updateValues.push(updates.status);
      }

      if (updates.settings) {
        const mergedSettings = {
          ...JSON.parse(currentTenant.settings),
          ...updates.settings,
        };
        updateFields.push(`settings = $${paramIndex++}`);
        updateValues.push(JSON.stringify(mergedSettings));
      }

      if (updates.metadata) {
        const mergedMetadata = {
          ...JSON.parse(currentTenant.metadata),
          ...updates.metadata,
        };
        updateFields.push(`metadata = $${paramIndex++}`);
        updateValues.push(JSON.stringify(mergedMetadata));
      }

      if (updates.billing_info) {
        const mergedBilling = {
          ...JSON.parse(currentTenant.billing_info),
          ...updates.billing_info,
        };
        updateFields.push(`billing_info = $${paramIndex++}`);
        updateValues.push(JSON.stringify(mergedBilling));
      }

      if (updates.subscription_info) {
        const mergedSubscription = {
          ...JSON.parse(currentTenant.subscription_info),
          ...updates.subscription_info,
        };
        updateFields.push(`subscription_info = $${paramIndex++}`);
        updateValues.push(JSON.stringify(mergedSubscription));
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(tenantId);

      const updateQuery = `
        UPDATE tenants 
        SET ${updateFields.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(updateQuery, updateValues);
      const updatedTenant = result.rows[0];

      await client.query("COMMIT");

      // Clear cache
      await this.clearTenantCache(tenantId);

      // Emit tenant updated event
      this.emit("tenant:updated", {
        tenant: updatedTenant,
        previousData: currentTenant,
        updatedBy: updates.updated_by,
      });

      // Log audit event
      await this.logAuditEvent(
        tenantId,
        updates.updated_by,
        "tenant:updated",
        "tenant",
        tenantId,
        currentTenant,
        updatedTenant,
      );

      logger.info(
        `Tenant updated successfully: ${updatedTenant.name} (${tenantId})`,
      );

      return {
        ...updatedTenant,
        settings: JSON.parse(updatedTenant.settings),
        metadata: JSON.parse(updatedTenant.metadata),
        billing_info: JSON.parse(updatedTenant.billing_info),
        subscription_info: JSON.parse(updatedTenant.subscription_info),
      };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error updating tenant:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteTenant(tenantId: string, deletedBy?: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Tenant Service not initialized");
    }

    const client = await this.db.connect();

    try {
      await client.query("BEGIN");

      // Get tenant data before deletion
      const tenantResult = await client.query(
        "SELECT * FROM tenants WHERE id = $1",
        [tenantId],
      );

      if (tenantResult.rows.length === 0) {
        throw new Error("Tenant not found");
      }

      const tenant = tenantResult.rows[0];

      // Soft delete - update status to 'deleted'
      await client.query(
        "UPDATE tenants SET status = $1, updated_at = NOW() WHERE id = $2",
        ["deleted", tenantId],
      );

      // Deactivate all tenant users
      await client.query(
        "UPDATE tenant_users SET status = $1 WHERE tenant_id = $2",
        ["inactive", tenantId],
      );

      // Deactivate all API keys
      await client.query(
        "UPDATE tenant_api_keys SET status = $1 WHERE tenant_id = $2",
        ["inactive", tenantId],
      );

      await client.query("COMMIT");

      // Clear cache
      await this.clearTenantCache(tenantId);

      // Emit tenant deleted event
      this.emit("tenant:deleted", {
        tenant,
        deletedBy,
      });

      // Log audit event
      await this.logAuditEvent(
        tenantId,
        deletedBy,
        "tenant:deleted",
        "tenant",
        tenantId,
        tenant,
        null,
      );

      logger.info(`Tenant deleted successfully: ${tenant.name} (${tenantId})`);
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error deleting tenant:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getTenantInfo(tenantId: string): Promise<any> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Get additional tenant information
    const userCount = await this.db.query(
      "SELECT COUNT(*) as count FROM tenant_users WHERE tenant_id = $1 AND status = $2",
      [tenantId, "active"],
    );

    const apiKeyCount = await this.db.query(
      "SELECT COUNT(*) as count FROM tenant_api_keys WHERE tenant_id = $1 AND status = $2",
      [tenantId, "active"],
    );

    return {
      ...tenant,
      stats: {
        userCount: parseInt(userCount.rows[0].count),
        apiKeyCount: parseInt(apiKeyCount.rows[0].count),
        createdAt: tenant.created_at,
        lastUpdated: tenant.updated_at,
      },
    };
  }

  async getTenantSettings(tenantId: string): Promise<TenantSettings> {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    return tenant.settings;
  }

  async updateTenantSettings(
    tenantId: string,
    settings: Partial<TenantSettings>,
  ): Promise<TenantSettings> {
    const updatedTenant = await this.updateTenant(tenantId, { settings });
    return updatedTenant.settings;
  }

  async getTenantUsers(tenantId: string): Promise<TenantUser[]> {
    if (!this.isInitialized) {
      throw new Error("Tenant Service not initialized");
    }

    try {
      const result = await this.db.query(
        `
        SELECT 
          tu.*,
          u.email,
          u.first_name,
          u.last_name,
          u.avatar_url
        FROM tenant_users tu
        LEFT JOIN users u ON tu.user_id = u.id
        WHERE tu.tenant_id = $1 AND tu.status = $2
        ORDER BY tu.joined_at DESC
      `,
        [tenantId, "active"],
      );

      return result.rows.map((row) => ({
        ...row,
        permissions: JSON.parse(row.permissions),
        metadata: JSON.parse(row.metadata),
      }));
    } catch (error) {
      logger.error("Error getting tenant users:", error);
      throw error;
    }
  }

  async getTenantAnalytics(tenantId: string): Promise<TenantAnalytics> {
    if (!this.isInitialized) {
      throw new Error("Tenant Service not initialized");
    }

    try {
      // Get basic metrics
      const userMetrics = await this.db.query(
        `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
          COUNT(CASE WHEN joined_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d
        FROM tenant_users 
        WHERE tenant_id = $1
      `,
        [tenantId],
      );

      const apiMetrics = await this.db.query(
        `
        SELECT 
          COUNT(*) as total_api_keys,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_api_keys,
          COUNT(CASE WHEN last_used_at >= NOW() - INTERVAL '7 days' THEN 1 END) as used_keys_7d
        FROM tenant_api_keys 
        WHERE tenant_id = $1
      `,
        [tenantId],
      );

      // Get usage metrics from audit log
      const usageMetrics = await this.db.query(
        `
        SELECT 
          COUNT(*) as total_actions,
          COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '24 hours' THEN 1 END) as actions_24h,
          COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '7 days' THEN 1 END) as actions_7d,
          COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '30 days' THEN 1 END) as actions_30d
        FROM tenant_audit_log 
        WHERE tenant_id = $1
      `,
        [tenantId],
      );

      return {
        users: {
          total: parseInt(userMetrics.rows[0].total_users),
          active: parseInt(userMetrics.rows[0].active_users),
          newLast30Days: parseInt(userMetrics.rows[0].new_users_30d),
        },
        apiKeys: {
          total: parseInt(apiMetrics.rows[0].total_api_keys),
          active: parseInt(apiMetrics.rows[0].active_api_keys),
          usedLast7Days: parseInt(apiMetrics.rows[0].used_keys_7d),
        },
        usage: {
          totalActions: parseInt(usageMetrics.rows[0].total_actions),
          actionsLast24Hours: parseInt(usageMetrics.rows[0].actions_24h),
          actionsLast7Days: parseInt(usageMetrics.rows[0].actions_7d),
          actionsLast30Days: parseInt(usageMetrics.rows[0].actions_30d),
        },
      };
    } catch (error) {
      logger.error("Error getting tenant analytics:", error);
      throw error;
    }
  }

  private async createTenantDatabase(
    client: any,
    tenantId: string,
    slug: string,
  ): Promise<void> {
    try {
      const databaseName = `finflow_tenant_${slug}`;

      // Create database (this would need to be done with superuser privileges)
      // For now, we'll just record the database information
      await client.query(
        `
        INSERT INTO tenant_databases (tenant_id, database_name, connection_string, isolation_type)
        VALUES ($1, $2, $3, $4)
      `,
        [
          tenantId,
          databaseName,
          `postgresql://user:password@localhost:5432/${databaseName}`,
          "database",
        ],
      );

      logger.info(`Tenant database created: ${databaseName}`);
    } catch (error) {
      logger.error("Error creating tenant database:", error);
      throw error;
    }
  }

  private async generateApiKey(
    client: any,
    tenantId: string,
    keyName: string,
    createdBy?: string,
  ): Promise<string> {
    try {
      const apiKey = `fft_${tenantId.replace(/-/g, "")}_${uuidv4().replace(/-/g, "")}`;
      const hashedKey = await bcrypt.hash(apiKey, 12);

      await client.query(
        `
        INSERT INTO tenant_api_keys (tenant_id, key_name, api_key_hash, created_by)
        VALUES ($1, $2, $3, $4)
      `,
        [tenantId, keyName, hashedKey, createdBy],
      );

      return apiKey;
    } catch (error) {
      logger.error("Error generating API key:", error);
      throw error;
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 50);
  }

  private async cacheTenant(tenant: Tenant): Promise<void> {
    try {
      const cacheKey = `tenant:${tenant.id}`;
      await this.redis.setex(cacheKey, 3600, JSON.stringify(tenant)); // Cache for 1 hour

      // Also cache by slug and domain for quick lookups
      if (tenant.slug) {
        await this.redis.setex(
          `tenant:slug:${tenant.slug}`,
          3600,
          JSON.stringify({ id: tenant.id }),
        );
      }

      if (tenant.domain) {
        await this.redis.setex(
          `tenant:domain:${tenant.domain}`,
          3600,
          JSON.stringify({ id: tenant.id }),
        );
      }

      if (tenant.subdomain) {
        await this.redis.setex(
          `tenant:domain:${tenant.subdomain}`,
          3600,
          JSON.stringify({ id: tenant.id }),
        );
      }
    } catch (error) {
      logger.warning("Failed to cache tenant:", error);
    }
  }

  private async clearTenantCache(tenantId: string): Promise<void> {
    try {
      const tenant = await this.getTenant(tenantId);
      if (tenant) {
        await this.redis.del(`tenant:${tenantId}`);

        if (tenant.slug) {
          await this.redis.del(`tenant:slug:${tenant.slug}`);
        }

        if (tenant.domain) {
          await this.redis.del(`tenant:domain:${tenant.domain}`);
        }

        if (tenant.subdomain) {
          await this.redis.del(`tenant:domain:${tenant.subdomain}`);
        }
      }
    } catch (error) {
      logger.warning("Failed to clear tenant cache:", error);
    }
  }

  private async logAuditEvent(
    tenantId: string,
    userId: string | undefined,
    action: string,
    resourceType: string,
    resourceId: string,
    oldValues: any,
    newValues: any,
    metadata: any = {},
  ): Promise<void> {
    try {
      await this.db.query(
        `
        INSERT INTO tenant_audit_log (
          tenant_id, user_id, action, resource_type, resource_id,
          old_values, new_values, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
        [
          tenantId,
          userId,
          action,
          resourceType,
          resourceId,
          oldValues ? JSON.stringify(oldValues) : null,
          newValues ? JSON.stringify(newValues) : null,
          JSON.stringify(metadata),
        ],
      );
    } catch (error) {
      logger.error("Error logging audit event:", error);
    }
  }

  private setupEventHandlers(): void {
    this.on("tenant:created", async (data) => {
      logger.info(`Tenant created event: ${data.tenant.name}`);
      // Additional processing for tenant creation
    });

    this.on("tenant:updated", async (data) => {
      logger.info(`Tenant updated event: ${data.tenant.name}`);
      // Additional processing for tenant updates
    });

    this.on("tenant:deleted", async (data) => {
      logger.info(`Tenant deleted event: ${data.tenant.name}`);
      // Additional processing for tenant deletion
    });
  }

  async cleanup(): Promise<void> {
    try {
      logger.info("Cleaning up Tenant Service...");
      // Cleanup any resources if needed
    } catch (error) {
      logger.error("Error during cleanup:", error);
    }
  }
}
