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
  XeroConfig,
  XeroTokens,
  XeroOrganisation,
  XeroContact,
  XeroInvoice,
  XeroPayment,
  XeroAccount,
  XeroTransaction,
  XeroSyncResult,
} from "../../types/xero";

export class XeroService extends EventEmitter {
  private db: Pool;
  private redis: Redis;
  private httpClient: AxiosInstance;
  private isInitialized: boolean = false;

  // Xero API configuration
  private readonly baseUrl = "https://api.xero.com/api.xro/2.0";
  private readonly authUrl =
    "https://login.xero.com/identity/connect/authorize";
  private readonly tokenUrl = "https://identity.xero.com/connect/token";
  private readonly scope =
    "accounting.transactions accounting.contacts accounting.settings offline_access";

  // Rate limiting
  private readonly rateLimitPerMinute = 60; // Xero allows 60 requests per minute
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  constructor() {
    super();
    this.setupHttpClient();
  }

  async initialize(): Promise<void> {
    try {
      logger.info("Initializing Xero Service...");

      this.db = await getDatabase();
      this.redis = await getRedis();

      // Create Xero integration tables
      await this.createIntegrationTables();

      // Setup event handlers
      this.setupEventHandlers();

      // Start request queue processor
      this.startQueueProcessor();

      this.isInitialized = true;
      logger.info("Xero Service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Xero Service:", error);
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
        logger.debug("Xero API Request:", {
          method: config.method,
          url: config.url,
          headers: config.headers,
        });
        return config;
      },
      (error) => {
        logger.error("Xero API Request Error:", error);
        return Promise.reject(error);
      },
    );

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => {
        logger.debug("Xero API Response:", {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        logger.error("Xero API Response Error:", {
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
      // Xero connections table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS xero_connections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          user_id UUID NOT NULL,
          xero_tenant_id VARCHAR(255) NOT NULL,
          access_token TEXT NOT NULL,
          refresh_token TEXT NOT NULL,
          token_expires_at TIMESTAMP NOT NULL,
          refresh_expires_at TIMESTAMP NOT NULL,
          scope VARCHAR(255),
          organisation_info JSONB DEFAULT '{}',
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          last_sync_at TIMESTAMP,
          UNIQUE(tenant_id, xero_tenant_id)
        )
      `);

      // Xero sync log table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS xero_sync_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          connection_id UUID REFERENCES xero_connections(id) ON DELETE CASCADE,
          sync_type VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100) NOT NULL,
          entity_id VARCHAR(255),
          operation VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL,
          error_message TEXT,
          xero_data JSONB,
          local_data JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          processed_at TIMESTAMP
        )
      `);

      // Xero webhook events table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS xero_webhook_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID,
          xero_tenant_id VARCHAR(255) NOT NULL,
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
        CREATE INDEX IF NOT EXISTS idx_xero_connections_tenant_id ON xero_connections(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_xero_connections_xero_tenant_id ON xero_connections(xero_tenant_id);
        CREATE INDEX IF NOT EXISTS idx_xero_sync_log_tenant_id ON xero_sync_log(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_xero_sync_log_created_at ON xero_sync_log(created_at);
        CREATE INDEX IF NOT EXISTS idx_xero_webhook_events_xero_tenant_id ON xero_webhook_events(xero_tenant_id);
        CREATE INDEX IF NOT EXISTS idx_xero_webhook_events_processed ON xero_webhook_events(processed);
      `);

      logger.info("Xero integration tables created successfully");
    } catch (error) {
      logger.error("Error creating Xero integration tables:", error);
      throw error;
    }
  }

  async getAuthorizationUrl(
    tenantId: string,
    userId: string,
    state?: string,
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error("Xero Service not initialized");
    }

    try {
      const stateParam = state || crypto.randomBytes(16).toString("hex");

      // Store state in Redis for verification
      await this.redis.setex(
        `xero:oauth:state:${stateParam}`,
        600,
        JSON.stringify({
          tenantId,
          userId,
          timestamp: Date.now(),
        }),
      );

      const params = new URLSearchParams({
        response_type: "code",
        client_id: config.xero.clientId,
        redirect_uri: config.xero.redirectUri,
        scope: this.scope,
        state: stateParam,
      });

      const authUrl = `${this.authUrl}?${params.toString()}`;

      logger.info(`Generated Xero authorization URL for tenant ${tenantId}`);
      return authUrl;
    } catch (error) {
      logger.error("Error generating Xero authorization URL:", error);
      throw error;
    }
  }

  async handleOAuthCallback(code: string, state: string): Promise<any> {
    if (!this.isInitialized) {
      throw new Error("Xero Service not initialized");
    }

    try {
      // Verify state parameter
      const stateData = await this.redis.get(`xero:oauth:state:${state}`);
      if (!stateData) {
        throw new Error("Invalid or expired state parameter");
      }

      const { tenantId, userId } = JSON.parse(stateData);

      // Exchange authorization code for tokens
      const tokenResponse = await this.exchangeCodeForTokens(code);

      // Get tenant connections (organizations)
      const tenantConnections = await this.getTenantConnections(
        tokenResponse.access_token,
      );

      // Store connections in database
      const connections = [];
      for (const tenant of tenantConnections) {
        const connection = await this.storeConnection(
          tenantId,
          userId,
          tenant.tenantId,
          tokenResponse,
          tenant,
        );
        connections.push(connection);
      }

      // Clean up state
      await this.redis.del(`xero:oauth:state:${state}`);

      // Emit connection established event
      this.emit("connection:established", {
        tenantId,
        userId,
        connections,
      });

      logger.info(`Xero connections established for tenant ${tenantId}`);

      return {
        success: true,
        connections: connections.map((conn) => ({
          connectionId: conn.id,
          organisationName: conn.organisation_info.Name,
        })),
      };
    } catch (error) {
      logger.error("Error handling Xero OAuth callback:", error);
      throw error;
    }
  }

  private async exchangeCodeForTokens(code: string): Promise<XeroTokens> {
    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: config.xero.redirectUri,
        }),
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${config.xero.clientId}:${config.xero.clientSecret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        token_type: response.data.token_type,
        expires_in: response.data.expires_in,
        scope: response.data.scope,
      };
    } catch (error) {
      logger.error("Error exchanging code for tokens:", error);
      throw new Error("Failed to exchange authorization code for tokens");
    }
  }

  private async getTenantConnections(accessToken: string): Promise<any[]> {
    try {
      const response = await axios.get("https://api.xero.com/connections", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      logger.error("Error getting tenant connections:", error);
      throw new Error("Failed to get tenant connections");
    }
  }

  private async storeConnection(
    tenantId: string,
    userId: string,
    xeroTenantId: string,
    tokens: XeroTokens,
    organisationInfo: any,
  ): Promise<any> {
    try {
      const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      const refreshExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

      const result = await this.db.query(
        `
        INSERT INTO xero_connections (
          tenant_id, user_id, xero_tenant_id, access_token, refresh_token,
          token_expires_at, refresh_expires_at, scope, organisation_info
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (tenant_id, xero_tenant_id) 
        DO UPDATE SET
          user_id = EXCLUDED.user_id,
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          token_expires_at = EXCLUDED.token_expires_at,
          refresh_expires_at = EXCLUDED.refresh_expires_at,
          scope = EXCLUDED.scope,
          organisation_info = EXCLUDED.organisation_info,
          updated_at = NOW(),
          status = 'active'
        RETURNING *
      `,
        [
          tenantId,
          userId,
          xeroTenantId,
          tokens.access_token,
          tokens.refresh_token,
          tokenExpiresAt,
          refreshExpiresAt,
          tokens.scope,
          JSON.stringify(organisationInfo),
        ],
      );

      return result.rows[0];
    } catch (error) {
      logger.error("Error storing Xero connection:", error);
      throw error;
    }
  }

  async refreshAccessToken(connectionId: string): Promise<XeroTokens> {
    if (!this.isInitialized) {
      throw new Error("Xero Service not initialized");
    }

    try {
      // Get connection details
      const connectionResult = await this.db.query(
        "SELECT * FROM xero_connections WHERE id = $1",
        [connectionId],
      );

      if (connectionResult.rows.length === 0) {
        throw new Error("Xero connection not found");
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
        this.tokenUrl,
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: connection.refresh_token,
        }),
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${config.xero.clientId}:${config.xero.clientSecret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      const tokens: XeroTokens = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || connection.refresh_token,
        token_type: response.data.token_type,
        expires_in: response.data.expires_in,
        scope: response.data.scope,
      };

      // Update stored tokens
      const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      const refreshExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

      await this.db.query(
        `
        UPDATE xero_connections 
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

      logger.info(`Refreshed Xero access token for connection ${connectionId}`);
      return tokens;
    } catch (error) {
      logger.error("Error refreshing Xero access token:", error);
      throw error;
    }
  }

  async getValidAccessToken(connectionId: string): Promise<string> {
    try {
      const connectionResult = await this.db.query(
        "SELECT * FROM xero_connections WHERE id = $1 AND status = $2",
        [connectionId, "active"],
      );

      if (connectionResult.rows.length === 0) {
        throw new Error("Xero connection not found or inactive");
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

  async syncContacts(
    tenantId: string,
    connectionId: string,
  ): Promise<XeroSyncResult> {
    return this.queueRequest(async () => {
      try {
        const accessToken = await this.getValidAccessToken(connectionId);
        const connection = await this.getConnection(connectionId);

        // Get contacts from Xero
        const response = await this.httpClient.get(`${this.baseUrl}/Contacts`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Xero-tenant-id": connection.xero_tenant_id,
          },
        });

        const contacts = response.data.Contacts || [];
        const syncResult: XeroSyncResult = {
          entityType: "contacts",
          totalRecords: contacts.length,
          successCount: 0,
          errorCount: 0,
          errors: [],
        };

        // Process each contact
        for (const contact of contacts) {
          try {
            await this.processContact(tenantId, connectionId, contact);
            syncResult.successCount++;
          } catch (error) {
            syncResult.errorCount++;
            syncResult.errors.push({
              entityId: contact.ContactID,
              error: error.message,
            });
            logger.error(
              `Error processing contact ${contact.ContactID}:`,
              error,
            );
          }
        }

        // Update last sync time
        await this.updateLastSyncTime(connectionId);

        logger.info(
          `Synced ${syncResult.successCount} contacts for tenant ${tenantId}`,
        );
        return syncResult;
      } catch (error) {
        logger.error("Error syncing contacts:", error);
        throw error;
      }
    });
  }

  async syncInvoices(
    tenantId: string,
    connectionId: string,
  ): Promise<XeroSyncResult> {
    return this.queueRequest(async () => {
      try {
        const accessToken = await this.getValidAccessToken(connectionId);
        const connection = await this.getConnection(connectionId);

        // Get invoices from Xero
        const response = await this.httpClient.get(`${this.baseUrl}/Invoices`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Xero-tenant-id": connection.xero_tenant_id,
          },
        });

        const invoices = response.data.Invoices || [];
        const syncResult: XeroSyncResult = {
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
              entityId: invoice.InvoiceID,
              error: error.message,
            });
            logger.error(
              `Error processing invoice ${invoice.InvoiceID}:`,
              error,
            );
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
  ): Promise<XeroSyncResult> {
    return this.queueRequest(async () => {
      try {
        const accessToken = await this.getValidAccessToken(connectionId);
        const connection = await this.getConnection(connectionId);

        // Get payments from Xero
        const response = await this.httpClient.get(`${this.baseUrl}/Payments`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Xero-tenant-id": connection.xero_tenant_id,
          },
        });

        const payments = response.data.Payments || [];
        const syncResult: XeroSyncResult = {
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
              entityId: payment.PaymentID,
              error: error.message,
            });
            logger.error(
              `Error processing payment ${payment.PaymentID}:`,
              error,
            );
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

  private async processContact(
    tenantId: string,
    connectionId: string,
    contact: XeroContact,
  ): Promise<void> {
    try {
      // Transform Xero contact to local format
      const localContact = {
        external_id: contact.ContactID,
        external_source: "xero",
        name: contact.Name,
        first_name: contact.FirstName,
        last_name: contact.LastName,
        email: contact.EmailAddress,
        phone: contact.Phones?.[0]?.PhoneNumber,
        billing_address: contact.Addresses?.find(
          (addr) => addr.AddressType === "POBOX",
        )
          ? {
              line1: contact.Addresses.find(
                (addr) => addr.AddressType === "POBOX",
              )?.AddressLine1,
              line2: contact.Addresses.find(
                (addr) => addr.AddressType === "POBOX",
              )?.AddressLine2,
              city: contact.Addresses.find(
                (addr) => addr.AddressType === "POBOX",
              )?.City,
              state: contact.Addresses.find(
                (addr) => addr.AddressType === "POBOX",
              )?.Region,
              postal_code: contact.Addresses.find(
                (addr) => addr.AddressType === "POBOX",
              )?.PostalCode,
              country: contact.Addresses.find(
                (addr) => addr.AddressType === "POBOX",
              )?.Country,
            }
          : null,
        contact_status: contact.ContactStatus,
        is_supplier: contact.IsSupplier,
        is_customer: contact.IsCustomer,
        tenant_id: tenantId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Store or update in local database
      await this.db.query(
        `
        INSERT INTO customers (
          tenant_id, external_id, external_source, name, first_name, last_name,
          email, phone, billing_address, contact_status, is_supplier, is_customer,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (tenant_id, external_id, external_source)
        DO UPDATE SET
          name = EXCLUDED.name,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          billing_address = EXCLUDED.billing_address,
          contact_status = EXCLUDED.contact_status,
          is_supplier = EXCLUDED.is_supplier,
          is_customer = EXCLUDED.is_customer,
          updated_at = EXCLUDED.updated_at
      `,
        [
          localContact.tenant_id,
          localContact.external_id,
          localContact.external_source,
          localContact.name,
          localContact.first_name,
          localContact.last_name,
          localContact.email,
          localContact.phone,
          JSON.stringify(localContact.billing_address),
          localContact.contact_status,
          localContact.is_supplier,
          localContact.is_customer,
          localContact.created_at,
          localContact.updated_at,
        ],
      );

      // Log sync operation
      await this.logSyncOperation(
        tenantId,
        connectionId,
        "sync",
        "contact",
        contact.ContactID,
        "success",
        contact,
        localContact,
      );
    } catch (error) {
      await this.logSyncOperation(
        tenantId,
        connectionId,
        "sync",
        "contact",
        contact.ContactID,
        "error",
        contact,
        null,
        error.message,
      );
      throw error;
    }
  }

  private async processInvoice(
    tenantId: string,
    connectionId: string,
    invoice: XeroInvoice,
  ): Promise<void> {
    try {
      // Transform Xero invoice to local format
      const localInvoice = {
        external_id: invoice.InvoiceID,
        external_source: "xero",
        customer_external_id: invoice.Contact?.ContactID,
        invoice_number: invoice.InvoiceNumber,
        total_amount: invoice.Total || 0,
        amount_due: invoice.AmountDue || 0,
        amount_paid: invoice.AmountPaid || 0,
        due_date: invoice.DueDate ? new Date(invoice.DueDate) : null,
        invoice_date: invoice.Date ? new Date(invoice.Date) : new Date(),
        status: invoice.Status?.toLowerCase() || "draft",
        line_items:
          invoice.LineItems?.map((line) => ({
            description: line.Description,
            quantity: line.Quantity || 1,
            unit_amount: line.UnitAmount || 0,
            line_amount: line.LineAmount || 0,
            account_code: line.AccountCode,
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
          invoice_number, total_amount, amount_due, amount_paid, due_date, 
          invoice_date, status, line_items, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (tenant_id, external_id, external_source)
        DO UPDATE SET
          customer_external_id = EXCLUDED.customer_external_id,
          invoice_number = EXCLUDED.invoice_number,
          total_amount = EXCLUDED.total_amount,
          amount_due = EXCLUDED.amount_due,
          amount_paid = EXCLUDED.amount_paid,
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
          localInvoice.amount_due,
          localInvoice.amount_paid,
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
        invoice.InvoiceID,
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
        invoice.InvoiceID,
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
    payment: XeroPayment,
  ): Promise<void> {
    try {
      // Transform Xero payment to local format
      const localPayment = {
        external_id: payment.PaymentID,
        external_source: "xero",
        invoice_external_id: payment.Invoice?.InvoiceID,
        amount: payment.Amount || 0,
        payment_date: payment.Date ? new Date(payment.Date) : new Date(),
        payment_type: payment.PaymentType || "Unknown",
        status: payment.Status?.toLowerCase() || "authorised",
        reference: payment.Reference,
        tenant_id: tenantId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Store or update in local database
      await this.db.query(
        `
        INSERT INTO payments (
          tenant_id, external_id, external_source, invoice_external_id,
          amount, payment_date, payment_type, status, reference,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (tenant_id, external_id, external_source)
        DO UPDATE SET
          invoice_external_id = EXCLUDED.invoice_external_id,
          amount = EXCLUDED.amount,
          payment_date = EXCLUDED.payment_date,
          payment_type = EXCLUDED.payment_type,
          status = EXCLUDED.status,
          reference = EXCLUDED.reference,
          updated_at = EXCLUDED.updated_at
      `,
        [
          localPayment.tenant_id,
          localPayment.external_id,
          localPayment.external_source,
          localPayment.invoice_external_id,
          localPayment.amount,
          localPayment.payment_date,
          localPayment.payment_type,
          localPayment.status,
          localPayment.reference,
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
        payment.PaymentID,
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
        payment.PaymentID,
        "error",
        payment,
        null,
        error.message,
      );
      throw error;
    }
  }

  private async getConnection(connectionId: string): Promise<any> {
    const result = await this.db.query(
      "SELECT * FROM xero_connections WHERE id = $1",
      [connectionId],
    );

    if (result.rows.length === 0) {
      throw new Error("Xero connection not found");
    }

    return result.rows[0];
  }

  private async updateLastSyncTime(connectionId: string): Promise<void> {
    await this.db.query(
      "UPDATE xero_connections SET last_sync_at = NOW() WHERE id = $1",
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
    xeroData: any,
    localData: any,
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.db.query(
        `
        INSERT INTO xero_sync_log (
          tenant_id, connection_id, sync_type, entity_type, entity_id,
          operation, status, error_message, xero_data, local_data, processed_at
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
          JSON.stringify(xeroData),
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
        await new Promise((resolve) => setTimeout(resolve, 1000)); // ~60 requests per minute
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
      logger.info(`Xero connections established for tenant ${data.tenantId}`);
      // Trigger initial sync for each connection
      for (const connection of data.connections) {
        try {
          await this.syncContacts(data.tenantId, connection.id);
          await this.syncInvoices(data.tenantId, connection.id);
          await this.syncPayments(data.tenantId, connection.id);
        } catch (error) {
          logger.error(
            `Error during initial sync for connection ${connection.id}:`,
            error,
          );
        }
      }
    });
  }

  async cleanup(): Promise<void> {
    try {
      logger.info("Cleaning up Xero Service...");
      // Cleanup any resources if needed
    } catch (error) {
      logger.error("Error during cleanup:", error);
    }
  }
}
