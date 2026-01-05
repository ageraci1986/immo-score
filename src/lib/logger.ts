import pino from 'pino';
import { env, isDevelopment } from '@/config/env';

/**
 * Structured logger instance configured for the application
 * Note: pino-pretty transport is disabled in Next.js due to worker thread issues
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Disable pino-pretty transport in Next.js to avoid worker thread issues
  // The transport uses worker_threads which conflicts with Next.js server components
  browser: isDevelopment ? { asObject: true } : undefined,
});

/**
 * Log levels available
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

/**
 * Create a child logger with additional context
 */
export function createLogger(context: Record<string, unknown>): pino.Logger {
  return logger.child(context);
}

/**
 * Log an info message
 */
export function logInfo(message: string, data?: Record<string, unknown>): void {
  logger.info(data, message);
}

/**
 * Log a warning message
 */
export function logWarn(message: string, data?: Record<string, unknown>): void {
  logger.warn(data, message);
}

/**
 * Log an error message
 */
export function logError(message: string, error?: Error, data?: Record<string, unknown>): void {
  logger.error(
    {
      ...data,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : undefined,
    },
    message
  );
}

/**
 * Log a debug message (only in development)
 */
export function logDebug(message: string, data?: Record<string, unknown>): void {
  logger.debug(data, message);
}
