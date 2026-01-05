const { proxyManager } = require('../src/lib/scraping/proxy-manager.js');
const { ImmowebPuppeteerScraper } = require('../src/lib/scraping/scrapers/immoweb-puppeteer-scraper.js');

async function testWithProxy() {
  console.log('🔄 Activating proxy rotation...');
  proxyManager.setUseProxy(true);

  const url = 'https://www.immoweb.be/fr/annonce/maison/a-vendre/liege/4020/21234071';

  console.log('\n📊 Proxy Stats:');
  console.log(proxyManager.getStats());

  console.log('\n🧪 Testing with proxy...');
  const scraper = new ImmowebPuppeteerScraper();
  const result = await scraper.scrape(url);

  if (result.success && result.data) {
    console.log('\n✅ Success with proxy!');
    console.log('Title:', result.data.title);
    console.log('Price:', result.data.price);
    console.log('Surface:', result.data.surface);
  } else {
    console.log('\n❌ Failed:', result.error);
  }
}

testWithProxy().catch(console.error);
