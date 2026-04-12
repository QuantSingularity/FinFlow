import dotenv from "dotenv";

dotenv.config();

// BUG FIX: The original hardcoded "test-jwt-secret-key-for-development" as the
// fallback JWT secret. Any attacker with access to the source code could forge
// valid tokens in any environment that forgets to set JWT_SECRET. We now detect
// this and force a startup crash in non-development environments, and log a loud
// warning even in development so the oversight is obvious.
const jwtSecret = process.env.JWT_SECRET;
const isDevelopment = (process.env.NODE_ENV || "development") === "development";

if (!jwtSecret) {
  if (!isDevelopment) {
    // Fatal in production/staging — never run with a missing secret
    throw new Error(
      "FATAL: JWT_SECRET environment variable is not set. " +
        "Set a strong, random secret before starting the service.",
    );
  } else {
    console.warn(
      "⚠️  WARNING: JWT_SECRET is not set. Using an insecure development " +
        "fallback. Never deploy this configuration to staging or production.",
    );
  }
}

const config = {
  jwt: {
    secret: jwtSecret || "dev-only-insecure-jwt-secret-do-not-use-in-prod",
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  stripe: {
    apiKey: process.env.STRIPE_API_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  },
  database: {
    url: process.env.DATABASE_URL || "",
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
    clientId: process.env.KAFKA_CLIENT_ID || "finflow-service",
    groupId: process.env.KAFKA_GROUP_ID || "finflow-group",
  },
};

export default config;
