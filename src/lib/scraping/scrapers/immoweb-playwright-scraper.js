const { chromium } = require('playwright');
const { rateLimiter } = require('../rate-limiter');
const { proxyManager } = require('../proxy-manager');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Persistent profile directory
const CHROME_PROFILE_DIR = path.join(os.tmpdir(), 'immoweb-playwright-profile');

// Ensure profile directory exists
if (!fs.existsSync(CHROME_PROFILE_DIR)) {
  fs.mkdirSync(CHROME_PROFILE_DIR, { recursive: true });
  console.log('✅ Created persistent Playwright profile:', CHROME_PROFILE_DIR);
}

/**
 * Playwright-based scraper for Immoweb.be with maximum anti-detection
 */
class ImmowebPlaywrightScraper {
  getName() {
    return 'Immoweb (Playwright)';
  }

  canHandle(url) {
    return url.includes('immoweb.be');
  }

  async randomDelay(min = 1000, max = 3000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  async simulateHumanBehavior(page) {
    // Random scroll with natural movement
    await page.evaluate(() => {
      const scrollAmount = Math.random() * 800;
      window.scrollTo({
        top: scrollAmount,
        behavior: 'smooth'
      });
    });
    await this.randomDelay(1000, 3000);

    // Random mouse movements
    const x = Math.floor(Math.random() * 1000) + 100;
    const y = Math.floor(Math.random() * 600) + 100;

    try {
      await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 10 });
      await this.randomDelay(500, 1500);
    } catch (e) {
      // Ignore mouse errors
    }
  }

  async scrape(url) {
    let browser;
    let context;

    try {
      // Apply ultra-conservative rate limiting
      await rateLimiter.waitForNextRequest();

      // Get proxy configuration
      const proxy = proxyManager.getNextProxy();
      const proxyConfig = proxyManager.getPuppeteerArgs(proxy);

      console.log('🚀 Launching Playwright with maximum stealth...');
      console.log('📁 Profile directory:', CHROME_PROFILE_DIR);

      if (proxy) {
        console.log('🔄 Using proxy for IP rotation');
      }

      // Launch browser with stealth
      const launchOptions = {
        headless: false, // Visible for manual CAPTCHA solving
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--ignore-certificate-errors',
          '--ignore-certificate-errors-spki-list',
          '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ],
        ignoreHTTPSErrors: true, // Required for Bright Data proxies
      };

      // Add proxy if configured
      if (proxyConfig.proxyAuth) {
        const proxyInfo = proxyManager.parseProxyUrl(proxy);
        launchOptions.proxy = {
          server: `http://${proxyInfo.host}:${proxyInfo.port}`,
          username: proxyInfo.username,
          password: proxyInfo.password,
        };
        console.log('🔐 Proxy authentication configured');
      }

      browser = await chromium.launch(launchOptions);

      // Create persistent context
      context = await browser.newContext({
        viewport: {
          width: 1366 + Math.floor(Math.random() * 200),
          height: 768 + Math.floor(Math.random() * 200),
        },
        locale: 'fr-FR',
        timezoneId: 'Europe/Brussels',
        permissions: [],
        colorScheme: 'light',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        extraHTTPHeaders: {
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      let page = await context.newPage();

      // Additional stealth measures
      await page.addInitScript(() => {
        // Remove webdriver property
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });

        // Mock plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });

        // Mock languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['fr-FR', 'fr', 'en-US', 'en'],
        });

        // Chrome runtime
        window.chrome = {
          runtime: {},
        };

        // Permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
      });

      console.log('Navigating to:', url);

      // Random delay before navigation
      await this.randomDelay(2000, 5000);

      // Navigate with realistic timeout and better error handling
      try {
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
      } catch (navigationError) {
        console.error('Navigation error:', navigationError.message);

        // If proxy fails, try without proxy as fallback
        if (proxy && navigationError.message.includes('ERR_HTTP_RESPONSE_CODE_FAILURE')) {
          console.log('⚠️ Proxy failed, retrying without proxy...');
          await context.close();
          await browser.close();

          // Disable proxy temporarily
          proxyManager.setUseProxy(false);

          // Relaunch without proxy
          browser = await chromium.launch({
            headless: false,
            args: launchOptions.args,
            ignoreHTTPSErrors: true,
          });

          context = await browser.newContext({
            viewport: {
              width: 1366 + Math.floor(Math.random() * 200),
              height: 768 + Math.floor(Math.random() * 200),
            },
            locale: 'fr-FR',
            timezoneId: 'Europe/Brussels',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          });

          const fallbackPage = await context.newPage();

          await fallbackPage.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en-US', 'en'] });
            window.chrome = { runtime: {} };
          });

          await fallbackPage.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
          });

          console.log('✓ Fallback without proxy succeeded');

          // Re-enable proxy for next time
          proxyManager.setUseProxy(true);

          // Continue with fallback page
          await page.close();
          page = fallbackPage;
        } else {
          throw navigationError;
        }
      }

      // Simulate human reading time
      console.log('Simulating human behavior...');
      await this.randomDelay(3000, 7000);
      await this.simulateHumanBehavior(page);

      // Close cookie banner/modals that might block interaction
      console.log('Checking for cookie banners...');
      try {
        const cookieButtons = await page.$$('button[id*="accept"], button[class*="accept"], button[id*="cookie"], [id*="usercentrics"] button');
        if (cookieButtons.length > 0) {
          await cookieButtons[0].click();
          console.log('✓ Closed cookie banner');
          await this.randomDelay(1000, 2000);
        }
      } catch (e) {
        console.log('⚠ No cookie banner found or could not close');
      }

      // Wait for content
      console.log('Waiting for content to load...');
      try {
        await page.waitForSelector('h1, table, [class*="classified"]', {
          timeout: 20000,
        });
        console.log('✓ Content elements detected');
      } catch (e) {
        console.log('⚠ Timeout waiting for content, continuing anyway...');
      }

      // Another human-like pause
      await this.randomDelay(2000, 4000);
      await this.simulateHumanBehavior(page);

      // Wait for images to load (especially lazy-loaded ones)
      console.log('Waiting for images to load...');
      await this.randomDelay(2000, 3000);

      // Scroll through the page to trigger lazy loading
      await page.evaluate(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      });
      await this.randomDelay(1000, 2000);

      await page.evaluate(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      await this.randomDelay(1000, 2000);

      // Interact with carousel to load all images
      console.log('Interacting with carousel to load all images...');
      try {
        // First, try to find the total number of images
        const imageCountText = await page.$eval(
          '[class*="carousel"] [class*="counter"], [class*="image-count"], [class*="photo-count"]',
          (el) => el.textContent
        ).catch(() => null);

        let totalImages = 15; // Default fallback
        if (imageCountText) {
          const match = imageCountText.match(/(\d+)/);
          if (match) {
            totalImages = parseInt(match[1], 10);
            console.log(`Found ${totalImages} images in carousel`);
          }
        }

        // Try multiple carousel navigation strategies
        let clickedCount = 0;
        const maxClicks = Math.max(totalImages + 5, 20); // Add buffer to ensure we get all images

        // Strategy 1: Click next button multiple times
        for (let i = 0; i < maxClicks; i++) {
          const nextButton = await page.$(
            'button[aria-label*="Next"], button[aria-label*="Suivant"], button[class*="next"], button[class*="arrow-right"], [class*="swiper-button-next"]'
          );

          if (nextButton) {
            const isDisabled = await nextButton.evaluate((btn) =>
              btn.hasAttribute('disabled') || btn.classList.contains('disabled')
            );

            if (!isDisabled) {
              await nextButton.click();
              clickedCount++;
              await this.randomDelay(200, 400);
            } else {
              console.log('Reached end of carousel');
              break;
            }
          } else {
            break;
          }
        }

        // Strategy 2: If carousel uses thumbnail navigation, click all thumbnails
        const thumbnails = await page.$$('[class*="thumbnail"], [class*="thumb-nav"] button, [class*="carousel-indicators"] button');
        if (thumbnails.length > 0) {
          console.log(`Found ${thumbnails.length} thumbnails`);
          for (const thumb of thumbnails) {
            try {
              await thumb.click();
              await this.randomDelay(150, 300);
            } catch (e) {
              // Thumbnail might not be clickable
            }
          }
        }

        console.log(`✓ Carousel interaction completed (${clickedCount} clicks, ${thumbnails.length} thumbnails)`);
      } catch (e) {
        console.log('⚠ Could not interact with carousel:', e.message);
      }

      // Check for CAPTCHA or blocking
      const pageContent = await page.content();
      const hasCaptcha = pageContent.toLowerCase().includes('captcha');
      const isBlocked = pageContent.toLowerCase().includes('bloqué') || pageContent.toLowerCase().includes('blocked');

      if (hasCaptcha || isBlocked) {
        console.log('🤖 CAPTCHA or blocking detected!');
        console.log('👉 Please solve it manually in the browser window');
        console.log('⏳ Waiting 120 seconds...');
        await new Promise(resolve => setTimeout(resolve, 120000));
      }

      // Verify IP if using proxy
      if (proxy) {
        try {
          const ipCheckPage = await context.newPage();
          await ipCheckPage.goto('https://api.ipify.org?format=json', {
            timeout: 10000,
          });
          const content = await ipCheckPage.content();
          const match = content.match(/"ip":"([^"]+)"/);
          if (match) {
            console.log(`✓ Current IP: ${match[1]}`);
          }
          await ipCheckPage.close();
        } catch (error) {
          console.log('⚠ Could not verify IP');
        }
      }

      // Extract data
      console.log('Extracting data from page...');

      const data = await page.evaluate(() => {
        function extractNumber(text) {
          if (!text) return undefined;
          const match = text.replace(/\s/g, '').match(/(\d+)/);
          return match ? parseInt(match[1], 10) : undefined;
        }

        function getTableValue(label) {
          const labels = [label, label.toLowerCase(), label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()];
          for (const l of labels) {
            const cells = Array.from(document.querySelectorAll('th, td'));
            const cell = cells.find((c) => c.textContent && c.textContent.trim().includes(l));
            if (cell) {
              const nextCell = cell.nextElementSibling;
              if (nextCell && nextCell.textContent) return nextCell.textContent.trim();
            }
          }
          return undefined;
        }

        const result = {};

        // Title
        const titleEl = document.querySelector('h1');
        result.title = titleEl ? titleEl.textContent.trim() : undefined;

        // Price - handle both standard prices and "Faire offre" patterns
        const priceElements = Array.from(document.querySelectorAll('p, span, div, [class*="price"]'));
        const priceEl = priceElements.find((el) => {
          const text = el.textContent || '';
          return text.includes('€') && (text.includes('000') || text.match(/\d{3,}/));
        });

        if (priceEl && priceEl.textContent) {
          const text = priceEl.textContent;

          // Check for "Faire offre à partir de X €" pattern first
          const offerMatch = text.match(/(?:Faire offre à partir de|à partir de|from)\s*([\d\s.]+)\s*€/i);
          if (offerMatch) {
            const cleaned = offerMatch[1].replace(/[\s.]/g, '');
            result.price = parseInt(cleaned, 10);
          } else {
            // Standard price extraction - look for price with proper spacing
            // Try to find sequences like "319 000" or "319000"
            const spaceMatch = text.match(/([\d\s.]+)\s*€/);
            if (spaceMatch) {
              const cleaned = spaceMatch[1].replace(/[\s.]/g, '');
              result.price = parseInt(cleaned, 10);
            } else {
              // Fallback to original method
              const cleaned = text.replace(/[€\s.]/g, '');
              const match = cleaned.match(/(\d{5,})/);
              result.price = match ? parseInt(match[1], 10) : undefined;
            }
          }
        }

        // Address & Location
        const addressEl = document.querySelector('[class*="classified__header--address"], [class*="address"]');
        result.address = addressEl ? addressEl.textContent.trim() : undefined;
        result.location = result.address;

        // Description
        const descEl = document.querySelector('[class*="classified__description"], [class*="description"]');
        result.description = descEl ? descEl.textContent.trim() : undefined;

        // Photos - comprehensive extraction
        const photoUrls = new Set();

        // Method 1: Extract from window object (Immoweb often stores all image URLs here)
        try {
          if (window.classified && window.classified.media && Array.isArray(window.classified.media.pictures)) {
            window.classified.media.pictures.forEach((pic) => {
              // Only use the largest available version to avoid duplicates
              if (pic.largeUrl) {
                photoUrls.add(pic.largeUrl);
              } else if (pic.mediumUrl) {
                photoUrls.add(pic.mediumUrl);
              } else if (pic.smallUrl) {
                photoUrls.add(pic.smallUrl);
              }
            });
          }
        } catch (e) {
          // Window object might not exist
        }

        // Method 2: Look for JSON-LD structured data
        try {
          const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
          jsonLdScripts.forEach((script) => {
            try {
              const data = JSON.parse(script.textContent);
              if (data.image) {
                if (Array.isArray(data.image)) {
                  data.image.forEach((img) => {
                    if (typeof img === 'string') photoUrls.add(img);
                    if (img.url) photoUrls.add(img.url);
                  });
                } else if (typeof data.image === 'string') {
                  photoUrls.add(data.image);
                }
              }
            } catch (e) {
              // Invalid JSON
            }
          });
        } catch (e) {
          // No JSON-LD
        }

        // Method 3: Extract from carousel/gallery containers
        const carouselContainers = document.querySelectorAll(
          '[class*="carousel"], [class*="gallery"], [class*="slider"], [data-testid*="carousel"]'
        );

        carouselContainers.forEach((container) => {
          container.querySelectorAll('img').forEach((img) => {
            const src =
              img.src ||
              img.getAttribute('data-src') ||
              img.getAttribute('data-lazy-src') ||
              img.currentSrc;

            if (src && src.includes('media-resize.immowebstatic.be/classifieds')) {
              photoUrls.add(src);
            }
          });
        });

        // Method 4: Look for all images with immoweb classified URLs
        document.querySelectorAll('img').forEach((img) => {
          const src =
            img.src ||
            img.getAttribute('data-src') ||
            img.getAttribute('data-lazy-src') ||
            img.currentSrc;

          if (src && src.includes('media-resize.immowebstatic.be/classifieds')) {
            const isUnwanted =
              src.includes('logo') ||
              src.includes('icon') ||
              src.includes('favicon') ||
              src.includes('avatar') ||
              src.includes('banner') ||
              src.includes('mortgage') ||
              src.includes('/peb/') ||
              src.includes('/epc/') ||
              src.includes('artworks');

            if (!isUnwanted) {
              photoUrls.add(src);
            }
          }
        });

        // Method 5: Check srcset attributes for high-res images
        document.querySelectorAll('img[srcset]').forEach((img) => {
          const srcset = img.getAttribute('srcset');
          if (srcset) {
            const urls = srcset.split(',').map((s) => s.trim().split(' ')[0]);
            urls.forEach((url) => {
              if (url.includes('media-resize.immowebstatic.be/classifieds')) {
                photoUrls.add(url);
              }
            });
          }
        });

        // Filter out any duplicates with different sizes and keep only unique images
        const uniquePhotos = Array.from(photoUrls).filter((url) => {
          // Extract the UUID from the URL to identify unique images
          const match = url.match(/classifieds\/([a-f0-9-]+)\//);
          return match !== null;
        });

        result.photos = uniquePhotos;

        // Property details
        result.surface = extractNumber(getTableValue('Surface habitable'));
        result.landSurface = extractNumber(getTableValue('Surface du terrain'));
        result.bedrooms = extractNumber(getTableValue('Chambres'));
        result.bathrooms = extractNumber(getTableValue('Salles de bains'));

        // Energy class - try multiple approaches
        result.energyClass =
          getTableValue('Classe énergétique') ||
          getTableValue('PEB') ||
          // Try to find in structured data sections
          (() => {
            const energySection = document.querySelector('[class*="energy"], [class*="peb"]');
            if (energySection) {
              const text = energySection.textContent;
              const match = text.match(/Classe énergétique\s*([A-G][\+\-]?)/i);
              if (match) return match[1];
            }
            return undefined;
          })();

        // Construction year - from "Année de construction" field
        result.yearBuilt = extractNumber(getTableValue('Année de construction'));

        // Land/Terrain - from "Terrain" or "Surface du terrain" field
        if (!result.landSurface) {
          result.landSurface = extractNumber(getTableValue('Terrain'));
        }

        // Number of facades - from "Nombre de façades" field
        result.facadeCount = extractNumber(getTableValue('Nombre de façades'));

        // Facade width - from "Largeur de la façade à rue" field
        result.facadeWidth = extractNumber(getTableValue('Largeur de la façade à rue'));

        return result;
      });

      console.log('Data extracted:', {
        title: data.title,
        price: data.price,
        surface: data.surface,
        bedrooms: data.bedrooms,
        photos: data.photos?.length,
      });

      if (data.photos && data.photos.length > 0) {
        console.log('📸 Photo URLs:');
        data.photos.forEach((url, index) => {
          console.log(`  ${index + 1}. ${url.substring(0, 80)}...`);
        });
      } else {
        console.log('⚠️ WARNING: No photos extracted!');
      }

      await context.close();
      await browser.close();

      return {
        success: true,
        data,
      };

    } catch (error) {
      console.error('Playwright scraping error:', error);

      if (context) await context.close();
      if (browser) await browser.close();

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

module.exports = { ImmowebPlaywrightScraper };
