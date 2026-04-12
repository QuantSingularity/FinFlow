import commonLogger from "../../../common/logger";

/**
 * Logger utility for application-wide logging, wrapping the common logger.
 */
export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    commonLogger.info(message, meta);
  },

  warn: (message: string, meta?: Record<string, any>) => {
    commonLogger.warn(message, meta);
  },

  error: (message: string, meta?: Record<string, any>) => {
    commonLogger.error(message, meta);
  },

  debug: (message: string, meta?: Record<string, any>) => {
    commonLogger.debug(message, meta);
  },
};

export default logger;
