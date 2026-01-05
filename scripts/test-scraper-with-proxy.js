const { ImmowebPuppeteerScraper } = require('../src/lib/scraping/scrapers/immoweb-puppeteer-scraper.js');
const { proxyManager } = require('../src/lib/scraping/proxy-manager.js');

async function testScraperWithProxy(url) {
  console.log('Testing scraper with proxy rotation');
  console.log('='.repeat(60));

  // Enable proxy usage
  proxyManager.setUseProxy(true);

  console.log('\n📊 Proxy Stats:');
  console.log(proxyManager.getStats());

  console.log('\n🧪 Testing scraper with URL:', url);
  console.log('='.repeat(60));

  const scraper = new ImmowebPuppeteerScraper();
  const result = await scraper.scrape(url);

  if (result.success && result.data) {
    console.log('\n✅ Scraping successful with proxy!\n');
    console.log('📋 BASIC INFO:');
    console.log('  Title:', result.data.title || 'N/A');
    console.log('  Price:', result.data.price ? `${result.data.price} €` : 'N/A');
    console.log('  Location:', result.data.location || 'N/A');

    console.log('\n📐 SURFACES:');
    console.log('  Living surface:', result.data.surface ? `${result.data.surface} m²` : 'N/A');
    console.log('  Land surface:', result.data.landSurface ? `${result.data.landSurface} m²` : 'N/A');

    console.log('\n🏠 ROOMS:');
    console.log('  Bedrooms:', result.data.bedrooms || 'N/A');
    console.log('  Bathrooms:', result.data.bathrooms || 'N/A');

    console.log('\n📸 PHOTOS:');
    console.log(`  Total photos: ${result.data.photos?.length || 0}`);

    console.log('\n✅ Test completed successfully!');
  } else {
    console.log('\n❌ Scraping failed!');
    console.log('Error:', result.error);
  }

  console.log('\n📊 Final Proxy Stats:');
  console.log(proxyManager.getStats());
}

// Test with or without proxy
const url = process.argv[2] || 'https://www.immoweb.be/fr/annonce/maison/a-vendre/liege/4020/21234071';
const useProxy = process.argv[3] !== 'no-proxy';

if (useProxy) {
  console.log('🔄 Proxy rotation: ENABLED');
  testScraperWithProxy(url);
} else {
  console.log('🚫 Proxy rotation: DISABLED');
  proxyManager.setUseProxy(false);
  const { ImmowebPuppeteerScraper } = require('../src/lib/scraping/scrapers/immoweb-puppeteer-scraper.js');
  const scraper = new ImmowebPuppeteerScraper();
  scraper.scrape(url).then(result => {
    if (result.success) {
      console.log('✅ Success without proxy');
    } else {
      console.log('❌ Failed:', result.error);
    }
  });
}
