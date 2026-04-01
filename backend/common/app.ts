import dotenv from "dotenv";
import logger from "./logger";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import passport from "passport";
import { initializeDatabase } from "./database";
import { initializeKafka } from "./kafka";
import { initializePassport } from "./passport";
import errorMiddleware from "./error.middleware";

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

initializePassport();
app.use(passport.initialize());

app.get("/health", (req, res) => {
  res
    .status(200)
    .json({ status: "ok", service: process.env.SERVICE_NAME || "service" });
});

app.use(errorMiddleware);

const initializeApp = async () => {
  try {
    await initializeDatabase();
    await initializeKafka();
    logger.info("All services initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize services:", error);
    process.exit(1);
  }
};

initializeApp();

export default app;
