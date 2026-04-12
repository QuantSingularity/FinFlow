import { EventEmitter } from "events";
import { Pool, PoolClient } from "pg";
import { QueryStream } from "pg-query-stream";
import winston from "winston";
import { Readable } from "stream";

import { logger } from "../config/logger";
import { getDatabase } from "../config/database";
import {
  QueryOptimization,
  IndexRecommendation,
  PartitionStrategy,
  DatabaseStats,
  QueryPerformance,
  ConnectionPoolStats,
  OptimizationResult,
} from "../types/database";

export class DatabaseOptimizer extends EventEmitter {
  private db: Pool;
  private isInitialized: boolean = false;

  // Query performance tracking
  private queryStats: Map<string, QueryPerformance> = new Map();
  private slowQueries: QueryPerformance[] = [];

  // Connection pool monitoring
  private poolStats: ConnectionPoolStats = {
    totalConnections: 0,
    idleConnections: 0,
    activeConnections: 0,
    waitingClients: 0,
    maxConnections: 0,
  };

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    try {
      logger.info("Initializing Database Optimizer...");

      this.db = await getDatabase();

      // Setup query monitoring
      await this.setupQueryMonitoring();

      // Setup connection pool monitoring
      this.setupConnectionPoolMonitoring();

      // Setup automatic optimization
      this.setupAutomaticOptimization();

      // Create optimization tables
      await this.createOptimizationTables();

      this.isInitialized = true;
      logger.info("Database Optimizer initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Database Optimizer:", error);
      throw error;
    }
  }

  private async createOptimizationTables(): Promise<void> {
    try {
      // Query performance log
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS query_performance_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          query_hash VARCHAR(64) NOT NULL,
          query_text TEXT NOT NULL,
          execution_time_ms NUMERIC NOT NULL,
          rows_examined BIGINT,
          rows_returned BIGINT,
          index_usage JSONB,
          execution_plan JSONB,
          tenant_id UUID,
          user_id UUID,
          timestamp TIMESTAMP DEFAULT NOW(),
          optimization_applied BOOLEAN DEFAULT FALSE
        )
      `);

      // Index recommendations
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS index_recommendations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          table_name VARCHAR(255) NOT NULL,
          column_names TEXT[] NOT NULL,
          index_type VARCHAR(50) NOT NULL,
          estimated_benefit NUMERIC,
          query_patterns TEXT[],
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW(),
          applied_at TIMESTAMP,
          impact_analysis JSONB
        )
      `);

      // Partition strategies
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS partition_strategies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          table_name VARCHAR(255) NOT NULL,
          partition_type VARCHAR(50) NOT NULL,
          partition_key VARCHAR(255) NOT NULL,
          partition_interval VARCHAR(50),
          estimated_benefit NUMERIC,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW(),
          applied_at TIMESTAMP,
          configuration JSONB
        )
      `);

      // Database statistics
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS database_statistics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          metric_name VARCHAR(100) NOT NULL,
          metric_value NUMERIC NOT NULL,
          metric_unit VARCHAR(50),
          table_name VARCHAR(255),
          timestamp TIMESTAMP DEFAULT NOW(),
          metadata JSONB
        )
      `);

      // Create indexes
      await this.db.query(`
        CREATE INDEX IF NOT EXISTS idx_query_performance_log_hash ON query_performance_log(query_hash);
        CREATE INDEX IF NOT EXISTS idx_query_performance_log_timestamp ON query_performance_log(timestamp);
        CREATE INDEX IF NOT EXISTS idx_query_performance_log_execution_time ON query_performance_log(execution_time_ms);
        CREATE INDEX IF NOT EXISTS idx_index_recommendations_table ON index_recommendations(table_name);
        CREATE INDEX IF NOT EXISTS idx_partition_strategies_table ON partition_strategies(table_name);
        CREATE INDEX IF NOT EXISTS idx_database_statistics_metric ON database_statistics(metric_name, timestamp);
      `);

      logger.info("Database optimization tables created successfully");
    } catch (error) {
      logger.error("Error creating optimization tables:", error);
      throw error;
    }
  }

  private async setupQueryMonitoring(): Promise<void> {
    try {
      // Enable query logging and statistics
      await this.db.query(`
        ALTER SYSTEM SET log_statement = 'all';
        ALTER SYSTEM SET log_min_duration_statement = 1000;
        ALTER SYSTEM SET track_activities = on;
        ALTER SYSTEM SET track_counts = on;
        ALTER SYSTEM SET track_io_timing = on;
        ALTER SYSTEM SET track_functions = 'all';
      `);

      // Create extension for query statistics if not exists
      await this.db.query(`
        CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
      `);

      logger.info("Query monitoring setup completed");
    } catch (error) {
      logger.warning(
        "Could not setup query monitoring (may require superuser privileges):",
        error,
      );
    }
  }

  async analyzeQueryPerformance(): Promise<QueryPerformance[]> {
    if (!this.isInitialized) {
      throw new Error("Database Optimizer not initialized");
    }

    try {
      // Get query statistics from pg_stat_statements
      const result = await this.db.query(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          min_time,
          max_time,
          stddev_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements 
        WHERE calls > 10
        ORDER BY total_time DESC 
        LIMIT 50
      `);

      const queryPerformances: QueryPerformance[] = result.rows.map((row) => ({
        queryHash: this.hashQuery(row.query),
        queryText: row.query,
        executionCount: row.calls,
        totalExecutionTime: row.total_time,
        averageExecutionTime: row.mean_time,
        minExecutionTime: row.min_time,
        maxExecutionTime: row.max_time,
        standardDeviation: row.stddev_time,
        rowsAffected: row.rows,
        cacheHitRatio: row.hit_percent || 0,
        lastExecuted: new Date(),
        optimizationApplied: false,
      }));

      // Store slow queries
      this.slowQueries = queryPerformances.filter(
        (q) => q.averageExecutionTime > 1000,
      );

      // Log performance data
      for (const perf of queryPerformances) {
        await this.logQueryPerformance(perf);
      }

      logger.info(
        `Analyzed ${queryPerformances.length} queries, found ${this.slowQueries.length} slow queries`,
      );
      return queryPerformances;
    } catch (error) {
      logger.error("Error analyzing query performance:", error);
      throw error;
    }
  }

  async generateIndexRecommendations(): Promise<IndexRecommendation[]> {
    if (!this.isInitialized) {
      throw new Error("Database Optimizer not initialized");
    }

    try {
      const recommendations: IndexRecommendation[] = [];

      // Analyze missing indexes from slow queries
      const missingIndexes = await this.analyzeMissingIndexes();
      recommendations.push(...missingIndexes);

      // Analyze unused indexes
      const unusedIndexes = await this.analyzeUnusedIndexes();

      // Analyze duplicate indexes
      const duplicateIndexes = await this.analyzeDuplicateIndexes();

      // Store recommendations
      for (const recommendation of recommendations) {
        await this.storeIndexRecommendation(recommendation);
      }

      logger.info(`Generated ${recommendations.length} index recommendations`);
      return recommendations;
    } catch (error) {
      logger.error("Error generating index recommendations:", error);
      throw error;
    }
  }

  private async analyzeMissingIndexes(): Promise<IndexRecommendation[]> {
    try {
      const recommendations: IndexRecommendation[] = [];

      // Analyze slow queries for potential index opportunities
      for (const slowQuery of this.slowQueries) {
        const analysis = await this.analyzeQueryForIndexes(slowQuery);
        recommendations.push(...analysis);
      }

      // Check for common patterns that benefit from indexes
      const commonPatterns = await this.analyzeCommonQueryPatterns();
      recommendations.push(...commonPatterns);

      return recommendations;
    } catch (error) {
      logger.error("Error analyzing missing indexes:", error);
      return [];
    }
  }

  private async analyzeQueryForIndexes(
    query: QueryPerformance,
  ): Promise<IndexRecommendation[]> {
    try {
      const recommendations: IndexRecommendation[] = [];

      // Get query execution plan
      const planResult = await this.db.query(
        `EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS) ${query.queryText}`,
      );
      const plan = planResult.rows[0]["QUERY PLAN"][0];

      // Analyze plan for sequential scans
      const seqScans = this.findSequentialScans(plan);

      for (const scan of seqScans) {
        if (scan.rowsExamined > 1000) {
          // Only recommend for tables with significant rows
          recommendations.push({
            tableName: scan.tableName,
            columnNames: scan.filterColumns,
            indexType: "btree",
            estimatedBenefit: this.calculateIndexBenefit(scan),
            queryPatterns: [query.queryText],
            status: "pending",
            impactAnalysis: {
              currentCost: scan.cost,
              estimatedCost: scan.cost * 0.1, // Assume 90% improvement
              affectedQueries: 1,
              storageOverhead: scan.filterColumns.length * 8, // Rough estimate
            },
          });
        }
      }

      return recommendations;
    } catch (error) {
      logger.error("Error analyzing query for indexes:", error);
      return [];
    }
  }

  private async analyzeCommonQueryPatterns(): Promise<IndexRecommendation[]> {
    try {
      const recommendations: IndexRecommendation[] = [];

      // Analyze common WHERE clause patterns
      const wherePatterns = await this.db.query(`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
          AND n_distinct > 100
        ORDER BY n_distinct DESC
      `);

      for (const pattern of wherePatterns.rows) {
        // Recommend indexes for high-cardinality columns
        if (pattern.n_distinct > 1000) {
          recommendations.push({
            tableName: pattern.tablename,
            columnNames: [pattern.attname],
            indexType: "btree",
            estimatedBenefit: Math.log(pattern.n_distinct) * 10,
            queryPatterns: [`WHERE ${pattern.attname} = ?`],
            status: "pending",
            impactAnalysis: {
              currentCost: 1000,
              estimatedCost: Math.log(pattern.n_distinct),
              affectedQueries: 0,
              storageOverhead: pattern.n_distinct * 8,
            },
          });
        }
      }

      // Analyze foreign key relationships
      const foreignKeys = await this.db.query(`
        SELECT 
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
      `);

      for (const fk of foreignKeys.rows) {
        recommendations.push({
          tableName: fk.table_name,
          columnNames: [fk.column_name],
          indexType: "btree",
          estimatedBenefit: 50, // Foreign keys typically benefit from indexes
          queryPatterns: [
            `JOIN ON ${fk.table_name}.${fk.column_name} = ${fk.foreign_table_name}.${fk.foreign_column_name}`,
          ],
          status: "pending",
          impactAnalysis: {
            currentCost: 1000,
            estimatedCost: 100,
            affectedQueries: 0,
            storageOverhead: 1000,
          },
        });
      }

      return recommendations;
    } catch (error) {
      logger.error("Error analyzing common query patterns:", error);
      return [];
    }
  }

  private async analyzeUnusedIndexes(): Promise<string[]> {
    try {
      const result = await this.db.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE idx_tup_read = 0 AND idx_tup_fetch = 0
          AND indexname NOT LIKE '%_pkey'
        ORDER BY schemaname, tablename, indexname
      `);

      const unusedIndexes = result.rows.map(
        (row) => `${row.schemaname}.${row.tablename}.${row.indexname}`,
      );

      if (unusedIndexes.length > 0) {
        logger.info(
          `Found ${unusedIndexes.length} unused indexes:`,
          unusedIndexes,
        );
      }

      return unusedIndexes;
    } catch (error) {
      logger.error("Error analyzing unused indexes:", error);
      return [];
    }
  }

  private async analyzeDuplicateIndexes(): Promise<string[]> {
    try {
      const result = await this.db.query(`
        SELECT 
          t.schemaname,
          t.tablename,
          array_agg(t.indexname) as duplicate_indexes
        FROM (
          SELECT 
            schemaname,
            tablename,
            indexname,
            array_to_string(array_agg(attname ORDER BY attnum), ',') as columns
          FROM pg_index i
          JOIN pg_class c ON c.oid = i.indexrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE n.nspname = 'public'
          GROUP BY schemaname, tablename, indexname
        ) t
        GROUP BY t.schemaname, t.tablename, t.columns
        HAVING count(*) > 1
      `);

      const duplicateIndexes: string[] = [];
      for (const row of result.rows) {
        duplicateIndexes.push(...row.duplicate_indexes.slice(1)); // Keep first, mark others as duplicates
      }

      if (duplicateIndexes.length > 0) {
        logger.info(
          `Found ${duplicateIndexes.length} duplicate indexes:`,
          duplicateIndexes,
        );
      }

      return duplicateIndexes;
    } catch (error) {
      logger.error("Error analyzing duplicate indexes:", error);
      return [];
    }
  }

  async optimizeQueries(): Promise<OptimizationResult[]> {
    if (!this.isInitialized) {
      throw new Error("Database Optimizer not initialized");
    }

    try {
      const results: OptimizationResult[] = [];

      // Apply index recommendations
      const indexRecommendations = await this.getIndexRecommendations();
      for (const recommendation of indexRecommendations) {
        if (recommendation.estimatedBenefit > 50) {
          // Only apply high-benefit indexes
          const result = await this.applyIndexRecommendation(recommendation);
          results.push(result);
        }
      }

      // Optimize table statistics
      const statsResult = await this.updateTableStatistics();
      results.push(statsResult);

      // Optimize connection pool
      const poolResult = await this.optimizeConnectionPool();
      results.push(poolResult);

      logger.info(`Applied ${results.length} optimizations`);
      return results;
    } catch (error) {
      logger.error("Error optimizing queries:", error);
      throw error;
    }
  }

  private async applyIndexRecommendation(
    recommendation: IndexRecommendation,
  ): Promise<OptimizationResult> {
    try {
      const indexName = `idx_${recommendation.tableName}_${recommendation.columnNames.join("_")}`;
      const createIndexSQL = `
        CREATE INDEX CONCURRENTLY ${indexName} 
        ON ${recommendation.tableName} 
        USING ${recommendation.indexType} (${recommendation.columnNames.join(", ")})
      `;

      const startTime = Date.now();
      await this.db.query(createIndexSQL);
      const duration = Date.now() - startTime;

      // Update recommendation status
      await this.db.query(
        `
        UPDATE index_recommendations 
        SET status = 'applied', applied_at = NOW()
        WHERE table_name = $1 AND column_names = $2
      `,
        [recommendation.tableName, recommendation.columnNames],
      );

      logger.info(`Applied index recommendation: ${indexName}`);

      return {
        type: "index_creation",
        description: `Created index ${indexName}`,
        estimatedBenefit: recommendation.estimatedBenefit,
        actualBenefit: 0, // Will be measured over time
        duration,
        success: true,
      };
    } catch (error) {
      logger.error("Error applying index recommendation:", error);
      return {
        type: "index_creation",
        description: `Failed to create index for ${recommendation.tableName}`,
        estimatedBenefit: recommendation.estimatedBenefit,
        actualBenefit: 0,
        duration: 0,
        success: false,
        error: error.message,
      };
    }
  }

  private async updateTableStatistics(): Promise<OptimizationResult> {
    try {
      const startTime = Date.now();

      // Get all user tables
      const tablesResult = await this.db.query(`
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
      `);

      // Update statistics for each table
      for (const table of tablesResult.rows) {
        await this.db.query(`ANALYZE ${table.schemaname}.${table.tablename}`);
      }

      const duration = Date.now() - startTime;

      logger.info(`Updated statistics for ${tablesResult.rows.length} tables`);

      return {
        type: "statistics_update",
        description: `Updated statistics for ${tablesResult.rows.length} tables`,
        estimatedBenefit: 20,
        actualBenefit: 0,
        duration,
        success: true,
      };
    } catch (error) {
      logger.error("Error updating table statistics:", error);
      return {
        type: "statistics_update",
        description: "Failed to update table statistics",
        estimatedBenefit: 20,
        actualBenefit: 0,
        duration: 0,
        success: false,
        error: error.message,
      };
    }
  }

  private async optimizeConnectionPool(): Promise<OptimizationResult> {
    try {
      const stats = await this.getConnectionPoolStats();

      // Calculate optimal pool size based on usage patterns
      const optimalSize = Math.max(
        Math.ceil(stats.activeConnections * 1.2), // 20% buffer
        10, // Minimum pool size
      );

      // This would typically involve reconfiguring the pool
      // For now, we'll just log the recommendation
      logger.info(
        `Connection pool optimization: current=${stats.totalConnections}, recommended=${optimalSize}`,
      );

      return {
        type: "connection_pool",
        description: `Recommended pool size: ${optimalSize}`,
        estimatedBenefit: 10,
        actualBenefit: 0,
        duration: 0,
        success: true,
      };
    } catch (error) {
      logger.error("Error optimizing connection pool:", error);
      return {
        type: "connection_pool",
        description: "Failed to optimize connection pool",
        estimatedBenefit: 10,
        actualBenefit: 0,
        duration: 0,
        success: false,
        error: error.message,
      };
    }
  }

  async getDatabaseStats(): Promise<DatabaseStats> {
    if (!this.isInitialized) {
      throw new Error("Database Optimizer not initialized");
    }

    try {
      // Get database size
      const sizeResult = await this.db.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size,
               pg_database_size(current_database()) as size_bytes
      `);

      // Get connection stats
      const connectionResult = await this.db.query(`
        SELECT count(*) as total_connections,
               count(*) FILTER (WHERE state = 'active') as active_connections,
               count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);

      // Get cache hit ratio
      const cacheResult = await this.db.query(`
        SELECT 
          sum(heap_blks_read) as heap_read,
          sum(heap_blks_hit) as heap_hit,
          sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
        FROM pg_statio_user_tables
      `);

      // Get slow query count
      const slowQueryCount = this.slowQueries.length;

      // Get index usage
      const indexResult = await this.db.query(`
        SELECT 
          count(*) as total_indexes,
          count(*) FILTER (WHERE idx_tup_read > 0) as used_indexes
        FROM pg_stat_user_indexes
      `);

      return {
        databaseSize: sizeResult.rows[0].size,
        databaseSizeBytes: sizeResult.rows[0].size_bytes,
        totalConnections: parseInt(connectionResult.rows[0].total_connections),
        activeConnections: parseInt(
          connectionResult.rows[0].active_connections,
        ),
        idleConnections: parseInt(connectionResult.rows[0].idle_connections),
        cacheHitRatio: parseFloat(cacheResult.rows[0].ratio) || 0,
        slowQueryCount,
        totalIndexes: parseInt(indexResult.rows[0].total_indexes),
        usedIndexes: parseInt(indexResult.rows[0].used_indexes),
        indexUsageRatio:
          parseInt(indexResult.rows[0].used_indexes) /
            parseInt(indexResult.rows[0].total_indexes) || 0,
      };
    } catch (error) {
      logger.error("Error getting database stats:", error);
      throw error;
    }
  }

  private async getConnectionPoolStats(): Promise<ConnectionPoolStats> {
    try {
      return {
        totalConnections: this.db.totalCount,
        idleConnections: this.db.idleCount,
        activeConnections: this.db.totalCount - this.db.idleCount,
        waitingClients: this.db.waitingCount,
        maxConnections: this.db.options.max || 10,
      };
    } catch (error) {
      logger.error("Error getting connection pool stats:", error);
      return this.poolStats;
    }
  }

  private async getIndexRecommendations(): Promise<IndexRecommendation[]> {
    try {
      const result = await this.db.query(`
        SELECT * FROM index_recommendations 
        WHERE status = 'pending'
        ORDER BY estimated_benefit DESC
      `);

      return result.rows.map((row) => ({
        tableName: row.table_name,
        columnNames: row.column_names,
        indexType: row.index_type,
        estimatedBenefit: row.estimated_benefit,
        queryPatterns: row.query_patterns,
        status: row.status,
        impactAnalysis: row.impact_analysis,
      }));
    } catch (error) {
      logger.error("Error getting index recommendations:", error);
      return [];
    }
  }

  private async storeIndexRecommendation(
    recommendation: IndexRecommendation,
  ): Promise<void> {
    try {
      await this.db.query(
        `
        INSERT INTO index_recommendations (
          table_name, column_names, index_type, estimated_benefit,
          query_patterns, impact_analysis
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (table_name, column_names) DO UPDATE SET
          estimated_benefit = EXCLUDED.estimated_benefit,
          query_patterns = EXCLUDED.query_patterns,
          impact_analysis = EXCLUDED.impact_analysis
      `,
        [
          recommendation.tableName,
          recommendation.columnNames,
          recommendation.indexType,
          recommendation.estimatedBenefit,
          recommendation.queryPatterns,
          JSON.stringify(recommendation.impactAnalysis),
        ],
      );
    } catch (error) {
      logger.error("Error storing index recommendation:", error);
    }
  }

  private async logQueryPerformance(
    performance: QueryPerformance,
  ): Promise<void> {
    try {
      await this.db.query(
        `
        INSERT INTO query_performance_log (
          query_hash, query_text, execution_time_ms, rows_examined, rows_returned
        ) VALUES ($1, $2, $3, $4, $5)
      `,
        [
          performance.queryHash,
          performance.queryText,
          performance.averageExecutionTime,
          performance.rowsAffected,
          performance.rowsAffected,
        ],
      );
    } catch (error) {
      logger.error("Error logging query performance:", error);
    }
  }

  private hashQuery(query: string): string {
    // Simple hash function for query identification
    const crypto = require("crypto");
    return crypto
      .createHash("md5")
      .update(query.replace(/\s+/g, " ").trim())
      .digest("hex");
  }

  private findSequentialScans(plan: any): any[] {
    const scans: any[] = [];

    function traverse(node: any) {
      if (node["Node Type"] === "Seq Scan") {
        scans.push({
          tableName: node["Relation Name"],
          cost: node["Total Cost"],
          rowsExamined: node["Actual Rows"],
          filterColumns: this.extractFilterColumns(node["Filter"]),
        });
      }

      if (node["Plans"]) {
        node["Plans"].forEach(traverse);
      }
    }

    traverse(plan["Plan"]);
    return scans;
  }

  private extractFilterColumns(filter: string): string[] {
    if (!filter) return [];

    // Simple regex to extract column names from filter conditions
    const matches = filter.match(/\b\w+\b(?=\s*[=<>!])/g);
    return matches || [];
  }

  private calculateIndexBenefit(scan: any): number {
    // Simple benefit calculation based on cost and rows
    return (Math.log(scan.rowsExamined) * scan.cost) / 1000;
  }

  private setupConnectionPoolMonitoring(): void {
    setInterval(async () => {
      try {
        this.poolStats = await this.getConnectionPoolStats();

        // Emit pool stats
        this.emit("pool_stats", this.poolStats);

        // Alert on high connection usage
        const usageRatio =
          this.poolStats.activeConnections / this.poolStats.maxConnections;
        if (usageRatio > 0.8) {
          this.emit("alert", {
            type: "high_connection_usage",
            message: `Connection pool usage is high: ${(usageRatio * 100).toFixed(1)}%`,
            stats: this.poolStats,
          });
        }
      } catch (error) {
        logger.error("Error in connection pool monitoring:", error);
      }
    }, 30000); // Every 30 seconds
  }

  private setupAutomaticOptimization(): void {
    // Run optimization checks every hour
    setInterval(async () => {
      try {
        logger.info("Running automatic optimization checks...");

        // Analyze query performance
        await this.analyzeQueryPerformance();

        // Generate new recommendations
        await this.generateIndexRecommendations();

        // Apply low-risk optimizations automatically
        const stats = await this.getDatabaseStats();

        // Update statistics if cache hit ratio is low
        if (stats.cacheHitRatio < 0.9) {
          await this.updateTableStatistics();
        }
      } catch (error) {
        logger.error("Error in automatic optimization:", error);
      }
    }, 3600000); // Every hour
  }

  async cleanup(): Promise<void> {
    try {
      logger.info("Cleaning up Database Optimizer...");
      // Cleanup any resources if needed
    } catch (error) {
      logger.error("Error during cleanup:", error);
    }
  }
}
