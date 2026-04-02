import {
  launchBrowser,
  createStealthContext,
  applyStealthScripts,
  randomDelay,
  simulateHumanBehavior,
  dismissCookieBanner,
  checkForCaptcha,
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

const PAGE_DELAY_MIN = 5000;
const PAGE_DELAY_MAX = 12000;
const MAX_CAPTCHA_RETRIES = 2;

/**
 * Scrapes an Immoweb search results page to extract listing cards.
 * On CAPTCHA, retries with a fresh browser session (new proxy IP).
 */
export async function scrapeSearchPage(url: string): Promise<SearchResult[]> {
  // Remove orderBy param — causes redirect that times out through proxy
  const cleanUrl = new URL(url);
  cleanUrl.searchParams.delete('orderBy');
  const normalizedUrl = cleanUrl.toString();

  const allResults: SearchResult[] = [];
  const seenIds = new Set<string>();
  let captchaRetries = 0;
  let startPageNum = 1;
  let startUrl = normalizedUrl;

  while (captchaRetries <= MAX_CAPTCHA_RETRIES) {
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;

    try {
      browser = await launchBrowser();
      context = await createStealthContext(browser);
      const page = await context.newPage();
      await applyStealthScripts(page);

      let currentPageNum = startPageNum;
      let currentUrl = startUrl;

      while (true) {
        console.log(`[Search] Page ${currentPageNum}: ${currentUrl}`);

        await randomDelay(3000, 6000);

        await page.goto(currentUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });

        if (currentPageNum === startPageNum) {
          await dismissCookieBanner(page);
        }

        // Check for CAPTCHA
        const blocked = await checkForCaptcha(page);
        if (blocked) {
          if (allResults.length === 0 && captchaRetries >= MAX_CAPTCHA_RETRIES) {
            throw new Error('Blocked by DataDome CAPTCHA after retries — stealth was not enough');
          }
          if (allResults.length === 0) {
            captchaRetries++;
            console.log(`[Search] CAPTCHA on page ${currentPageNum} — retrying with new IP (attempt ${captchaRetries}/${MAX_CAPTCHA_RETRIES})`);
            await randomDelay(10000, 20000);
            break;
          }
          console.log(`[Search] CAPTCHA on page ${currentPageNum} — returning ${allResults.length} results collected so far`);
          return allResults;
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

        // Remember where we are in case we need to retry
        startPageNum = currentPageNum + 1;
        startUrl = nextPageUrl;

        currentUrl = nextPageUrl;
        currentPageNum++;
        await randomDelay(PAGE_DELAY_MIN, PAGE_DELAY_MAX);
      }

      // If inner loop finished without CAPTCHA, we're done
      if (allResults.length > 0 || captchaRetries > MAX_CAPTCHA_RETRIES) {
        console.log(`[Search] Total: ${allResults.length} listings across ${startPageNum - 1} page(s)`);
        return allResults;
      }
    } finally {
      try { if (context) await context.close(); } catch (e) { console.log('[Search] context.close error (ignored):', e); }
      try { if (browser) await browser.close(); } catch (e) { console.log('[Search] browser.close error (ignored):', e); }
    }
  }

  console.log(`[Search] Total: ${allResults.length} listings`);
  return allResults;
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
