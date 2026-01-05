const { ImmowebPuppeteerScraper } = require('../src/lib/scraping/scrapers/immoweb-puppeteer-scraper.js');

async function testScraper(url) {
  console.log('Testing JavaScript scraper with URL:', url);
  console.log('='.repeat(60));

  const scraper = new ImmowebPuppeteerScraper();
  const result = await scraper.scrape(url);

  if (result.success && result.data) {
    console.log('\n✅ Scraping successful!\n');
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
    console.log('  Toilets:', result.data.toilets || 'N/A');

    console.log('\n📸 PHOTOS:');
    console.log(`  Total photos: ${result.data.photos?.length || 0}`);

    console.log('\n✅ Test completed successfully!');
  } else {
    console.log('\n❌ Scraping failed!');
    console.log('Error:', result.error);
  }
}

const url = process.argv[2] || 'https://www.immoweb.be/fr/annonce/maison/a-vendre/liege/4020/21234071';
testScraper(url);
