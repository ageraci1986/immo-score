import {
  launchBrowser,
  createStealthContext,
  applyStealthScripts,
  randomDelay,
  simulateHumanBehavior,
  dismissCookieBanner,
} from '../browser';
import type { Browser, BrowserContext, Page } from 'playwright';

interface SearchResult {
  immowebId: string;
  listingUrl: string;
  title: string | null;
  price: number | null;
  city: string | null;
  thumbnailUrl: string | null;
}

const MAX_PAGES = 5;
const PAGE_DELAY_MIN = 2000;
const PAGE_DELAY_MAX = 5000;

/**
 * Scrapes an Immoweb search results page to extract listing cards.
 */
export async function scrapeSearchPage(url: string): Promise<SearchResult[]> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    browser = await launchBrowser();
    context = await createStealthContext(browser);
    const page = await context.newPage();
    await applyStealthScripts(page);

    const allResults: SearchResult[] = [];
    const seenIds = new Set<string>();
    let currentPageNum = 1;
    let currentUrl = url;

    while (currentPageNum <= MAX_PAGES) {
      console.log(`[Search] Page ${currentPageNum}: ${currentUrl}`);

      await randomDelay(1500, 3000);

      await page.goto(currentUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      if (currentPageNum === 1) {
        await dismissCookieBanner(page);
      }

      // Check for CAPTCHA
      const isCaptcha = await page.evaluate(() =>
        document.body.innerHTML.includes('captcha-delivery.com')
      );
      if (isCaptcha) {
        console.log('[Search] CAPTCHA detected — waiting 30s...');
        await page.waitForSelector('article.card--result', { timeout: 30000 }).catch(() => {
          console.log('[Search] CAPTCHA not resolved in time');
        });
      }

      await page.waitForSelector('article[class*="card--result"]', { timeout: 15000 }).catch(() => {
        console.log('[Search] No card--result elements found');
      });

      await simulateHumanBehavior(page);

      const pageResults = await extractRealResults(page);

      const newResults = pageResults.filter((r) => {
        if (seenIds.has(r.immowebId)) return false;
        seenIds.add(r.immowebId);
        return true;
      });

      console.log(`[Search] Page ${currentPageNum}: ${pageResults.length} results, ${newResults.length} new`);

      if (newResults.length === 0 && currentPageNum === 1) {
        const debugInfo = await page.evaluate(() => ({
          url: window.location.href,
          isCaptcha: document.body.innerHTML.includes('captcha-delivery.com'),
          articleCount: document.querySelectorAll('article').length,
          cardResultCount: document.querySelectorAll('article[class*="card--result"]').length,
        }));
        console.log('[Search] Debug:', JSON.stringify(debugInfo));

        throw new Error(
          "Aucune annonce trouvée sur la page de recherche. Immoweb a peut-être bloqué la requête ou l'URL est invalide."
        );
      }

      allResults.push(...newResults);

      if (newResults.length === 0) {
        console.log('[Search] No new results, stopping pagination');
        break;
      }

      const nextPageUrl = await findNextPageLink(page);
      if (!nextPageUrl) {
        console.log('[Search] No next page link, done');
        break;
      }

      currentUrl = nextPageUrl;
      currentPageNum++;
      await randomDelay(PAGE_DELAY_MIN, PAGE_DELAY_MAX);
    }

    console.log(`[Search] Total: ${allResults.length} listings across ${currentPageNum} page(s)`);
    return allResults;
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

async function extractRealResults(page: Page): Promise<SearchResult[]> {
  return page.evaluate(() => {
    const results: SearchResult[] = [];
    const resultCards = document.querySelectorAll('article[class*="card--result"]');

    for (const card of Array.from(resultCards)) {
      if (card.className.includes('card--list-classified')) continue;

      const link = card.querySelector('a.card__title-link') as HTMLAnchorElement | null;
      if (!link?.href) continue;

      const idMatch = link.href.match(/\/(\d{5,10})(?:\?|$|#)/);
      if (!idMatch?.[1]) continue;

      const id = idMatch[1];

      let price: number | null = null;
      const priceEl = card.querySelector('[class*="card--result__price"], [class*="price"]');
      if (priceEl?.textContent) {
        const priceText = priceEl.textContent.replace(/\s/g, '');
        const priceMatch = priceText.match(/(\d+)€/);
        if (priceMatch?.[1]) price = parseInt(priceMatch[1], 10);
      }

      const titleEl = card.querySelector('h2, [class*="title"]');
      const title = titleEl?.textContent?.trim() || null;

      const locationEl = card.querySelector('[class*="card__information--locality"], [class*="locality"]');
      const city = locationEl?.textContent?.trim() || null;

      let postalCode: string | null = null;
      const urlParts = link.href.match(/\/(\d{4})\//);
      if (urlParts?.[1]) postalCode = urlParts[1];
      const fullCity = [postalCode, city].filter(Boolean).join(' ');

      const imgEl = card.querySelector('img');
      const thumbnailUrl = imgEl ? imgEl.src || imgEl.getAttribute('data-src') || null : null;

      const cardText = card.textContent || '';
      const bedroomsMatch = cardText.match(/(\d+)\s*ch\./);
      const surfaceMatch = cardText.match(/(\d+)\s*m²/);

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

async function findNextPageLink(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const nextLink = document.querySelector('a.pagination__link--next') as HTMLAnchorElement | null;
    if (nextLink?.href && !nextLink.classList.contains('disabled')) return nextLink.href;

    const fallbackSelectors = [
      'a[aria-label*="Suivant"]',
      'a[aria-label*="Next"]',
      '[class*="pagination"] a[rel="next"]',
    ];
    for (const sel of fallbackSelectors) {
      const el = document.querySelector(sel) as HTMLAnchorElement | null;
      if (el?.href && !el.classList.contains('disabled') && !el.hasAttribute('disabled')) return el.href;
    }

    return null;
  });
}
