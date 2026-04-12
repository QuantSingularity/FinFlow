import { logger } from "./logger";

/**
 * Utility for handling retries with exponential backoff
 */

export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  retryableErrors?: string[];
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 3000,
  backoffFactor: 2,
  retryableErrors: [
    "ECONNRESET",
    "ETIMEDOUT",
    "ECONNREFUSED",
    "NETWORK_ERROR",
    "GATEWAY_ERROR",
    "RATE_LIMIT_ERROR",
    "TIMEOUT_ERROR",
    "CONNECTION_ERROR",
    "SERVER_ERROR",
  ],
};

/**
 * Sleep for the specified duration
 * @param ms Milliseconds to sleep
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Check if an error is retryable based on options
 * @param error The error to check
 * @param options Retry options
 */
const isRetryableError = (error: any, options: RetryOptions): boolean => {
  if (!options.retryableErrors || options.retryableErrors.length === 0) {
    return true; // If no specific errors defined, retry all
  }

  const errorCode = error.code || error.type || error.name || "";
  const errorMessage = error.message || "";

  // Check if error code or message contains any of the retryable errors
  return options.retryableErrors.some(
    (retryableError) =>
      errorCode.includes(retryableError) ||
      errorMessage.toUpperCase().includes(retryableError),
  );
};

/**
 * Calculate delay for the current retry attempt with exponential backoff
 * @param attempt Current attempt number (0-based)
 * @param options Retry options
 */
const calculateDelay = (attempt: number, options: RetryOptions): number => {
  const delay =
    options.initialDelayMs * Math.pow(options.backoffFactor, attempt);
  return Math.min(delay, options.maxDelayMs);
};

/**
 * Execute a function with retry logic
 * @param fn Function to execute with retry
 * @param options Retry options
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const retryOptions: RetryOptions = { ...defaultRetryOptions, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we've reached max retries or if error is not retryable
      if (
        attempt >= retryOptions.maxRetries ||
        !isRetryableError(error, retryOptions)
      ) {
        throw error;
      }

      // Calculate delay for next retry
      const delay = calculateDelay(attempt, retryOptions);

      // Log retry attempt
      logger.info(
        `Retry attempt ${attempt + 1}/${retryOptions.maxRetries} after ${delay}ms due to: ${error.message}`,
      );

      // Wait before next retry
      await sleep(delay);
    }
  }

  // This should never be reached due to the throw in the loop,
  // but TypeScript requires a return statement
  throw lastError;
}
