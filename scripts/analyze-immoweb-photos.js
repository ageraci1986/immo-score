const puppeteer = require('puppeteer');

async function analyzePhotos(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('Loading page...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for images to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    const photoAnalysis = await page.evaluate(() => {
      const results = {
        allImages: [],
        galleryImages: [],
        priceInfo: {},
      };

      // Find all images
      document.querySelectorAll('img').forEach(img => {
        const info = {
          src: img.src,
          alt: img.alt,
          className: img.className,
          parent: img.parentElement ? img.parentElement.tagName : '',
          parentClass: img.parentElement ? img.parentElement.className : '',
        };
        results.allImages.push(info);
      });

      // Try to find gallery/carousel
      const gallery = document.querySelector('[class*="gallery"], [class*="carousel"], [class*="slider"], [class*="lightbox"]');
      if (gallery) {
        gallery.querySelectorAll('img').forEach(img => {
          results.galleryImages.push({
            src: img.src,
            alt: img.alt,
          });
        });
      }

      // Better price extraction
      const priceElement = document.querySelector('[class*="classified__price"], [class*="price"]');
      if (priceElement) {
        results.priceInfo = {
          text: priceElement.textContent.trim(),
          className: priceElement.className,
          innerHTML: priceElement.innerHTML,
        };
      }

      return results;
    });

    console.log('\n=== PHOTO ANALYSIS ===');
    console.log(`Total images found: ${photoAnalysis.allImages.length}`);
    console.log('\nFirst 10 images:');
    photoAnalysis.allImages.slice(0, 10).forEach((img, i) => {
      console.log(`\n${i + 1}. ${img.src.substring(0, 80)}...`);
      console.log(`   Alt: ${img.alt}`);
      console.log(`   Class: ${img.className}`);
      console.log(`   Parent: <${img.parent} class="${img.parentClass}">`);
    });

    console.log('\n=== GALLERY IMAGES ===');
    console.log(`Gallery images: ${photoAnalysis.galleryImages.length}`);
    photoAnalysis.galleryImages.forEach((img, i) => {
      console.log(`${i + 1}. ${img.src}`);
    });

    console.log('\n=== PRICE INFO ===');
    console.log('Price text:', photoAnalysis.priceInfo.text);
    console.log('Price class:', photoAnalysis.priceInfo.className);

  } finally {
    await browser.close();
  }
}

const url = process.argv[2] || 'https://www.immoweb.be/fr/annonce/maison/a-vendre/liege/4020/21234071';
analyzePhotos(url);
