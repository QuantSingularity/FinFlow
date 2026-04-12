import { logger } from "./logger";

let redisClient: any;

export const connectRedis = async (): Promise<void> => {
  try {
    const { createClient } = await import("redis");
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });
    await redisClient.connect();
    logger.info("Redis connected");
  } catch (error) {
    logger.warn("Redis connection failed (continuing without cache): " + error);
  }
};

export const getRedis = () => redisClient;
