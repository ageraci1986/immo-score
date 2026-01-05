import type { Scraper, ScraperResult } from './types';
import { ImmowebPlaywrightScraper } from './scrapers/immoweb-playwright-scraper';

/**
 * Manager for all scrapers
 */
export class ScraperManager {
  private scrapers: Scraper[] = [];

  constructor() {
    // Register all available scrapers (using Playwright for maximum stealth)
    this.scrapers.push(new ImmowebPlaywrightScraper());
  }

  /**
   * Find the appropriate scraper for a URL
   */
  findScraperForUrl(url: string): Scraper | null {
    return this.scrapers.find((scraper) => scraper.canHandle(url)) || null;
  }

  /**
   * Scrape a URL using the appropriate scraper
   */
  async scrapeUrl(url: string): Promise<ScraperResult> {
    const scraper = this.findScraperForUrl(url);

    if (!scraper) {
      return {
        success: false,
        error: 'No scraper found for this URL',
      };
    }

    console.log(`Using ${scraper.getName()} scraper for ${url}`);
    return await scraper.scrape(url);
  }

  /**
   * Get all registered scrapers
   */
  getAvailableScrapers(): readonly Scraper[] {
    return this.scrapers;
  }
}

// Export singleton instance
export const scraperManager = new ScraperManager();
