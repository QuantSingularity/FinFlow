import app from "./app";
import logger from "./logger";
import dotenv from "dotenv";
import { disconnectDatabase } from "./database";
import { disconnectKafka } from "./kafka";

dotenv.config();

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  logger.info(`Service running on port ${PORT}`);
});

const gracefulShutdown = async () => {
  logger.info("Shutting down service...");

  server.close(() => {
    logger.info("HTTP server closed");
  });

  try {
    await disconnectDatabase();
    await disconnectKafka();
    logger.info("All connections closed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

export default server;
