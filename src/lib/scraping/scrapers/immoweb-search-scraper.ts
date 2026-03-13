import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { ImmowebSearchResult } from '@/types/search-projects';
import path from 'path';
import os from 'os';
import fs from 'fs';

const MAX_PAGES = 5;
const PAGE_DELAY_MIN = 2000;
const PAGE_DELAY_MAX = 5000;

// Reuse the same persistent profile as the listing scraper
const CHROME_PROFILE_DIR = path.join(os.tmpdir(), 'immoweb-playwright-profile');

if (!fs.existsSync(CHROME_PROFILE_DIR)) {
  fs.mkdirSync(CHROME_PROFILE_DIR, { recursive: true });
}

/**
 * Scrapes an Immoweb search results page to extract listing cards.
 * Only extracts REAL search results (class `card--result`), filtering out:
 * - Ads / adfocus links
 * - "Related" / suggested listings (card--list-classified)
 */
export async function scrapeImmowebSearchPage(
  url: string
): Promise<ImmowebSearchResult[]> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--ignore-certificate-errors',
      ],
    });

    context = await browser.newContext({
      viewport: {
        width: 1366 + Math.floor(Math.random() * 200),
        height: 768 + Math.floor(Math.random() * 200),
      },
      locale: 'fr-FR',
      timezoneId: 'Europe/Brussels',
      colorScheme: 'light',
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      extraHTTPHeaders: {
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        DNT: '1',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    const page = await context.newPage();

    // Stealth init script
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['fr-FR', 'fr', 'en-US', 'en'],
      });
      (window as unknown as Record<string, unknown>)['chrome'] = { runtime: {} };

      const originalQuery = navigator.permissions.query;
      navigator.permissions.query = (parameters: PermissionDescriptor) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : originalQuery(parameters);
    });

    const allResults: ImmowebSearchResult[] = [];
    const seenIds = new Set<string>();
    let currentPageNum = 1;
    let currentUrl = url;

    while (currentPageNum <= MAX_PAGES) {
      console.log(`[ImmowebSearch] Scraping page ${currentPageNum}: ${currentUrl}`);

      // Human-like delay before navigation
      await randomDelay(1500, 3000);

      await page.goto(currentUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      // Dismiss cookie banner on first page
      if (currentPageNum === 1) {
        await dismissCookieBanner(page);
      }

      // Check for CAPTCHA
      const isCaptcha = await page.evaluate(() =>
        document.body.innerHTML.includes('captcha-delivery.com')
      );

      if (isCaptcha) {
        console.log('[ImmowebSearch] CAPTCHA detected — waiting 30s for manual resolution...');
        await page.waitForSelector('article.card--result', { timeout: 30000 }).catch(() => {
          console.log('[ImmowebSearch] CAPTCHA not resolved in time');
        });
      }

      // Wait for real result cards to appear
      await page.waitForSelector('article[class*="card--result"]', { timeout: 15000 }).catch(() => {
        console.log('[ImmowebSearch] No card--result elements found');
      });

      // Human-like scrolling
      await simulateHumanBehavior(page);

      // Extract ONLY real search results
      const pageResults = await extractRealResults(page);

      // Deduplicate across pages
      const newResults = pageResults.filter((r) => {
        if (seenIds.has(r.immowebId)) return false;
        seenIds.add(r.immowebId);
        return true;
      });

      console.log(
        `[ImmowebSearch] Page ${currentPageNum}: ${pageResults.length} results found, ${newResults.length} new`
      );

      if (newResults.length === 0 && currentPageNum === 1) {
        // Debug: log what we see
        const debugInfo = await page.evaluate(() => ({
          url: window.location.href,
          isCaptcha: document.body.innerHTML.includes('captcha-delivery.com'),
          articleCount: document.querySelectorAll('article').length,
          cardResultCount: document.querySelectorAll('article[class*="card--result"]').length,
          allCardCount: document.querySelectorAll('[class*="card"]').length,
          bodySnippet: document.body.textContent?.substring(0, 300) || '',
        }));
        console.log('[ImmowebSearch] Debug:', JSON.stringify(debugInfo, null, 2));

        throw new Error(
          "Aucune annonce trouvée sur la page de recherche. Immoweb a peut-être bloqué la requête ou l'URL est invalide."
        );
      }

      allResults.push(...newResults);

      // Stop if this page had no new results (we've seen everything)
      if (newResults.length === 0) {
        console.log('[ImmowebSearch] No new results on this page, stopping pagination');
        break;
      }

      // Check for next page — ONLY follow real pagination links
      const nextPageUrl = await findNextPageLink(page);
      if (!nextPageUrl) {
        console.log('[ImmowebSearch] No next page link found, done');
        break;
      }

      currentUrl = nextPageUrl;
      currentPageNum++;

      await randomDelay(PAGE_DELAY_MIN, PAGE_DELAY_MAX);
    }

    console.log(`[ImmowebSearch] Total: ${allResults.length} listings across ${currentPageNum} page(s)`);
    return allResults;
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

/**
 * Extracts ONLY real search result cards from the page.
 * Immoweb uses these card types:
 * - `card--result` (+ `card--xl` or `card--medium`) = REAL search results
 * - `card--list-classified` = Suggested/related listings (NOT real results)
 * - `adfocus__link` = Advertisements
 */
async function extractRealResults(page: Page): Promise<ImmowebSearchResult[]> {
  return await page.evaluate(() => {
    const results: Array<{
      immowebId: string;
      listingUrl: string;
      title: string | null;
      price: number | null;
      city: string | null;
      thumbnailUrl: string | null;
    }> = [];

    // Only select articles with card--result class (real search results)
    const resultCards = document.querySelectorAll('article[class*="card--result"]');

    for (const card of Array.from(resultCards)) {
      // Skip if this is a classified/suggested card (double check)
      if (card.className.includes('card--list-classified')) continue;

      // Find the listing link
      const link = card.querySelector('a.card__title-link') as HTMLAnchorElement | null;
      if (!link || !link.href) continue;

      // Extract immoweb ID from URL
      const idMatch = link.href.match(/\/(\d{5,10})(?:\?|$|#)/);
      if (!idMatch || !idMatch[1]) continue;

      const id = idMatch[1];

      // Extract price from the card
      let price: number | null = null;
      const priceEl = card.querySelector('[class*="card--result__price"], [class*="price"]');
      if (priceEl && priceEl.textContent) {
        // Price text is like "180 500 €" — extract digits
        const priceText = priceEl.textContent.replace(/\s/g, '');
        const priceMatch = priceText.match(/(\d+)€/);
        if (priceMatch && priceMatch[1]) {
          price = parseInt(priceMatch[1], 10);
        }
      }

      // Extract title
      const titleEl = card.querySelector('h2, [class*="title"]');
      const title = titleEl ? titleEl.textContent?.trim() || null : null;

      // Extract city/location
      const locationEl = card.querySelector('[class*="card__information--locality"], [class*="locality"]');
      const city = locationEl ? locationEl.textContent?.trim() || null : null;

      // Extract postal code from location text or URL
      let postalCode: string | null = null;
      const urlParts = link.href.match(/\/(\d{4})\//);
      if (urlParts && urlParts[1]) postalCode = urlParts[1];

      const fullCity = [postalCode, city].filter(Boolean).join(' ');

      // Extract thumbnail
      const imgEl = card.querySelector('img');
      const thumbnailUrl = imgEl
        ? imgEl.src || imgEl.getAttribute('data-src') || null
        : null;

      // Extract bedrooms and surface from card text
      const cardText = card.textContent || '';
      const bedroomsMatch = cardText.match(/(\d+)\s*ch\./);
      const surfaceMatch = cardText.match(/(\d+)\s*m²/);

      // Build a descriptive title if we don't have one
      const propertyType = link.href.includes('/maison/') ? 'Maison'
        : link.href.includes('/appartement/') ? 'Appartement'
        : link.href.includes('/immeuble/') ? 'Immeuble'
        : 'Bien';

      const descriptiveTitle = title || [
        propertyType,
        bedroomsMatch ? `${bedroomsMatch[1]} ch.` : null,
        surfaceMatch ? `${surfaceMatch[1]} m²` : null,
        city,
      ].filter(Boolean).join(' · ');

      results.push({
        immowebId: id,
        listingUrl: link.href.split('?')[0] || link.href,
        title: descriptiveTitle,
        price,
        city: fullCity || null,
        thumbnailUrl,
      });
    }

    return results;
  });
}

/**
 * Finds the REAL "next page" pagination link.
 * Only returns a URL if an actual pagination button exists and is clickable.
 * Does NOT construct URLs — this prevents infinite loops.
 *
 * Immoweb pagination structure:
 * - `a.pagination__link--next` with text "Page suivante"
 * - `a[aria-label*="Suivant"]` or `a[aria-label*="Next"]`
 */
async function findNextPageLink(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    // Primary: Immoweb's specific "next page" link class
    const nextLink = document.querySelector(
      'a.pagination__link--next'
    ) as HTMLAnchorElement | null;

    if (nextLink && nextLink.href && !nextLink.classList.contains('disabled')) {
      return nextLink.href;
    }

    // Fallback selectors
    const fallbackSelectors = [
      'a[aria-label*="Suivant"]',
      'a[aria-label*="Next"]',
      '[class*="pagination"] a[rel="next"]',
    ];

    for (const sel of fallbackSelectors) {
      const el = document.querySelector(sel) as HTMLAnchorElement | null;
      if (el && el.href && !el.classList.contains('disabled') && !el.hasAttribute('disabled')) {
        return el.href;
      }
    }

    return null;
  });
}

async function dismissCookieBanner(page: Page): Promise<void> {
  try {
    const cookieBtn = await page.$(
      'button[id*="accept"], button[class*="accept"], [id*="didomi"] button:first-child, [id*="usercentrics"] button'
    );
    if (cookieBtn) {
      await cookieBtn.click();
      await randomDelay(500, 1000);
    }
  } catch {
    // No cookie banner
  }
}

async function simulateHumanBehavior(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo({ top: Math.random() * 800, behavior: 'smooth' });
  });
  await randomDelay(1000, 2000);

  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  });
  await randomDelay(1000, 2000);

  try {
    const x = Math.floor(Math.random() * 1000) + 100;
    const y = Math.floor(Math.random() * 600) + 100;
    await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
  } catch {
    // Ignore mouse errors
  }
}

function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}
