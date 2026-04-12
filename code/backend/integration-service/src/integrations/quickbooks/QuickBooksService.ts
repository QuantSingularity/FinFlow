import { EventEmitter } from "events";
import axios, { AxiosInstance } from "axios";
import crypto from "crypto";
import winston from "winston";
import { Pool } from "pg";
import Redis from "ioredis";

import { logger } from "../../config/logger";
import { getDatabase } from "../../config/database";
import { getRedis } from "../../config/redis";
import { config } from "../../config/config";
import {
  QuickBooksConfig,
  QuickBooksTokens,
  QuickBooksCompany,
  QuickBooksCustomer,
  QuickBooksInvoice,
  QuickBooksPayment,
  QuickBooksItem,
  QuickBooksAccount,
  QuickBooksTransaction,
  QuickBooksSyncResult,
} from "../../types/quickbooks";

export class QuickBooksService extends EventEmitter {
  private db: Pool;
  private redis: Redis;
  private httpClient: AxiosInstance;
  private isInitialized: boolean = false;

  // QuickBooks API configuration
  private readonly baseUrl = "https://sandbox-quickbooks.api.intuit.com"; // Use production URL in production
  private readonly discoveryUrl = "https://appcenter.intuit.com/connect/oauth2";
  private readonly scope = "com.intuit.quickbooks.accounting";

  // Rate limiting
  private readonly rateLimitPerMinute = 500; // QuickBooks allows 500 requests per minute
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  constructor() {
    super();
    this.setupHttpClient();
  }

  async initialize(): Promise<void> {
    try {
      logger.info("Initializing QuickBooks Service...");

      this.db = await getDatabase();
      this.redis = await getRedis();

      // Create QuickBooks integration tables
      await this.createIntegrationTables();

      // Setup event handlers
      this.setupEventHandlers();

      // Start request queue processor
      this.startQueueProcessor();

      this.isInitialized = true;
      logger.info("QuickBooks Service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize QuickBooks Service:", error);
      throw error;
    }
  }

  private setupHttpClient(): void {
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "FinFlow-Integration/1.0",
      },
    });

    // Request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        logger.debug("QuickBooks API Request:", {
          method: config.method,
          url: config.url,
          headers: config.headers,
        });
        return config;
      },
      (error) => {
        logger.error("QuickBooks API Request Error:", error);
        return Promise.reject(error);
      },
    );

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => {
        logger.debug("QuickBooks API Response:", {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        logger.error("QuickBooks API Response Error:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      },
    );
  }

  private async createIntegrationTables(): Promise<void> {
    try {
      // QuickBooks connections table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS quickbooks_connections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          user_id UUID NOT NULL,
          company_id VARCHAR(255) NOT NULL,
          access_token TEXT NOT NULL,
          refresh_token TEXT NOT NULL,
          token_expires_at TIMESTAMP NOT NULL,
          refresh_expires_at TIMESTAMP NOT NULL,
          scope VARCHAR(255),
          company_info JSONB DEFAULT '{}',
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          last_sync_at TIMESTAMP,
          UNIQUE(tenant_id, company_id)
        )
      `);

      // QuickBooks sync log table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS quickbooks_sync_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          connection_id UUID REFERENCES quickbooks_connections(id) ON DELETE CASCADE,
          sync_type VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100) NOT NULL,
          entity_id VARCHAR(255),
          operation VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL,
          error_message TEXT,
          qb_data JSONB,
          local_data JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          processed_at TIMESTAMP
        )
      `);

      // QuickBooks webhook events table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS quickbooks_webhook_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID,
          company_id VARCHAR(255) NOT NULL,
          event_type VARCHAR(100) NOT NULL,
          entity_name VARCHAR(100) NOT NULL,
          entity_id VARCHAR(255) NOT NULL,
          last_updated TIMESTAMP NOT NULL,
          webhook_payload JSONB NOT NULL,
          processed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          processed_at TIMESTAMP
        )
      `);

      // Create indexes
      await this.db.query(`
        CREATE INDEX IF NOT EXISTS idx_quickbooks_connections_tenant_id ON quickbooks_connections(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_quickbooks_connections_company_id ON quickbooks_connections(company_id);
        CREATE INDEX IF NOT EXISTS idx_quickbooks_sync_log_tenant_id ON quickbooks_sync_log(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_quickbooks_sync_log_created_at ON quickbooks_sync_log(created_at);
        CREATE INDEX IF NOT EXISTS idx_quickbooks_webhook_events_company_id ON quickbooks_webhook_events(company_id);
        CREATE INDEX IF NOT EXISTS idx_quickbooks_webhook_events_processed ON quickbooks_webhook_events(processed);
      `);

      logger.info("QuickBooks integration tables created successfully");
    } catch (error) {
      logger.error("Error creating QuickBooks integration tables:", error);
      throw error;
    }
  }

  async getAuthorizationUrl(
    tenantId: string,
    userId: string,
    state?: string,
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error("QuickBooks Service not initialized");
    }

    try {
      const stateParam = state || crypto.randomBytes(16).toString("hex");

      // Store state in Redis for verification
      await this.redis.setex(
        `qb:oauth:state:${stateParam}`,
        600,
        JSON.stringify({
          tenantId,
          userId,
          timestamp: Date.now(),
        }),
      );

      const params = new URLSearchParams({
        client_id: config.quickbooks.clientId,
        scope: this.scope,
        redirect_uri: config.quickbooks.redirectUri,
        response_type: "code",
        access_type: "offline",
        state: stateParam,
      });

      const authUrl = `${this.discoveryUrl}?${params.toString()}`;

      logger.info(
        `Generated QuickBooks authorization URL for tenant ${tenantId}`,
      );
      return authUrl;
    } catch (error) {
      logger.error("Error generating QuickBooks authorization URL:", error);
      throw error;
    }
  }

  async handleOAuthCallback(
    code: string,
    state: string,
    realmId: string,
  ): Promise<any> {
    if (!this.isInitialized) {
      throw new Error("QuickBooks Service not initialized");
    }

    try {
      // Verify state parameter
      const stateData = await this.redis.get(`qb:oauth:state:${state}`);
      if (!stateData) {
        throw new Error("Invalid or expired state parameter");
      }

      const { tenantId, userId } = JSON.parse(stateData);

      // Exchange authorization code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(code);

      // Get company information
      const companyInfo = await this.getCompanyInfo(
        tokenResponse.access_token,
        realmId,
      );

      // Store connection in database
      const connection = await this.storeConnection(
        tenantId,
        userId,
        realmId,
        tokenResponse,
        companyInfo,
      );

      // Clean up state
      await this.redis.del(`qb:oauth:state:${state}`);

      // Emit connection established event
      this.emit("connection:established", {
        tenantId,
        userId,
        companyId: realmId,
        connection,
      });

      logger.info(
        `QuickBooks connection established for tenant ${tenantId}, company ${realmId}`,
      );

      return {
        success: true,
        connectionId: connection.id,
        companyName: companyInfo.Name,
      };
    } catch (error) {
      logger.error("Error handling QuickBooks OAuth callback:", error);
      throw error;
    }
  }

  private async exchangeCodeForTokens(code: string): Promise<QuickBooksTokens> {
    try {
      const response = await axios.post(
        "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
        new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: config.quickbooks.redirectUri,
        }),
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${config.quickbooks.clientId}:${config.quickbooks.clientSecret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        token_type: response.data.token_type,
        expires_in: response.data.expires_in,
        refresh_token_expires_in: response.data.refresh_token_expires_in,
        scope: response.data.scope,
      };
    } catch (error) {
      logger.error("Error exchanging code for tokens:", error);
      throw new Error("Failed to exchange authorization code for tokens");
    }
  }

  private async getCompanyInfo(
    accessToken: string,
    companyId: string,
  ): Promise<QuickBooksCompany> {
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}/v3/company/${companyId}/companyinfo/${companyId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data.QueryResponse.CompanyInfo[0];
    } catch (error) {
      logger.error("Error getting company info:", error);
      throw new Error("Failed to get company information");
    }
  }

  private async storeConnection(
    tenantId: string,
    userId: string,
    companyId: string,
    tokens: QuickBooksTokens,
    companyInfo: QuickBooksCompany,
  ): Promise<any> {
    try {
      const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      const refreshExpiresAt = new Date(
        Date.now() + tokens.refresh_token_expires_in * 1000,
      );

      const result = await this.db.query(
        `
        INSERT INTO quickbooks_connections (
          tenant_id, user_id, company_id, access_token, refresh_token,
          token_expires_at, refresh_expires_at, scope, company_info
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (tenant_id, company_id) 
        DO UPDATE SET
          user_id = EXCLUDED.user_id,
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          token_expires_at = EXCLUDED.token_expires_at,
          refresh_expires_at = EXCLUDED.refresh_expires_at,
          scope = EXCLUDED.scope,
          company_info = EXCLUDED.company_info,
          updated_at = NOW(),
          status = 'active'
        RETURNING *
      `,
        [
          tenantId,
          userId,
          companyId,
          tokens.access_token,
          tokens.refresh_token,
          tokenExpiresAt,
          refreshExpiresAt,
          tokens.scope,
          JSON.stringify(companyInfo),
        ],
      );

      return result.rows[0];
    } catch (error) {
      logger.error("Error storing QuickBooks connection:", error);
      throw error;
    }
  }

  async refreshAccessToken(connectionId: string): Promise<QuickBooksTokens> {
    if (!this.isInitialized) {
      throw new Error("QuickBooks Service not initialized");
    }

    try {
      // Get connection details
      const connectionResult = await this.db.query(
        "SELECT * FROM quickbooks_connections WHERE id = $1",
        [connectionId],
      );

      if (connectionResult.rows.length === 0) {
        throw new Error("QuickBooks connection not found");
      }

      const connection = connectionResult.rows[0];

      // Check if refresh token is still valid
      if (new Date() > new Date(connection.refresh_expires_at)) {
        throw new Error(
          "Refresh token has expired. Re-authorization required.",
        );
      }

      // Refresh the access token
      const response = await axios.post(
        "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: connection.refresh_token,
        }),
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${config.quickbooks.clientId}:${config.quickbooks.clientSecret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      const tokens: QuickBooksTokens = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || connection.refresh_token,
        token_type: response.data.token_type,
        expires_in: response.data.expires_in,
        refresh_token_expires_in:
          response.data.refresh_token_expires_in || 8726400, // 101 days default
        scope: response.data.scope,
      };

      // Update stored tokens
      const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      const refreshExpiresAt = new Date(
        Date.now() + tokens.refresh_token_expires_in * 1000,
      );

      await this.db.query(
        `
        UPDATE quickbooks_connections 
        SET access_token = $1, refresh_token = $2, token_expires_at = $3, 
            refresh_expires_at = $4, updated_at = NOW()
        WHERE id = $5
      `,
        [
          tokens.access_token,
          tokens.refresh_token,
          tokenExpiresAt,
          refreshExpiresAt,
          connectionId,
        ],
      );

      logger.info(
        `Refreshed QuickBooks access token for connection ${connectionId}`,
      );
      return tokens;
    } catch (error) {
      logger.error("Error refreshing QuickBooks access token:", error);
      throw error;
    }
  }

  async getValidAccessToken(connectionId: string): Promise<string> {
    try {
      const connectionResult = await this.db.query(
        "SELECT * FROM quickbooks_connections WHERE id = $1 AND status = $2",
        [connectionId, "active"],
      );

      if (connectionResult.rows.length === 0) {
        throw new Error("QuickBooks connection not found or inactive");
      }

      const connection = connectionResult.rows[0];

      // Check if access token is still valid (with 5 minute buffer)
      const expiresAt = new Date(connection.token_expires_at);
      const now = new Date();
      const bufferTime = 5 * 60 * 1000; // 5 minutes

      if (now.getTime() + bufferTime >= expiresAt.getTime()) {
        // Token is expired or about to expire, refresh it
        const newTokens = await this.refreshAccessToken(connectionId);
        return newTokens.access_token;
      }

      return connection.access_token;
    } catch (error) {
      logger.error("Error getting valid access token:", error);
      throw error;
    }
  }

  async syncCustomers(
    tenantId: string,
    connectionId: string,
  ): Promise<QuickBooksSyncResult> {
    return this.queueRequest(async () => {
      try {
        const accessToken = await this.getValidAccessToken(connectionId);
        const connection = await this.getConnection(connectionId);

        // Get customers from QuickBooks
        const response = await this.httpClient.get(
          `${this.baseUrl}/v3/company/${connection.company_id}/query`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { query: "SELECT * FROM Customer MAXRESULTS 1000" },
          },
        );

        const customers = response.data.QueryResponse?.Customer || [];
        const syncResult: QuickBooksSyncResult = {
          entityType: "customers",
          totalRecords: customers.length,
          successCount: 0,
          errorCount: 0,
          errors: [],
        };

        // Process each customer
        for (const customer of customers) {
          try {
            await this.processCustomer(tenantId, connectionId, customer);
            syncResult.successCount++;
          } catch (error) {
            syncResult.errorCount++;
            syncResult.errors.push({
              entityId: customer.Id,
              error: error.message,
            });
            logger.error(`Error processing customer ${customer.Id}:`, error);
          }
        }

        // Update last sync time
        await this.updateLastSyncTime(connectionId);

        logger.info(
          `Synced ${syncResult.successCount} customers for tenant ${tenantId}`,
        );
        return syncResult;
      } catch (error) {
        logger.error("Error syncing customers:", error);
        throw error;
      }
    });
  }

  async syncInvoices(
    tenantId: string,
    connectionId: string,
  ): Promise<QuickBooksSyncResult> {
    return this.queueRequest(async () => {
      try {
        const accessToken = await this.getValidAccessToken(connectionId);
        const connection = await this.getConnection(connectionId);

        // Get invoices from QuickBooks
        const response = await this.httpClient.get(
          `${this.baseUrl}/v3/company/${connection.company_id}/query`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { query: "SELECT * FROM Invoice MAXRESULTS 1000" },
          },
        );

        const invoices = response.data.QueryResponse?.Invoice || [];
        const syncResult: QuickBooksSyncResult = {
          entityType: "invoices",
          totalRecords: invoices.length,
          successCount: 0,
          errorCount: 0,
          errors: [],
        };

        // Process each invoice
        for (const invoice of invoices) {
          try {
            await this.processInvoice(tenantId, connectionId, invoice);
            syncResult.successCount++;
          } catch (error) {
            syncResult.errorCount++;
            syncResult.errors.push({
              entityId: invoice.Id,
              error: error.message,
            });
            logger.error(`Error processing invoice ${invoice.Id}:`, error);
          }
        }

        // Update last sync time
        await this.updateLastSyncTime(connectionId);

        logger.info(
          `Synced ${syncResult.successCount} invoices for tenant ${tenantId}`,
        );
        return syncResult;
      } catch (error) {
        logger.error("Error syncing invoices:", error);
        throw error;
      }
    });
  }

  async syncPayments(
    tenantId: string,
    connectionId: string,
  ): Promise<QuickBooksSyncResult> {
    return this.queueRequest(async () => {
      try {
        const accessToken = await this.getValidAccessToken(connectionId);
        const connection = await this.getConnection(connectionId);

        // Get payments from QuickBooks
        const response = await this.httpClient.get(
          `${this.baseUrl}/v3/company/${connection.company_id}/query`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { query: "SELECT * FROM Payment MAXRESULTS 1000" },
          },
        );

        const payments = response.data.QueryResponse?.Payment || [];
        const syncResult: QuickBooksSyncResult = {
          entityType: "payments",
          totalRecords: payments.length,
          successCount: 0,
          errorCount: 0,
          errors: [],
        };

        // Process each payment
        for (const payment of payments) {
          try {
            await this.processPayment(tenantId, connectionId, payment);
            syncResult.successCount++;
          } catch (error) {
            syncResult.errorCount++;
            syncResult.errors.push({
              entityId: payment.Id,
              error: error.message,
            });
            logger.error(`Error processing payment ${payment.Id}:`, error);
          }
        }

        // Update last sync time
        await this.updateLastSyncTime(connectionId);

        logger.info(
          `Synced ${syncResult.successCount} payments for tenant ${tenantId}`,
        );
        return syncResult;
      } catch (error) {
        logger.error("Error syncing payments:", error);
        throw error;
      }
    });
  }

  private async processCustomer(
    tenantId: string,
    connectionId: string,
    customer: QuickBooksCustomer,
  ): Promise<void> {
    try {
      // Transform QuickBooks customer to local format
      const localCustomer = {
        external_id: customer.Id,
        external_source: "quickbooks",
        name: customer.Name,
        company_name: customer.CompanyName,
        email: customer.PrimaryEmailAddr?.Address,
        phone: customer.PrimaryPhone?.FreeFormNumber,
        billing_address: customer.BillAddr
          ? {
              line1: customer.BillAddr.Line1,
              city: customer.BillAddr.City,
              state: customer.BillAddr.CountrySubDivisionCode,
              postal_code: customer.BillAddr.PostalCode,
              country: customer.BillAddr.Country,
            }
          : null,
        balance: customer.Balance || 0,
        active: customer.Active,
        tenant_id: tenantId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Store or update in local database
      await this.db.query(
        `
        INSERT INTO customers (
          tenant_id, external_id, external_source, name, company_name,
          email, phone, billing_address, balance, active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (tenant_id, external_id, external_source)
        DO UPDATE SET
          name = EXCLUDED.name,
          company_name = EXCLUDED.company_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          billing_address = EXCLUDED.billing_address,
          balance = EXCLUDED.balance,
          active = EXCLUDED.active,
          updated_at = EXCLUDED.updated_at
      `,
        [
          localCustomer.tenant_id,
          localCustomer.external_id,
          localCustomer.external_source,
          localCustomer.name,
          localCustomer.company_name,
          localCustomer.email,
          localCustomer.phone,
          JSON.stringify(localCustomer.billing_address),
          localCustomer.balance,
          localCustomer.active,
          localCustomer.created_at,
          localCustomer.updated_at,
        ],
      );

      // Log sync operation
      await this.logSyncOperation(
        tenantId,
        connectionId,
        "sync",
        "customer",
        customer.Id,
        "success",
        customer,
        localCustomer,
      );
    } catch (error) {
      await this.logSyncOperation(
        tenantId,
        connectionId,
        "sync",
        "customer",
        customer.Id,
        "error",
        customer,
        null,
        error.message,
      );
      throw error;
    }
  }

  private async processInvoice(
    tenantId: string,
    connectionId: string,
    invoice: QuickBooksInvoice,
  ): Promise<void> {
    try {
      // Transform QuickBooks invoice to local format
      const localInvoice = {
        external_id: invoice.Id,
        external_source: "quickbooks",
        customer_external_id: invoice.CustomerRef?.value,
        invoice_number: invoice.DocNumber,
        total_amount: invoice.TotalAmt || 0,
        balance: invoice.Balance || 0,
        due_date: invoice.DueDate ? new Date(invoice.DueDate) : null,
        invoice_date: invoice.TxnDate ? new Date(invoice.TxnDate) : new Date(),
        status: this.mapInvoiceStatus(invoice),
        line_items:
          invoice.Line?.map((line) => ({
            description: line.Description,
            quantity: line.SalesItemLineDetail?.Qty || 1,
            unit_price: line.SalesItemLineDetail?.UnitPrice || 0,
            amount: line.Amount || 0,
          })) || [],
        tenant_id: tenantId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Store or update in local database
      await this.db.query(
        `
        INSERT INTO invoices (
          tenant_id, external_id, external_source, customer_external_id,
          invoice_number, total_amount, balance, due_date, invoice_date,
          status, line_items, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (tenant_id, external_id, external_source)
        DO UPDATE SET
          customer_external_id = EXCLUDED.customer_external_id,
          invoice_number = EXCLUDED.invoice_number,
          total_amount = EXCLUDED.total_amount,
          balance = EXCLUDED.balance,
          due_date = EXCLUDED.due_date,
          invoice_date = EXCLUDED.invoice_date,
          status = EXCLUDED.status,
          line_items = EXCLUDED.line_items,
          updated_at = EXCLUDED.updated_at
      `,
        [
          localInvoice.tenant_id,
          localInvoice.external_id,
          localInvoice.external_source,
          localInvoice.customer_external_id,
          localInvoice.invoice_number,
          localInvoice.total_amount,
          localInvoice.balance,
          localInvoice.due_date,
          localInvoice.invoice_date,
          localInvoice.status,
          JSON.stringify(localInvoice.line_items),
          localInvoice.created_at,
          localInvoice.updated_at,
        ],
      );

      // Log sync operation
      await this.logSyncOperation(
        tenantId,
        connectionId,
        "sync",
        "invoice",
        invoice.Id,
        "success",
        invoice,
        localInvoice,
      );
    } catch (error) {
      await this.logSyncOperation(
        tenantId,
        connectionId,
        "sync",
        "invoice",
        invoice.Id,
        "error",
        invoice,
        null,
        error.message,
      );
      throw error;
    }
  }

  private async processPayment(
    tenantId: string,
    connectionId: string,
    payment: QuickBooksPayment,
  ): Promise<void> {
    try {
      // Transform QuickBooks payment to local format
      const localPayment = {
        external_id: payment.Id,
        external_source: "quickbooks",
        customer_external_id: payment.CustomerRef?.value,
        total_amount: payment.TotalAmt || 0,
        payment_date: payment.TxnDate ? new Date(payment.TxnDate) : new Date(),
        payment_method: payment.PaymentMethodRef?.name || "Unknown",
        reference_number: payment.PaymentRefNum,
        tenant_id: tenantId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Store or update in local database
      await this.db.query(
        `
        INSERT INTO payments (
          tenant_id, external_id, external_source, customer_external_id,
          total_amount, payment_date, payment_method, reference_number,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (tenant_id, external_id, external_source)
        DO UPDATE SET
          customer_external_id = EXCLUDED.customer_external_id,
          total_amount = EXCLUDED.total_amount,
          payment_date = EXCLUDED.payment_date,
          payment_method = EXCLUDED.payment_method,
          reference_number = EXCLUDED.reference_number,
          updated_at = EXCLUDED.updated_at
      `,
        [
          localPayment.tenant_id,
          localPayment.external_id,
          localPayment.external_source,
          localPayment.customer_external_id,
          localPayment.total_amount,
          localPayment.payment_date,
          localPayment.payment_method,
          localPayment.reference_number,
          localPayment.created_at,
          localPayment.updated_at,
        ],
      );

      // Log sync operation
      await this.logSyncOperation(
        tenantId,
        connectionId,
        "sync",
        "payment",
        payment.Id,
        "success",
        payment,
        localPayment,
      );
    } catch (error) {
      await this.logSyncOperation(
        tenantId,
        connectionId,
        "sync",
        "payment",
        payment.Id,
        "error",
        payment,
        null,
        error.message,
      );
      throw error;
    }
  }

  private mapInvoiceStatus(invoice: QuickBooksInvoice): string {
    if (invoice.Balance === 0) return "paid";
    if (invoice.Balance === invoice.TotalAmt) return "open";
    return "partial";
  }

  private async getConnection(connectionId: string): Promise<any> {
    const result = await this.db.query(
      "SELECT * FROM quickbooks_connections WHERE id = $1",
      [connectionId],
    );

    if (result.rows.length === 0) {
      throw new Error("QuickBooks connection not found");
    }

    return result.rows[0];
  }

  private async updateLastSyncTime(connectionId: string): Promise<void> {
    await this.db.query(
      "UPDATE quickbooks_connections SET last_sync_at = NOW() WHERE id = $1",
      [connectionId],
    );
  }

  private async logSyncOperation(
    tenantId: string,
    connectionId: string,
    syncType: string,
    entityType: string,
    entityId: string,
    status: string,
    qbData: any,
    localData: any,
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.db.query(
        `
        INSERT INTO quickbooks_sync_log (
          tenant_id, connection_id, sync_type, entity_type, entity_id,
          operation, status, error_message, qb_data, local_data, processed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      `,
        [
          tenantId,
          connectionId,
          syncType,
          entityType,
          entityId,
          "sync",
          status,
          errorMessage,
          JSON.stringify(qbData),
          JSON.stringify(localData),
        ],
      );
    } catch (error) {
      logger.error("Error logging sync operation:", error);
    }
  }

  private async queueRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          logger.error("Error processing queued request:", error);
        }

        // Rate limiting: wait between requests
        await new Promise((resolve) => setTimeout(resolve, 120)); // ~500 requests per minute
      }
    }

    this.isProcessingQueue = false;
  }

  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.isProcessingQueue && this.requestQueue.length > 0) {
        this.processQueue();
      }
    }, 1000);
  }

  private setupEventHandlers(): void {
    this.on("connection:established", async (data) => {
      logger.info(`QuickBooks connection established: ${data.companyId}`);
      // Trigger initial sync
      try {
        await this.syncCustomers(data.tenantId, data.connection.id);
        await this.syncInvoices(data.tenantId, data.connection.id);
        await this.syncPayments(data.tenantId, data.connection.id);
      } catch (error) {
        logger.error("Error during initial sync:", error);
      }
    });
  }

  async cleanup(): Promise<void> {
    try {
      logger.info("Cleaning up QuickBooks Service...");
      // Cleanup any resources if needed
    } catch (error) {
      logger.error("Error during cleanup:", error);
    }
  }
}
