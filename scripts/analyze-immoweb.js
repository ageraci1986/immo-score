const puppeteer = require('puppeteer');

async function analyzeImmowebPage(url) {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('Navigating to:', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    console.log('Page loaded, analyzing structure...\n');

    // Extract all useful data
    const analysis = await page.evaluate(() => {
      const result = {
        title: '',
        price: '',
        location: '',
        description: '',
        photos: [],
        details: {},
        jsonLD: null,
      };

      // Title
      const titleEl = document.querySelector('h1');
      result.title = titleEl ? titleEl.textContent.trim() : '';

      // Price
      const priceEl = document.querySelector('[class*="price"], [aria-label*="Price"], p.classified__price');
      result.price = priceEl ? priceEl.textContent.trim() : '';

      // Location
      const locationEl = document.querySelector('[class*="location"], .classified__header--address');
      result.location = locationEl ? locationEl.textContent.trim() : '';

      // Description
      const descEl = document.querySelector('[class*="description"], .classified__description');
      result.description = descEl ? descEl.textContent.trim().substring(0, 200) + '...' : '';

      // Photos
      const imgElements = document.querySelectorAll('img[src*="cloudfront"], img[loading="lazy"], picture img');
      result.photos = Array.from(imgElements).slice(0, 5).map(img => img.src);

      // Property details table
      const tableRows = document.querySelectorAll('table tr, [class*="classified__information"] tr');
      tableRows.forEach(row => {
        const cells = row.querySelectorAll('th, td');
        if (cells.length >= 2) {
          const key = cells[0].textContent.trim();
          const value = cells[1].textContent.trim();
          result.details[key] = value;
        }
      });

      // JSON-LD structured data
      const jsonLDScript = document.querySelector('script[type="application/ld+json"]');
      if (jsonLDScript) {
        try {
          result.jsonLD = JSON.parse(jsonLDScript.textContent);
        } catch (e) {
          result.jsonLD = null;
        }
      }

      return result;
    });

    console.log('=== ANALYSIS RESULTS ===\n');
    console.log('Title:', analysis.title);
    console.log('Price:', analysis.price);
    console.log('Location:', analysis.location);
    console.log('\nDescription preview:', analysis.description);
    console.log('\nPhotos found:', analysis.photos.length);
    if (analysis.photos.length > 0) {
      console.log('First photo:', analysis.photos[0]);
    }

    console.log('\n=== PROPERTY DETAILS TABLE ===');
    Object.entries(analysis.details).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });

    if (analysis.jsonLD) {
      console.log('\n=== JSON-LD DATA FOUND ===');
      console.log(JSON.stringify(analysis.jsonLD, null, 2));
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: '/tmp/immoweb-page.png', fullPage: false });
    console.log('\nScreenshot saved to /tmp/immoweb-page.png');

  } catch (error) {
    console.error('Error analyzing page:', error);
  } finally {
    await browser.close();
  }
}

// Run the analysis
const url = process.argv[2] || 'https://www.immoweb.be/fr/annonce/maison/a-vendre/liege/4020/21234071';
analyzeImmowebPage(url);
