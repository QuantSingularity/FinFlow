import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

let prisma: PrismaClient;

export const initializeDatabase = async (): Promise<void> => {
  prisma = new PrismaClient();
  await prisma.$connect().catch((e) => logger.warn("DB connect warning: " + e));
};

export const getDatabase = (): PrismaClient => {
  if (!prisma) prisma = new PrismaClient();
  return prisma;
};
