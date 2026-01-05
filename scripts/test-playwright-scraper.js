// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { proxyManager } = require('../src/lib/scraping/proxy-manager.js');
const { ImmowebPlaywrightScraper } = require('../src/lib/scraping/scrapers/immoweb-playwright-scraper.js');

async function testPlaywright() {
  console.log('');
  console.log('========================================');
  console.log('TEST PLAYWRIGHT SCRAPER - MAXIMUM STEALTH');
  console.log('========================================');
  console.log('');

  // Enable Bright Data proxy
  proxyManager.setUseProxy(true);

  const stats = proxyManager.getStats();
  console.log('Proxy Configuration:');
  console.log(`  - Premium proxies: ${stats.totalPremiumProxies}`);
  console.log(`  - Proxy enabled: ${stats.proxyEnabled}`);
  console.log(`  - Types: ${stats.premiumProxyTypes.join(', ')}`);
  console.log('');

  // Test URL (use a recent property URL)
  const url = 'https://www.immoweb.be';

  console.log('Target URL:', url);
  console.log('');
  console.log('Starting scraping with Playwright...');
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
    console.log('SUCCESS! Scraping completed');
    console.log('');
    console.log('Data extracted:');
    console.log('  Title:', result.data.title || 'N/A');
    console.log('  Price:', result.data.price ? `€${result.data.price.toLocaleString()}` : 'N/A');
    console.log('  Surface:', result.data.surface ? `${result.data.surface}m²` : 'N/A');
    console.log('  Bedrooms:', result.data.bedrooms || 'N/A');
    console.log('  Photos:', result.data.photos?.length || 0);
    console.log('');
    console.log('The Playwright scraper is working!');
  } else {
    console.log('FAILED:', result.error);
    console.log('');
    console.log('Possible reasons:');
    console.log('  - CAPTCHA not solved in time');
    console.log('  - IP still blocked (try waiting 24h)');
    console.log('  - Page structure changed');
  }

  console.log('');
  console.log('========================================');
}

testPlaywright().catch(error => {
  console.error('');
  console.error('FATAL ERROR:', error.message);
  console.error('');
  process.exit(1);
});
