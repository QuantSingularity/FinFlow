import fs from "fs";
import path from "path";
import logger from "../../../common/logger";

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  userId?: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

const AUDIT_LOG_PATH =
  process.env.AUDIT_LOG_PATH || path.join(__dirname, "../../logs/audit.log");

const logDir = path.dirname(AUDIT_LOG_PATH);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

export const auditLog = async (
  entry: Omit<AuditLogEntry, "timestamp">,
): Promise<void> => {
  try {
    const timestamp = new Date().toISOString();
    const logEntry: AuditLogEntry = { timestamp, ...entry };

    logger.info(`AUDIT: ${JSON.stringify(logEntry)}`);

    fs.appendFileSync(AUDIT_LOG_PATH, JSON.stringify(logEntry) + "\n", {
      encoding: "utf8",
    });
  } catch (error) {
    logger.error(`Error writing to audit log: ${error}`);
  }
};

export const getUserAuditLogs = (
  userId: string,
  startDate?: Date,
  endDate?: Date,
): AuditLogEntry[] => {
  try {
    if (!fs.existsSync(AUDIT_LOG_PATH)) return [];
    const logContent = fs.readFileSync(AUDIT_LOG_PATH, "utf8");
    let entries: AuditLogEntry[] = logContent
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line))
      .filter((entry) => entry.userId === userId);

    if (startDate || endDate) {
      entries = entries.filter((entry) => {
        const entryDate = new Date(entry.timestamp);
        if (startDate && entryDate < startDate) return false;
        if (endDate && entryDate > endDate) return false;
        return true;
      });
    }
    return entries;
  } catch (error) {
    logger.error(`Error reading audit logs: ${error}`);
    return [];
  }
};

export const getResourceAuditLogs = (
  resourceType: string,
  resourceId?: string,
  startDate?: Date,
  endDate?: Date,
): AuditLogEntry[] => {
  try {
    if (!fs.existsSync(AUDIT_LOG_PATH)) return [];
    const logContent = fs.readFileSync(AUDIT_LOG_PATH, "utf8");
    let entries: AuditLogEntry[] = logContent
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line))
      .filter((entry) => {
        if (entry.resourceType !== resourceType) return false;
        if (resourceId && entry.resourceId !== resourceId) return false;
        return true;
      });

    if (startDate || endDate) {
      entries = entries.filter((entry) => {
        const entryDate = new Date(entry.timestamp);
        if (startDate && entryDate < startDate) return false;
        if (endDate && entryDate > endDate) return false;
        return true;
      });
    }
    return entries;
  } catch (error) {
    logger.error(`Error reading audit logs: ${error}`);
    return [];
  }
};
