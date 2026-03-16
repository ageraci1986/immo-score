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

interface ScrapedData {
  [key: string]: unknown;
}

interface ScrapeResult {
  success: boolean;
  data?: ScrapedData;
  error?: string;
}

/**
 * Scrapes an individual Immoweb listing page.
 * Adapted from immoweb-playwright-scraper.js for headless server use.
 */
export async function scrapeListing(url: string): Promise<ScrapeResult> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    console.log(`[Listing] Scraping: ${url}`);

    browser = await launchBrowser();
    context = await createStealthContext(browser);
    const page = await context.newPage();
    await applyStealthScripts(page);

    // Random delay before navigation
    await randomDelay(2000, 5000);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // Simulate human reading
    await randomDelay(3000, 7000);
    await simulateHumanBehavior(page);
    await dismissCookieBanner(page);

    // Check for CAPTCHA
    const blocked = await checkForCaptcha(page);
    if (blocked) {
      console.log('[Listing] Blocked by DataDome — stealth was not enough');
      await context.close();
      await browser.close();
      return { success: false, error: 'Blocked by DataDome CAPTCHA' };
    }

    // Wait for content
    try {
      await page.waitForSelector('h1, table, [class*="classified"]', {
        timeout: 20000,
      });
    } catch {
      console.log('[Listing] Timeout waiting for content');
    }

    await randomDelay(2000, 4000);
    await simulateHumanBehavior(page);

    // Scroll to trigger lazy loading
    await page.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
    await randomDelay(1000, 2000);
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    await randomDelay(1000, 2000);

    // Interact with carousel
    await interactWithCarousel(page);

    // Extract data
    const data = await extractListingData(page);

    console.log(`[Listing] Extracted: title="${data.title}", price=${data.price}, photos=${(data.photos as string[])?.length ?? 0}`);

    await context.close();
    await browser.close();

    return { success: true, data };
  } catch (error) {
    console.error('[Listing] Scraping error:', error);
    if (context) await context.close();
    if (browser) await browser.close();
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function interactWithCarousel(page: Page): Promise<void> {
  try {
    let clickedCount = 0;
    const maxClicks = 25;

    for (let i = 0; i < maxClicks; i++) {
      const nextButton = await page.$(
        'button[aria-label*="Next"], button[aria-label*="Suivant"], button[class*="next"], button[class*="arrow-right"], [class*="swiper-button-next"]'
      );
      if (!nextButton) break;

      const isDisabled = await nextButton.evaluate((btn) =>
        btn.hasAttribute('disabled') || btn.classList.contains('disabled')
      );
      if (isDisabled) break;

      await nextButton.click();
      clickedCount++;
      await randomDelay(200, 400);
    }

    // Click all thumbnails
    const thumbnails = await page.$$(
      '[class*="thumbnail"], [class*="thumb-nav"] button, [class*="carousel-indicators"] button'
    );
    for (const thumb of thumbnails) {
      try {
        await thumb.click();
        await randomDelay(150, 300);
      } catch {
        // Thumbnail might not be clickable
      }
    }

    console.log(`[Listing] Carousel: ${clickedCount} clicks, ${thumbnails.length} thumbnails`);
  } catch (e) {
    console.log('[Listing] Carousel interaction failed:', e instanceof Error ? e.message : e);
  }
}

async function extractListingData(page: Page): Promise<ScrapedData> {
  return page.evaluate(() => {
    function extractNumber(text: string | undefined): number | undefined {
      if (!text) return undefined;
      const match = text.replace(/\s/g, '').match(/(\d+)/);
      return match ? parseInt(match[1]!, 10) : undefined;
    }

    function getTableValue(label: string): string | undefined {
      const labels = [label, label.toLowerCase(), label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()];
      for (const l of labels) {
        const cells = Array.from(document.querySelectorAll('th, td'));
        const cell = cells.find((c) => c.textContent?.includes(l));
        if (cell) {
          const nextCell = cell.nextElementSibling;
          if (nextCell?.textContent) return nextCell.textContent.trim();
        }
      }
      return undefined;
    }

    function getTableValueMulti(...labels: string[]): string | undefined {
      for (const label of labels) {
        const val = getTableValue(label);
        if (val) return val;
      }
      return undefined;
    }

    const result: Record<string, unknown> = {};

    // PRIMARY: Extract from window.classified
    let classified: Record<string, unknown> | null = null;
    try {
      if ((window as unknown as Record<string, unknown>)['classified']) {
        classified = (window as unknown as Record<string, unknown>)['classified'] as Record<string, unknown>;
      }
    } catch {
      // Not available
    }

    if (classified) {
      const price = classified['price'] as Record<string, unknown> | undefined;
      const transaction = classified['transaction'] as Record<string, unknown> | undefined;
      const property = classified['property'] as Record<string, unknown> | undefined;
      const location = (property?.['location'] || {}) as Record<string, unknown>;
      const building = (property?.['building'] || {}) as Record<string, unknown>;
      const sale = (transaction?.['sale'] || {}) as Record<string, unknown>;
      const certificates = (transaction?.['certificates'] || {}) as Record<string, unknown>;
      const livingRoom = (property?.['livingRoom'] || {}) as Record<string, unknown>;
      const land = (property?.['land'] || {}) as Record<string, unknown>;

      result.price = price?.['mainValue'] || sale?.['price'] || undefined;

      // Title from H1
      const h1El = document.querySelector('h1');
      if (h1El) {
        result.title = h1El.textContent!.trim().replace(/\s+/g, ' ');
      }
      if (!result.title) {
        const subtype = (property?.['subtype'] || property?.['type'] || '') as string;
        const locality = (location?.['locality'] || '') as string;
        result.title = [subtype, locality].filter(Boolean).join(' à ') || undefined;
      }

      result.address = [location['street'], location['number'], location['postalCode'], location['locality']]
        .filter(Boolean).join(', ') || undefined;
      result.location = [location['postalCode'], location['locality']].filter(Boolean).join(' ') || result.address;

      result.surface = property?.['netHabitableSurface'] || livingRoom?.['surface'] || undefined;
      result.landSurface = land?.['surface'] || undefined;
      result.livingRoomSurface = livingRoom?.['surface'] || undefined;

      result.bedrooms = property?.['bedroomCount'] || undefined;
      result.bathrooms = property?.['bathroomCount'] || undefined;
      result.toilets = property?.['toiletCount'] || undefined;
      result.floors = property?.['floorCount'] || undefined;

      result.energyClass = certificates?.['epcScore'] || undefined;
      result.yearBuilt = building?.['constructionYear'] || undefined;
      result.buildingCondition = building?.['condition'] || undefined;

      result.propertyType = (property?.['type'] as string)?.toUpperCase() || undefined;
      result.propertySubtype = property?.['subtype'] || undefined;

      result.hasGarden = property?.['hasGarden'] || false;
      result.gardenSurface = property?.['gardenSurface'] || undefined;
      result.hasTerrace = property?.['hasTerrace'] || false;
      result.terraceSurface = property?.['terraceSurface'] || undefined;
      const parkingIndoor = (property?.['parkingCountIndoor'] || 0) as number;
      const parkingOutdoor = (property?.['parkingCountOutdoor'] || 0) as number;
      result.hasParking = parkingIndoor + parkingOutdoor > 0;
      result.parkingSpaces = parkingIndoor + parkingOutdoor || undefined;
      result.hasSwimmingPool = property?.['hasSwimmingPool'] || false;
      result.hasLift = property?.['hasLift'] || false;
      result.facadeCount = building?.['facadeCount'] || undefined;

      result.cadastralIncome = sale?.['cadastralIncome'] || undefined;

      // Description
      const rawDesc = property?.['description'];
      if (rawDesc) {
        if (typeof rawDesc === 'string') {
          result.description = rawDesc;
        } else if (typeof rawDesc === 'object') {
          const descObj = rawDesc as Record<string, unknown>;
          result.description = descObj['fr'] || descObj['en'] || descObj['nl'] ||
            Object.values(descObj).find(v => typeof v === 'string' && (v as string).length > 0) || undefined;
        }
      }

      // Coordinates
      const lat = location['latitude'] as number | undefined;
      const lng = location['longitude'] as number | undefined;
      if (lat && lng) {
        result.coordinates = { lat, lng };
      }
    }

    // FALLBACK: DOM extraction
    if (!result.title) {
      const titleEl = document.querySelector('h1');
      result.title = titleEl ? titleEl.textContent!.trim().replace(/\s+/g, ' ') : undefined;
    }

    if (!result.price) {
      const priceElements = Array.from(document.querySelectorAll('p, span, div, [class*="price"]'));
      const priceEl = priceElements.find((el) => {
        const text = el.textContent || '';
        return text.includes('€') && (text.includes('000') || /\d{3,}/.test(text));
      });
      if (priceEl?.textContent) {
        const text = priceEl.textContent;
        const offerMatch = text.match(/(?:Faire offre à partir de|à partir de|from)\s*([\d\s.]+)\s*€/i);
        if (offerMatch) {
          result.price = parseInt(offerMatch[1]!.replace(/[\s.]/g, ''), 10);
        } else {
          const spaceMatch = text.match(/([\d\s.]+)\s*€/);
          if (spaceMatch) {
            result.price = parseInt(spaceMatch[1]!.replace(/[\s.]/g, ''), 10);
          }
        }
      }
    }

    if (!result.address) {
      const addressEl = document.querySelector('[class*="classified__header--address"], [class*="address"]');
      if (addressEl) {
        result.address = addressEl.textContent!.trim().replace(/\s+/g, ' ');
        result.location = result.address;
      }
    }

    if (!result.description) {
      const descEl = document.querySelector('[class*="classified__description"], [class*="description"]');
      result.description = descEl ? (descEl as HTMLElement).innerText.trim() : undefined;
    }

    // Photos
    const photoUrls = new Set<string>();

    // Method 1: window.classified.media.pictures
    try {
      const classifiedObj = (window as unknown as Record<string, unknown>)['classified'] as Record<string, unknown> | undefined;
      const media = classifiedObj?.['media'] as Record<string, unknown> | undefined;
      const pictures = media?.['pictures'] as Array<Record<string, string>> | undefined;
      if (Array.isArray(pictures)) {
        pictures.forEach((pic) => {
          if (pic.largeUrl) photoUrls.add(pic.largeUrl);
          else if (pic.mediumUrl) photoUrls.add(pic.mediumUrl);
          else if (pic.smallUrl) photoUrls.add(pic.smallUrl);
        });
      }
    } catch { /* */ }

    // Method 2: JSON-LD
    try {
      document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
        try {
          const data = JSON.parse(script.textContent || '');
          if (data.image) {
            if (Array.isArray(data.image)) {
              data.image.forEach((img: string | { url: string }) => {
                if (typeof img === 'string') photoUrls.add(img);
                if (typeof img === 'object' && img.url) photoUrls.add(img.url);
              });
            } else if (typeof data.image === 'string') {
              photoUrls.add(data.image);
            }
          }
        } catch { /* */ }
      });
    } catch { /* */ }

    // Method 3: Carousel images
    document.querySelectorAll('[class*="carousel"], [class*="gallery"], [class*="slider"]').forEach((container) => {
      container.querySelectorAll('img').forEach((img) => {
        const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.currentSrc;
        if (src?.includes('media-resize.immowebstatic.be/classifieds')) {
          photoUrls.add(src);
        }
      });
    });

    // Method 4: All immoweb images
    document.querySelectorAll('img').forEach((img) => {
      const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.currentSrc;
      if (src?.includes('media-resize.immowebstatic.be/classifieds')) {
        const isUnwanted = ['logo', 'icon', 'favicon', 'avatar', 'banner', 'mortgage', '/peb/', '/epc/', 'artworks']
          .some(kw => src.includes(kw));
        if (!isUnwanted) photoUrls.add(src);
      }
    });

    // Method 5: srcset
    document.querySelectorAll('img[srcset]').forEach((img) => {
      const srcset = img.getAttribute('srcset');
      if (srcset) {
        srcset.split(',').map(s => s.trim().split(' ')[0]).forEach((u) => {
          if (u?.includes('media-resize.immowebstatic.be/classifieds')) photoUrls.add(u);
        });
      }
    });

    result.photos = Array.from(photoUrls).filter((u) => /classifieds\/[a-f0-9-]+\//.test(u));

    // Table fallbacks
    if (!result.surface) result.surface = extractNumber(getTableValueMulti('Surface habitable', 'Living area', 'Net habitable surface'));
    if (!result.landSurface) result.landSurface = extractNumber(getTableValueMulti('Surface du terrain', 'Land surface', 'Plot surface'));
    if (!result.bedrooms) result.bedrooms = extractNumber(getTableValueMulti('Chambres', 'Bedrooms'));
    if (!result.bathrooms) result.bathrooms = extractNumber(getTableValueMulti('Salles de bains', 'Bathrooms'));
    if (!result.energyClass) result.energyClass = getTableValueMulti('Classe énergétique', 'Energy class', 'PEB', 'EPC');
    if (!result.yearBuilt) result.yearBuilt = extractNumber(getTableValueMulti('Année de construction', 'Construction year'));
    if (!result.facadeCount) result.facadeCount = extractNumber(getTableValueMulti('Nombre de façades', 'Number of frontages'));

    return result;
  });
}
