import * as Sentry from '@sentry/nextjs';
import { env } from '@/config/env';
import { logError } from './logger';

/**
 * Initialize monitoring (Sentry)
 */
export function initializeMonitoring(): void {
  if (env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: env.NEXT_PUBLIC_SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
      beforeSend(event, hint) {
        // Filter sensitive data
        if (event.request) {
          delete event.request.cookies;
          if (event.request.headers) {
            delete event.request.headers['Authorization'];
            delete event.request.headers['authorization'];
          }
        }
        return event;
      },
    });
  }
}

/**
 * Capture an exception and send to monitoring service
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  logError('Exception captured', error instanceof Error ? error : new Error(String(error)), context);

  if (env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}

/**
 * Capture a message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
): void {
  if (env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  }
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string): void {
  if (env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser({
      id: userId,
      email,
    });
  }
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  if (env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  if (env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: 'info',
    });
  }
}

/**
 * Performance monitoring wrapper
 */
export async function withPerformanceMonitoring<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const transaction = Sentry.startTransaction({
    op: operation,
    name: operation,
  });

  try {
    const result = await fn();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    captureException(error, { operation });
    throw error;
  } finally {
    transaction.finish();
  }
}
