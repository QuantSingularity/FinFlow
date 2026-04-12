import { Pool } from "pg";
import { logger } from "./logger";

let pool: Pool;

export const getDatabase = async (): Promise<Pool> => {
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST || "localhost",
      port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
      user: process.env.POSTGRES_USER || "postgres",
      password: process.env.POSTGRES_PASSWORD || "password",
      database: process.env.POSTGRES_DB || "finflow",
      max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || "20", 10),
    });
  }
  return pool;
};

export const disconnectDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
  }
};
