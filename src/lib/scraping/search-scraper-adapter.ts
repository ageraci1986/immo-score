import type { ImmowebSearchResult } from '@/types/search-projects';
import { scrapeSearchRemote } from './scraping-api-client';

/**
 * Scrapes Immoweb search pages via the remote scraping service (Railway).
 */
export async function scrapeSearchPages(url: string): Promise<ImmowebSearchResult[]> {
  console.log(`[SearchScraper] Scraping via remote service: ${url}`);
  return scrapeSearchRemote(url);
}
