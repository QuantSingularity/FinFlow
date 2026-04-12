import dotenv from "dotenv";
import logger from "./logger";
import { PrismaClient } from "@prisma/client";

// Load environment variables
dotenv.config();

// Create Prisma client instance
const prisma = new PrismaClient();

// Initialize database connection
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Test connection by querying the database
    await prisma.$connect();
    logger.info("Database connection established");
  } catch (error) {
    logger.error("Failed to connect to database:", error);
    throw error;
  }
};

// Disconnect from database
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info("Database connection closed");
  } catch (error) {
    logger.error("Failed to disconnect from database:", error);
    throw error;
  }
};

export default {
  prisma,
  initializeDatabase,
  disconnectDatabase,
};
