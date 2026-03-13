import type { ScraperResult } from './types';
import { scrapeListingRemote } from './scraping-api-client';

/**
 * Manager for all scrapers.
 * Delegates scraping to the remote scraping service (Railway).
 */
export class ScraperManager {
  /**
   * Scrape a URL via the remote scraping service
   */
  async scrapeUrl(url: string): Promise<ScraperResult> {
    if (!url.includes('immoweb.be')) {
      return { success: false, error: 'No scraper found for this URL' };
    }

    try {
      const result = await scrapeListingRemote(url);
      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Remote scraping failed',
      };
    }
  }
}

// Export singleton instance
export const scraperManager = new ScraperManager();
