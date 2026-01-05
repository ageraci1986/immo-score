import { PrismaClient } from '@prisma/client';
import { env, isDevelopment } from '@/config/env';
import { logDebug, logWarn } from '@/lib/logger';

/**
 * PrismaClient is attached to the `global` object in development to prevent
 * exhausting database connections due to hot reloading.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma client instance with logging configuration
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDevelopment
      ? [
          { level: 'query', emit: 'event' },
          { level: 'error', emit: 'stdout' },
          { level: 'warn', emit: 'stdout' },
        ]
      : ['error'],
  });

// Log queries in development
if (isDevelopment) {
  prisma.$on('query' as never, (e: unknown) => {
    const event = e as { query: string; params: string; duration: number };
    logDebug('Database query', {
      query: event.query,
      params: event.params,
      duration: `${event.duration}ms`,
    });
  });
}

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Gracefully disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logWarn('Database connection closed');
}

/**
 * Check database connection health
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logWarn('Database health check failed', { error });
    return false;
  }
}

/**
 * Execute a transaction with automatic retry logic
 *
 * @param fn - Transaction function
 * @param maxRetries - Maximum number of retries (default: 3)
 * @returns Transaction result
 */
export async function executeTransaction<T>(
  fn: (tx: PrismaClient) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        return await fn(tx as PrismaClient);
      });
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        logWarn(`Transaction failed, retrying in ${delay}ms`, {
          attempt,
          error: lastError.message,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
