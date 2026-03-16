import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, BrowserContext, Page } from 'playwright';

// Apply stealth plugin — patches all known detection vectors:
// navigator.webdriver, chrome.runtime, plugins, languages,
// WebGL, canvas fingerprint, permissions, etc.
chromium.use(StealthPlugin());

/**
 * Launch browser with stealth plugin and residential proxy.
 */
export async function launchBrowser(): Promise<Browser> {
  const proxyServer = process.env['PROXY_SERVER'] || 'brd.superproxy.io:33335';
  const proxyUsername = process.env['PROXY_USERNAME'] || '';
  const proxyPassword = process.env['PROXY_PASSWORD'] || '';

  const launchOptions: Record<string, unknown> = {
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  };

  if (proxyUsername && proxyPassword) {
    console.log(`[Browser] Using residential proxy: ${proxyServer}`);
    launchOptions.proxy = {
      server: `http://${proxyServer}`,
      username: proxyUsername,
      password: proxyPassword,
    };
  } else {
    console.log('[Browser] No proxy configured — running without proxy');
  }

  return chromium.launch(launchOptions);
}

export async function createStealthContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: {
      width: 1366 + Math.floor(Math.random() * 200),
      height: 768 + Math.floor(Math.random() * 200),
    },
    locale: 'fr-FR',
    timezoneId: 'Europe/Brussels',
    colorScheme: 'light',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      DNT: '1',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    },
  });
}

/**
 * No longer needed — stealth plugin handles all anti-detection.
 * Kept as no-op for backward compatibility with scrapers.
 */
export async function applyStealthScripts(_page: Page): Promise<void> {
  // Stealth plugin already applied at chromium level
}

export function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export async function simulateHumanBehavior(page: Page): Promise<void> {
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
    // Ignore mouse errors in headless
  }
}

export async function dismissCookieBanner(page: Page): Promise<void> {
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

/**
 * Checks if the page is blocked by DataDome CAPTCHA.
 * Logs details for debugging.
 */
export async function checkForCaptcha(page: Page): Promise<boolean> {
  const hasCaptcha = await page.evaluate(() =>
    document.body.innerHTML.includes('captcha-delivery.com')
    || document.body.innerHTML.includes('datadome')
    || document.querySelector('iframe[src*="captcha-delivery.com"]') !== null
  );

  if (hasCaptcha) {
    console.log('[CAPTCHA] DataDome protection detected on page');
    // Log what type of block
    const blockType = await page.evaluate(() => {
      const html = document.body.innerHTML;
      if (html.includes('captcha__robot')) return 'HARD_BLOCK';
      if (html.includes('captcha__human')) return 'SLIDER_CHALLENGE';
      if (document.querySelector('iframe[src*="captcha-delivery"]')) return 'IFRAME_CHALLENGE';
      return 'UNKNOWN';
    });
    console.log(`[CAPTCHA] Block type: ${blockType}`);
  }

  return hasCaptcha;
}
