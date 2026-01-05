/**
 * Rate limiter to prevent overwhelming the target website
 * Ensures human-like scraping intervals
 */
class RateLimiter {
  constructor() {
    this.lastRequestTime = null;
    this.minDelay = 30000; // Minimum 30 seconds between requests (VERY conservative)
    this.maxDelay = 60000; // Maximum 60 seconds
    this.requestCount = 0;
    this.maxRequestsPerHour = 5; // Max 5 requests per hour (VERY conservative)
    this.requestTimestamps = [];
    console.log('⚠️  ULTRA-CONSERVATIVE mode: 30-60s delays, max 5 req/hour');
  }

  /**
   * Wait for appropriate delay before next request
   */
  async waitForNextRequest() {
    const now = Date.now();

    // Clean old timestamps (older than 1 hour)
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < 3600000
    );

    // Check hourly limit
    if (this.requestTimestamps.length >= this.maxRequestsPerHour) {
      const oldestRequest = this.requestTimestamps[0];
      const timeToWait = 3600000 - (now - oldestRequest);

      if (timeToWait > 0) {
        console.log(`⏳ Rate limit reached. Waiting ${Math.round(timeToWait / 1000)}s before next request...`);
        await new Promise(resolve => setTimeout(resolve, timeToWait));
      }
    }

    // Ensure minimum delay since last request
    if (this.lastRequestTime) {
      const timeSinceLastRequest = now - this.lastRequestTime;
      const randomDelay = Math.floor(Math.random() * (this.maxDelay - this.minDelay + 1)) + this.minDelay;
      const requiredDelay = Math.max(0, randomDelay - timeSinceLastRequest);

      if (requiredDelay > 0) {
        console.log(`⏱️  Waiting ${Math.round(requiredDelay / 1000)}s to simulate human behavior...`);
        await new Promise(resolve => setTimeout(resolve, requiredDelay));
      }
    }

    // Update tracking
    this.lastRequestTime = Date.now();
    this.requestTimestamps.push(this.lastRequestTime);
    this.requestCount++;

    console.log(`📊 Request #${this.requestCount} (${this.requestTimestamps.length} in last hour)`);
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      totalRequests: this.requestCount,
      requestsInLastHour: this.requestTimestamps.length,
      remainingThisHour: this.maxRequestsPerHour - this.requestTimestamps.length,
    };
  }
}

// Export singleton instance
const rateLimiter = new RateLimiter();

module.exports = { rateLimiter, RateLimiter };
