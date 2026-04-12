import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.REALTIME_ANALYTICS_PORT || "3008", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  database: {
    postgres: {
      host: process.env.POSTGRES_HOST || "localhost",
      port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
      username: process.env.POSTGRES_USER || "postgres",
      password: process.env.POSTGRES_PASSWORD || "password",
      database: process.env.POSTGRES_DB || "finflow_realtime",
      ssl: process.env.POSTGRES_SSL === "true",
      maxConnections: parseInt(
        process.env.POSTGRES_MAX_CONNECTIONS || "20",
        10,
      ),
      idleTimeoutMillis: parseInt(
        process.env.POSTGRES_IDLE_TIMEOUT || "30000",
        10,
      ),
      connectionTimeoutMillis: parseInt(
        process.env.POSTGRES_CONNECTION_TIMEOUT || "2000",
        10,
      ),
    },
    mongodb: {
      uri:
        process.env.MONGODB_URI || "mongodb://localhost:27017/finflow_realtime",
      options: {
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || "10", 10),
        serverSelectionTimeoutMS: parseInt(
          process.env.MONGODB_SERVER_SELECTION_TIMEOUT || "5000",
          10,
        ),
        socketTimeoutMS: parseInt(
          process.env.MONGODB_SOCKET_TIMEOUT || "45000",
          10,
        ),
      },
    },
  },

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || "0", 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || "finflow:realtime:",
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || "3", 10),
    retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || "100", 10),
    enableReadyCheck: true,
    lazyConnect: true,
  },

  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || "realtime-analytics-service",
    brokers: process.env.KAFKA_BROKERS?.split(",") || ["localhost:9092"],
    groupId: process.env.KAFKA_GROUP_ID || "realtime-analytics-group",
    topics: {
      transactions:
        process.env.KAFKA_TRANSACTIONS_TOPIC || "financial.transactions",
      payments: process.env.KAFKA_PAYMENTS_TOPIC || "financial.payments",
      userEvents: process.env.KAFKA_USER_EVENTS_TOPIC || "user.events",
      anomalies: process.env.KAFKA_ANOMALIES_TOPIC || "financial.anomalies",
      insights: process.env.KAFKA_INSIGHTS_TOPIC || "financial.insights",
    },
    consumer: {
      sessionTimeout: parseInt(
        process.env.KAFKA_SESSION_TIMEOUT || "30000",
        10,
      ),
      rebalanceTimeout: parseInt(
        process.env.KAFKA_REBALANCE_TIMEOUT || "60000",
        10,
      ),
      heartbeatInterval: parseInt(
        process.env.KAFKA_HEARTBEAT_INTERVAL || "3000",
        10,
      ),
      maxBytesPerPartition: parseInt(
        process.env.KAFKA_MAX_BYTES_PER_PARTITION || "1048576",
        10,
      ),
      minBytes: parseInt(process.env.KAFKA_MIN_BYTES || "1", 10),
      maxBytes: parseInt(process.env.KAFKA_MAX_BYTES || "10485760", 10),
      maxWaitTimeInMs: parseInt(process.env.KAFKA_MAX_WAIT_TIME || "5000", 10),
    },
    producer: {
      maxInFlightRequests: parseInt(
        process.env.KAFKA_MAX_IN_FLIGHT_REQUESTS || "1",
        10,
      ),
      idempotent: process.env.KAFKA_IDEMPOTENT === "true",
      transactionTimeout: parseInt(
        process.env.KAFKA_TRANSACTION_TIMEOUT || "30000",
        10,
      ),
    },
  },

  jwt: {
    secret: process.env.JWT_SECRET || "your-super-secret-jwt-key",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    issuer: process.env.JWT_ISSUER || "finflow-realtime-analytics",
    audience: process.env.JWT_AUDIENCE || "finflow-users",
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  },

  analytics: {
    batchSize: parseInt(process.env.ANALYTICS_BATCH_SIZE || "1000", 10),
    flushInterval: parseInt(process.env.ANALYTICS_FLUSH_INTERVAL || "5000", 10),
    retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS || "90", 10),
    aggregationIntervals: {
      realtime: parseInt(process.env.ANALYTICS_REALTIME_INTERVAL || "1000", 10),
      minute: parseInt(process.env.ANALYTICS_MINUTE_INTERVAL || "60000", 10),
      hour: parseInt(process.env.ANALYTICS_HOUR_INTERVAL || "3600000", 10),
      day: parseInt(process.env.ANALYTICS_DAY_INTERVAL || "86400000", 10),
    },
  },

  anomalyDetection: {
    enabled: process.env.ANOMALY_DETECTION_ENABLED !== "false",
    sensitivity: parseFloat(process.env.ANOMALY_SENSITIVITY || "0.95"),
    windowSize: parseInt(process.env.ANOMALY_WINDOW_SIZE || "100", 10),
    minDataPoints: parseInt(process.env.ANOMALY_MIN_DATA_POINTS || "50", 10),
    alertThreshold: parseFloat(process.env.ANOMALY_ALERT_THRESHOLD || "0.8"),
    models: {
      isolationForest: {
        contamination: parseFloat(
          process.env.ISOLATION_FOREST_CONTAMINATION || "0.1",
        ),
        nEstimators: parseInt(
          process.env.ISOLATION_FOREST_N_ESTIMATORS || "100",
          10,
        ),
        maxSamples: parseInt(
          process.env.ISOLATION_FOREST_MAX_SAMPLES || "256",
          10,
        ),
      },
      statisticalThreshold: {
        zScoreThreshold: parseFloat(process.env.Z_SCORE_THRESHOLD || "3.0"),
        movingAverageWindow: parseInt(
          process.env.MOVING_AVERAGE_WINDOW || "20",
          10,
        ),
      },
    },
  },

  monitoring: {
    metricsEnabled: process.env.METRICS_ENABLED !== "false",
    metricsPort: parseInt(process.env.METRICS_PORT || "9090", 10),
    healthCheckInterval: parseInt(
      process.env.HEALTH_CHECK_INTERVAL || "30000",
      10,
    ),
    alerting: {
      enabled: process.env.ALERTING_ENABLED !== "false",
      webhookUrl: process.env.ALERT_WEBHOOK_URL,
      slackToken: process.env.SLACK_TOKEN,
      slackChannel: process.env.SLACK_CHANNEL || "#alerts",
    },
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
    format: process.env.LOG_FORMAT || "json",
    maxFiles: parseInt(process.env.LOG_MAX_FILES || "5", 10),
    maxSize: process.env.LOG_MAX_SIZE || "20m",
    datePattern: process.env.LOG_DATE_PATTERN || "YYYY-MM-DD",
  },

  websocket: {
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || "60000", 10),
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || "25000", 10),
    maxHttpBufferSize: parseInt(
      process.env.WS_MAX_HTTP_BUFFER_SIZE || "1000000",
      10,
    ),
    transports: process.env.WS_TRANSPORTS?.split(",") || [
      "websocket",
      "polling",
    ],
    allowEIO3: process.env.WS_ALLOW_EIO3 === "true",
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "12", 10),
    sessionSecret: process.env.SESSION_SECRET || "your-session-secret",
    corsOrigins: process.env.CORS_ORIGINS?.split(",") || [
      "http://localhost:3000",
    ],
    trustedProxies: process.env.TRUSTED_PROXIES?.split(",") || [],
    rateLimitSkipSuccessfulRequests:
      process.env.RATE_LIMIT_SKIP_SUCCESSFUL === "true",
  },
};

export default config;
