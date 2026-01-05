import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { env } from '@/config/env';
import { logDebug, logError } from '@/lib/logger';

/**
 * Upstash Redis client for caching and rate limiting
 */
export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Rate limiters for different operations
 */
export const rateLimiters = {
  /**
   * API rate limiter: 20 requests per minute per user
   */
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    analytics: true,
    prefix: 'ratelimit:api',
  }),

  /**
   * AI analysis rate limiter: 10 requests per minute per user
   */
  ai: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'ratelimit:ai',
  }),

  /**
   * Scraping rate limiter: 5 requests per minute per user
   */
  scraping: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
    prefix: 'ratelimit:scraping',
  }),
} as const;

/**
 * Cache keys builder
 */
export const cacheKeys = {
  property: (id: string) => `property:${id}`,
  userProperties: (userId: string) => `user:${userId}:properties`,
  scrapedData: (url: string) => `scraped:${url}`,
  geoLocation: (address: string) => `geo:${address}`,
  nearbyServices: (lat: number, lng: number) => `services:${lat}:${lng}`,
} as const;

/**
 * Default cache TTL values (in seconds)
 */
export const cacheTTL = {
  property: 60 * 60 * 24, // 24 hours
  scrapedData: 60 * 60 * 24 * 7, // 7 days
  geoLocation: 60 * 60 * 24 * 30, // 30 days
  nearbyServices: 60 * 60 * 24 * 7, // 7 days
} as const;

/**
 * Get cached value
 *
 * @param key - Cache key
 * @returns Cached value or null
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get<T>(key);
    if (value) {
      logDebug('Cache hit', { key });
    }
    return value;
  } catch (error) {
    logError('Cache get failed', error as Error, { key });
    return null;
  }
}

/**
 * Set cached value
 *
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - Time to live in seconds
 */
export async function setCached<T>(key: string, value: T, ttl: number): Promise<void> {
  try {
    await redis.set(key, value, { ex: ttl });
    logDebug('Cache set', { key, ttl });
  } catch (error) {
    logError('Cache set failed', error as Error, { key });
  }
}

/**
 * Delete cached value
 *
 * @param key - Cache key
 */
export async function deleteCached(key: string): Promise<void> {
  try {
    await redis.del(key);
    logDebug('Cache deleted', { key });
  } catch (error) {
    logError('Cache delete failed', error as Error, { key });
  }
}

/**
 * Delete multiple cached values by pattern
 *
 * @param pattern - Key pattern (e.g., "user:123:*")
 */
export async function deleteCachedPattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logDebug('Cache pattern deleted', { pattern, count: keys.length });
    }
  } catch (error) {
    logError('Cache pattern delete failed', error as Error, { pattern });
  }
}

/**
 * Check if rate limit is exceeded
 *
 * @param limiter - Rate limiter to use
 * @param identifier - User/IP identifier
 * @returns Rate limit result
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{
  readonly success: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly reset: number;
}> {
  try {
    const result = await limiter.limit(identifier);
    return result;
  } catch (error) {
    logError('Rate limit check failed', error as Error, { identifier });
    // Fail open - allow request if rate limiting fails
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
    };
  }
}
