import type { ImmowebSearchResult } from '@/types/search-projects';

function getServiceUrl(): string {
  const url = process.env['SCRAPING_SERVICE_URL'];
  if (!url) throw new Error('SCRAPING_SERVICE_URL is not configured');
  return url;
}

function getApiSecret(): string {
  return process.env['SCRAPING_API_SECRET'] || '';
}

interface ScrapingApiResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

interface SearchApiResponse {
  success: boolean;
  data?: ImmowebSearchResult[];
  error?: string;
}

/**
 * Calls the remote scraping service to scrape an individual listing page.
 */
export async function scrapeListingRemote(url: string): Promise<ScrapingApiResponse> {
  const response = await fetch(`${getServiceUrl()}/scrape/listing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-secret': getApiSecret(),
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Scraping service error (${response.status}): ${text}`);
  }

  return response.json() as Promise<ScrapingApiResponse>;
}

/**
 * Calls the remote scraping service to scrape a search results page.
 */
export async function scrapeSearchRemote(url: string): Promise<ImmowebSearchResult[]> {
  const response = await fetch(`${getServiceUrl()}/scrape/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-secret': getApiSecret(),
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Scraping service error (${response.status}): ${text}`);
  }

  const result = await response.json() as SearchApiResponse;

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Search scraping failed');
  }

  return result.data;
}
