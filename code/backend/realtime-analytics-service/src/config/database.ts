import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

let prisma: PrismaClient;

export const connectDatabase = async (): Promise<void> => {
  try {
    prisma = new PrismaClient();
    await prisma.$connect();
    logger.info("Database connected");
  } catch (error) {
    logger.error("Database connection failed: " + error);
  }
};

export const getDatabase = (): PrismaClient => {
  if (!prisma) prisma = new PrismaClient();
  return prisma;
};

export const disconnectDatabase = async (): Promise<void> => {
  if (prisma) await prisma.$disconnect();
};
