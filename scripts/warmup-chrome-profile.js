const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const os = require('os');

puppeteer.use(StealthPlugin());

const CHROME_PROFILE_DIR = path.join(os.tmpdir(), 'immoweb-chrome-profile');

async function warmupProfile() {
  console.log('🌡️  Chrome Profile Warm-up Tool');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('This script opens a browser with your persistent profile.');
  console.log('You can manually browse Immoweb.be to "warm up" the profile:');
  console.log('');
  console.log('✅ Browse properties normally');
  console.log('✅ Accept cookies');
  console.log('✅ Interact with the site (scroll, click, search)');
  console.log('✅ The cookies and session will persist for future scraping');
  console.log('');
  console.log('📁 Profile directory:', CHROME_PROFILE_DIR);
  console.log('');
  console.log('⏳ Launching browser... (Close the browser when you\'re done)');
  console.log('');

  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: CHROME_PROFILE_DIR,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--start-maximized',
    ],
    defaultViewport: null,
  });

  const page = await browser.newPage();

  // Navigate to Immoweb homepage
  await page.goto('https://www.immoweb.be', {
    waitUntil: 'networkidle2',
  });

  console.log('✅ Browser opened!');
  console.log('');
  console.log('👉 Instructions:');
  console.log('   1. Accept cookies if prompted');
  console.log('   2. Browse a few properties');
  console.log('   3. Interact naturally with the site');
  console.log('   4. Close the browser when done');
  console.log('');
  console.log('⏳ Waiting for you to close the browser...');

  // Wait for browser to be closed manually
  await new Promise((resolve) => {
    browser.on('disconnected', () => {
      console.log('');
      console.log('✅ Browser closed! Profile is now warmed up.');
      console.log('');
      console.log('🎯 Next steps:');
      console.log('   Run: node scripts/test-persistent-profile.js');
      console.log('   The scraper will now use your warmed-up profile!');
      resolve();
    });
  });
}

warmupProfile().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
