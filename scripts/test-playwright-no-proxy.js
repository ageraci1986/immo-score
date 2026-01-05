// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { proxyManager } = require('../src/lib/scraping/proxy-manager.js');
const { ImmowebPlaywrightScraper } = require('../src/lib/scraping/scrapers/immoweb-playwright-scraper.js');

async function testWithoutProxy() {
  console.log('');
  console.log('========================================');
  console.log('TEST PLAYWRIGHT - SANS PROXY');
  console.log('========================================');
  console.log('');

  // DISABLE proxy to test with your own IP
  proxyManager.setUseProxy(false);

  console.log('Configuration:');
  console.log('  - Proxy: DISABLED (using your own IP)');
  console.log('  - Browser: Playwright Chromium');
  console.log('  - Stealth: Maximum');
  console.log('  - Rate limiting: Ultra-conservative');
  console.log('');

  // Test URL
  const url = 'https://www.immoweb.be';

  console.log('Target URL:', url);
  console.log('');
  console.log('Starting scraping without proxy...');
  console.log('(Browser will open - you can solve CAPTCHA if needed)');
  console.log('');

  const scraper = new ImmowebPlaywrightScraper();
  const result = await scraper.scrape(url);

  console.log('');
  console.log('========================================');
  console.log('RESULTS');
  console.log('========================================');
  console.log('');

  if (result.success) {
    console.log('SUCCESS! Scraping completed WITHOUT PROXY');
    console.log('');
    console.log('Data extracted:');
    console.log('  Title:', result.data.title || 'N/A');
    console.log('  Price:', result.data.price ? `€${result.data.price.toLocaleString()}` : 'N/A');
    console.log('  Surface:', result.data.surface ? `${result.data.surface}m²` : 'N/A');
    console.log('  Bedrooms:', result.data.bedrooms || 'N/A');
    console.log('  Photos:', result.data.photos?.length || 0);
    console.log('');
    console.log('CONCLUSION:');
    console.log('  Playwright fonctionne sans proxy!');
    console.log('  Votre IP actuelle n\'est pas bloquee (ou plus bloquee).');
  } else {
    console.log('FAILED:', result.error);
    console.log('');
    console.log('CONCLUSION:');
    console.log('  Votre IP est probablement encore bloquee.');
    console.log('  Utilisez les proxies Bright Data.');
  }

  console.log('');
  console.log('========================================');
}

testWithoutProxy().catch(error => {
  console.error('');
  console.error('FATAL ERROR:', error.message);
  console.error('');
  process.exit(1);
});
