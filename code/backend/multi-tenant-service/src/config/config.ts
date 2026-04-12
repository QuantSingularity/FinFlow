import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3007", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  database: { url: process.env.DATABASE_URL || "" },
  redis: { url: process.env.REDIS_URL || "redis://localhost:6379" },
};
