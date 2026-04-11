import { EventEmitter } from "events";
import { Pool, PoolClient } from "pg";
import Redis from "ioredis";
import { createObjectCsvWriter } from "csv-writer";
import archiver from "archiver";
import { Readable } from "stream";
import { logger } from "../config/logger";
import { getDatabase } from "../config/database";
import { getRedis } from "../config/redis";
import {
  DataIsolationStrategy,
  BulkOperation,
  DataExportOptions,
  DataValidationRule,
} from "../types/isolation";

export class DataIsolationService extends EventEmitter {
  private db!: Pool;
  private redis!: Redis;
  private isInitialized: boolean = false;
  private isolationStrategies: Map<string, DataIsolationStrategy> = new Map();
  private tenantDatabases: Map<string, Pool> = new Map();
  private validationRules: Map<string, DataValidationRule[]> = new Map();

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    try {
      this.db = await getDatabase();
      this.redis = await getRedis();
      await this.loadIsolationStrategies();
      await this.initializeTenantDatabases();
      await this.setupValidationRules();
      await this.createIsolationTables();
      this.isInitialized = true;
    } catch (error) {
      logger.error("Failed to initialize Data Isolation Service:", error);
      throw error;
    }
  }

  private async loadIsolationStrategies(): Promise<void> {
    const strategies: Record<string, DataIsolationStrategy> = {
      schema: {
        type: "schema",
        description: "Each tenant gets their own database schema",
        implementation: "schema_per_tenant",
        security_level: "high",
        performance_impact: "low",
        complexity: "medium",
      },
      database: {
        type: "database",
        description: "Each tenant gets their own database",
        implementation: "database_per_tenant",
        security_level: "highest",
        performance_impact: "medium",
        complexity: "high",
      },
      row: {
        type: "row",
        description: "Shared tables with tenant_id column",
        implementation: "row_level_security",
        security_level: "medium",
        performance_impact: "low",
        complexity: "low",
      },
    };
    Object.entries(strategies).forEach(([k, v]) =>
      this.isolationStrategies.set(k, v),
    );
  }

  private async initializeTenantDatabases(): Promise<void> {
    try {
      const { rows } = await this.db.query(`
        SELECT t.id, t.slug, td.connection_string
        FROM tenants t
        JOIN tenant_databases td ON t.id = td.tenant_id
        WHERE td.isolation_type = 'database' AND td.status = 'active'
      `);

      rows.forEach((row) => {
        const pool = new Pool({
          connectionString: row.connection_string,
          max: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        });
        this.tenantDatabases.set(row.id, pool);
      });
    } catch (error) {
      logger.error("Error initializing tenant databases:", error);
    }
  }

  private async setupValidationRules(): Promise<void> {
    this.validationRules.set("transactions", [
      {
        field: "amount",
        type: "number",
        required: true,
        min: 0.01,
        max: 1000000,
      },
      {
        field: "currency",
        type: "string",
        required: true,
        pattern: "^[A-Z]{3}$",
      },
      { field: "user_id", type: "uuid", required: true },
    ]);
    this.validationRules.set("users", [
      { field: "email", type: "email", required: true, unique: true },
      {
        field: "first_name",
        type: "string",
        required: true,
        minLength: 1,
        maxLength: 100,
      },
      {
        field: "last_name",
        type: "string",
        required: true,
        minLength: 1,
        maxLength: 100,
      },
    ]);
  }

  private async createIsolationTables(): Promise<void> {
    const queries = [
      `CREATE TABLE IF NOT EXISTS tenant_data_access_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        user_id UUID,
        resource_type VARCHAR(100) NOT NULL,
        resource_id VARCHAR(255),
        action VARCHAR(50) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT NOW(),
        metadata JSONB DEFAULT '{}',
        isolation_strategy VARCHAR(50),
        data_hash VARCHAR(255)
      )`,
      `CREATE TABLE IF NOT EXISTS tenant_encryption_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        key_name VARCHAR(100) NOT NULL,
        encrypted_key TEXT NOT NULL,
        algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
        created_at TIMESTAMP DEFAULT NOW(),
        status VARCHAR(50) DEFAULT 'active',
        UNIQUE(tenant_id, key_name)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_access_tenant ON tenant_data_access_log(tenant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_tenant_access_time ON tenant_data_access_log(timestamp)`,
    ];
    for (const q of queries) await this.db.query(q);
  }

  async getData(
    tenantId: string,
    resource: string,
    filters: any = {},
    options: any = {},
  ): Promise<any[]> {
    if (!this.isInitialized) throw new Error("Service not initialized");
    const strategy = await this.getTenantIsolationStrategy(tenantId);
    let data: any[];

    switch (strategy) {
      case "database":
        data = await this.getDataFromTenantDatabase(
          tenantId,
          resource,
          filters,
          options,
        );
        break;
      case "schema":
        data = await this.getDataFromTenantSchema(
          tenantId,
          resource,
          filters,
          options,
        );
        break;
      default:
        data = await this.getDataWithRowLevelSecurity(
          tenantId,
          resource,
          filters,
          options,
        );
    }

    if (options.cache !== false)
      await this.cacheData(tenantId, resource, filters, data);
    return data;
  }

  async createData(
    tenantId: string,
    resource: string,
    data: any,
    options: any = {},
  ): Promise<any> {
    await this.validateData(resource, data);
    const strategy = await this.getTenantIsolationStrategy(tenantId);
    let result: any;

    const payload =
      strategy === "row" ? { ...data, tenant_id: tenantId } : data;
    const schema =
      strategy === "schema"
        ? `tenant_${tenantId.replace(/-/g, "_")}`
        : undefined;

    const client = options.client || (await this.getClientForTenant(tenantId));
    try {
      const { query, values } = this.buildInsertQuery(
        resource,
        payload,
        schema,
      );
      const res = await client.query(query, values);
      result = res.rows[0];
    } finally {
      if (!options.client) client.release();
    }

    this.emit("data:created", { tenantId, resource, data: result });
    return result;
  }

  private async getTenantIsolationStrategy(tenantId: string): Promise<string> {
    const cacheKey = `tenant:isolation:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const { rows } = await this.db.query(
      `SELECT isolation_type FROM tenant_databases WHERE tenant_id = $1 AND status = 'active' LIMIT 1`,
      [tenantId],
    );
    const strategy = rows[0]?.isolation_type || "row";
    await this.redis.setex(cacheKey, 3600, strategy);
    return strategy;
  }

  private async getClientForTenant(tenantId: string): Promise<PoolClient> {
    const strategy = await this.getTenantIsolationStrategy(tenantId);
    const pool =
      (strategy === "database" && this.tenantDatabases.get(tenantId)) ||
      this.db;
    return await pool.connect();
  }

  private buildInsertQuery(resource: string, data: any, schema?: string) {
    const tableName = schema ? `"${schema}"."${resource}"` : `"${resource}"`;
    const cols = Object.keys(data);
    const vals = Object.values(data);
    return {
      query: `INSERT INTO ${tableName} (${cols.map((c) => `"${c}"`).join(",")}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`,
      values: vals,
    };
  }

  private async validateData(resource: string, data: any, isUpdate = false) {
    const rules = this.validationRules.get(resource);
    if (!rules) return;
    for (const rule of rules) {
      const val = data[rule.field];
      if (rule.required && !isUpdate && val == null)
        throw new Error(`${rule.field} required`);
      if (val != null) {
        if (rule.type === "number" && typeof val !== "number")
          throw new Error(`${rule.field} must be number`);
        if (
          rule.type === "uuid" &&
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            val,
          )
        )
          throw new Error(`${rule.field} invalid UUID`);
      }
    }
  }

  private async cacheData(
    tenantId: string,
    resource: string,
    filters: any,
    data: any,
  ) {
    const key = `cache:${tenantId}:${resource}:${JSON.stringify(filters)}`;
    await this.redis.setex(key, 300, JSON.stringify(data));
  }

  private async getDataFromTenantDatabase(
    tId: string,
    res: string,
    f: any,
    o: any,
  ) {
    const client = await this.getClientForTenant(tId);
    try {
      const { query, values } = this.buildSelectQuery(res, f, o);
      const result = await client.query(query, values);
      return result.rows;
    } finally {
      client.release();
    }
  }

  private async getDataFromTenantSchema(
    tId: string,
    res: string,
    f: any,
    o: any,
  ) {
    const schema = `tenant_${tId.replace(/-/g, "_")}`;
    const { query, values } = this.buildSelectQuery(res, f, o, schema);
    const result = await this.db.query(query, values);
    return result.rows;
  }

  private async getDataWithRowLevelSecurity(
    tId: string,
    res: string,
    f: any,
    o: any,
  ) {
    const { query, values } = this.buildSelectQuery(
      res,
      { ...f, tenant_id: tId },
      o,
    );
    const result = await this.db.query(query, values);
    return result.rows;
  }

  private buildSelectQuery(
    resource: string,
    filters: any,
    options: any,
    schema?: string,
  ) {
    const table = schema ? `"${schema}"."${resource}"` : `"${resource}"`;
    let query = `SELECT * FROM ${table}`;
    const vals: any[] = [];
    const conds = Object.entries(filters)
      .filter(([_, v]) => v != null)
      .map(([k, v], i) => {
        vals.push(v);
        return `"${k}" = $${i + 1}`;
      });

    if (conds.length) query += ` WHERE ${conds.join(" AND ")}`;
    if (options.orderBy)
      query += ` ORDER BY "${options.orderBy}" ${options.orderDirection || "ASC"}`;
    if (options.limit) {
      vals.push(options.limit);
      query += ` LIMIT $${vals.length}`;
    }
    return { query, values: vals };
  }
}
