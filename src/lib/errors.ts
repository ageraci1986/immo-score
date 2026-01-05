/**
 * Base error class for all custom errors in the application
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when authentication is required but not provided
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message);
  }
}

/**
 * Error thrown when user doesn't have permission to access a resource
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message);
  }
}

/**
 * Error thrown when a requested resource is not found
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', context?: Record<string, unknown>) {
    super(message, context);
  }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }
}

/**
 * Error thrown when property scraping fails
 */
export class PropertyScrapingError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }
}

/**
 * Error thrown when AI analysis fails
 */
export class AIAnalysisError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }
}

/**
 * Error thrown when an API call fails
 */
export class ApiError extends Error implements ApiError {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, {
      originalError: error,
    });
  }

  return new AppError('An unknown error occurred', {
    originalError: error,
  });
}
